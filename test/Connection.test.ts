import { proxy, registerNode } from "proxyrequire";

import chai, { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";

import { Connection } from "../src/Connection";
import { Parser } from "../src/Parser";

chai.use(sinonChai);
registerNode();

describe("Connection", function () {
    let optionsStub: any;
    let socketStub: any;
    let chunkifyStub: any;
    let stuffStub: any;
    let unstuffStub: any;
    let emitStub: any;
    let parseStub: any;

    let connection: Connection;
    let connectionType: typeof Connection;

    before(() => {
        connectionType = proxy(() => require("../src/Connection").Connection, {
            net: {
                connect: (options: any, callback: Function) => {
                    optionsStub = options;

                    setTimeout(() => callback(), 0);

                    return socketStub;
                },
            },
            "@mkellsy/event-emitter": {
                EventEmitter: class {
                    emit(event: string, ...payload: any[]) {
                        emitStub(event, ...payload);
                    }
                },
            },
            "./Parser": {
                Parser: class {
                    static stuff() {
                        return stuffStub;
                    }

                    static unstuff() {
                        return unstuffStub;
                    }

                    static chunkify() {
                        return chunkifyStub;
                    }

                    static parse() {
                        return parseStub;
                    }
                },
            },
        });
    });

    beforeEach(() => {
        stuffStub = Buffer.from([0, 1, 2, 3, 4]);
        unstuffStub = Buffer.from([0, 1, 2, 3, 4]);

        socketStub = {
            on: sinon.stub(),
            destroy: sinon.stub(),
            write: sinon.stub(),
        };

        chunkifyStub = {
            chunks: [
                Buffer.from([0xc0, 0x01, 0x02, 0x03, 0x04, 0x05, 0xc0]),
                Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03, 0x04, 0x05, 0xc0]),
            ],
            count: 2,
        };

        emitStub = sinon.stub();
        connection = new connectionType("host", "id", "name", "model");
    });

    it("should store the connection id", () => {
        expect(connection.id).to.equal("id");
    });

    describe("connect()", () => {
        it("should define listeners and emit a Connect event", async () => {
            await connection.connect();

            expect(optionsStub.host).to.equal("host");
            expect(optionsStub.port).to.equal(31415);

            expect(socketStub.on).to.be.calledWith("data", sinon.match.any);
            expect(socketStub.on).to.be.calledWith("error", sinon.match.any);
            expect(socketStub.on).to.be.calledWith("end", sinon.match.any);

            expect(emitStub).to.be.calledWith("Connect", sinon.match.any);
        });
    });

    describe("disconnect()", () => {
        it("should not call destroy if connection is not established", () => {
            connection.disconnect();

            expect(socketStub.destroy).to.not.be.called;
        });

        it("should call destroy if connection is established", async () => {
            await connection.connect();

            connection.disconnect();

            expect(socketStub.destroy).to.be.called;
        });
    });

    describe("write()", () => {
        it("should write to the socket if connection is not established", () => {
            connection.write([0, 1, 2, 3, 4]);

            expect(socketStub.write).to.not.be.called;
        });

        it("should write a stuffed and marked buffer to the socket", async () => {
            await connection.connect();

            connection.write([0, 1, 2, 3, 4]);

            expect(socketStub.write).to.be.calledWith(Buffer.from([0xc0, 0x00, 0xc0]));
        });
    });

    describe("onSocketDisconnect()", () => {
        const callbacks: Record<string, Function> = {};

        beforeEach(async () => {
            socketStub.on = (event: string, callback: Function) => {
                callbacks[event] = callback;
            };
        });

        it("should attempt to reconnect id not tearing down", async () => {
            await connection.connect();

            callbacks.end();

            expect(emitStub).to.not.be.calledWith("Disconnect");
        });

        it("should emit a disconnect event when the socket ends", async () => {
            await connection.connect();

            connection.disconnect();
            callbacks.end();

            expect(emitStub).to.be.calledWith("Disconnect");
        });
    });

    describe("onSocketError()", () => {
        const callbacks: Record<string, Function> = {};

        beforeEach(async () => {
            socketStub.on = (event: string, callback: Function) => {
                callbacks[event] = callback;
            };
        });

        it("should emit an error event when the socket has an error", async () => {
            await connection.connect();

            connection.disconnect();
            callbacks.error("test error");

            expect(emitStub).to.be.calledWith("Error", "test error");
        });
    });

    describe("onSocketData()", () => {
        const callbacks: Record<string, Function> = {};

        beforeEach(async () => {
            socketStub.on = (event: string, callback: Function) => {
                callbacks[event] = callback;
            };
        });

        it("should not emit when garbage data is recieved", async () => {
            chunkifyStub = {
                chunks: [
                    Buffer.from([2, 3, 4, 0xc0]),
                ],
                count: 1,
            };

            await connection.connect();

            callbacks.data(Buffer.from([2, 3, 4, 0xc0]));

            expect(emitStub).to.not.be.calledWith("Response", sinon.match.any);
        });

        it("should emit device capibilities on initial connect", async () => {
            parseStub = {
                software: "3.2.5",
                firmware: "3.2.3",
                mac: "20:63:83:12:DE:F0",
                capabilities: {
                    fan: true,
                    downlight: true,
                    uplight: false,
                    temperature: true,
                    humidity: true,
                    occupancy: true,
                    light: false,
                    luminance: false,
                    indicator: true,
                    standby: false,
                    speaker: true,
                    piezo: false,
                    uvc: false,
                    eco: true,
                },
            };

            await connection.connect();

            callbacks.data(Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03]));
            callbacks.data(Buffer.from([0x04, 0x05, 0xc0]));
            callbacks.data(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0xc0]));
            callbacks.data(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0xc0]));

            expect(emitStub).to.be.calledWith("Response", "Capabilities", {
                id: "id",
                name: "name",
                model: "model",
                firmware: "3.2.3",
                mac: "20:63:83:12:DE:F0",
                fan: true,
                downlight: true,
                uplight: false,
                temperature: true,
                humidity: true,
                occupancy: true,
                light: false,
                luminance: false,
                indicator: true,
                standby: false,
                speaker: true,
                piezo: false,
                uvc: false,
                eco: true,
            });
        });

        it("should emit a sensor state event", async () => {
            parseStub = {
                software: "3.2.5",
                firmware: "3.2.3",
                mac: "20:63:83:12:DE:F0",
                capabilities: {
                    fan: true,
                    downlight: true,
                    uplight: false,
                    temperature: true,
                    humidity: true,
                    occupancy: true,
                    light: false,
                    luminance: false,
                    indicator: true,
                    standby: false,
                    speaker: true,
                    piezo: false,
                    uvc: false,
                    eco: true,
                },
                sensor: {
                    state: {
                        temperature: 19.62,
                        humidity: 40.41,
                    },
                },
            };

            await connection.connect();

            callbacks.data(Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03]));
            callbacks.data(Buffer.from([0x04, 0x05, 0xc0]));
            callbacks.data(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0xc0]));

            expect(emitStub).to.be.calledWith("Response", "SensorState", {
                id: "id",
                temperature: 19.62,
                humidity: 40.41,
            });
        });

        it("should emit a fan state event", async () => {
            parseStub = {
                software: "3.2.5",
                firmware: "3.2.3",
                mac: "20:63:83:12:DE:F0",
                capabilities: {
                    fan: true,
                    downlight: true,
                    uplight: false,
                    temperature: true,
                    humidity: true,
                    occupancy: false,
                    light: false,
                    luminance: false,
                    indicator: true,
                    standby: false,
                    speaker: true,
                    piezo: false,
                    uvc: false,
                    eco: true,
                },
                fan: {
                    state: {
                        on: false,
                        auto: false,
                        reverse: false,
                        speed: 0,
                        whoosh: true,
                        eco: true,
                        occupancy: true,
                    },
                },
            };

            await connection.connect();

            callbacks.data(Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03]));
            callbacks.data(Buffer.from([0x04, 0x05, 0xc0]));
            callbacks.data(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0xc0]));

            expect(emitStub).to.be.calledWith("Response", "FanState", {
                id: "id",
                on: false,
                auto: false,
                reverse: false,
                speed: 0,
                whoosh: true,
                eco: true,
                occupancy: true,
            });
        });

        it("should emit a downlight state event", async () => {
            parseStub = {
                software: "3.2.5",
                firmware: "3.2.3",
                mac: "20:63:83:12:DE:F0",
                capabilities: {
                    fan: true,
                    downlight: true,
                    uplight: false,
                    temperature: true,
                    humidity: true,
                    occupancy: true,
                    light: false,
                    luminance: false,
                    indicator: true,
                    standby: false,
                    speaker: true,
                    piezo: false,
                    uvc: false,
                    eco: true,
                },
                light: {
                    state: {
                        level: 0,
                        luminance: 4000,
                        on: false,
                        auto: false,
                        warm: 0,
                    },
                    target: "downlight",
                },
            };

            await connection.connect();

            callbacks.data(Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03]));
            callbacks.data(Buffer.from([0x04, 0x05, 0xc0]));
            callbacks.data(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0xc0]));

            expect(emitStub).to.be.calledWith("Response", "LightState", {
                id: "id",
                target: "downlight",
                level: 0,
                luminance: 4000,
                on: false,
                auto: false,
                warm: 0,
            });
        });

        it("should emit a uplight state event", async () => {
            parseStub = {
                software: "3.2.5",
                firmware: "3.2.3",
                mac: "20:63:83:12:DE:F0",
                capabilities: {
                    fan: true,
                    downlight: true,
                    uplight: true,
                    temperature: true,
                    humidity: true,
                    occupancy: true,
                    light: false,
                    luminance: false,
                    indicator: true,
                    standby: false,
                    speaker: true,
                    piezo: false,
                    uvc: false,
                    eco: true,
                },
                light: {
                    state: {
                        level: 0,
                        luminance: 4000,
                        on: false,
                        auto: false,
                        warm: 0,
                    },
                    target: "uplight",
                },
            };

            await connection.connect();

            callbacks.data(Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03]));
            callbacks.data(Buffer.from([0x04, 0x05, 0xc0]));
            callbacks.data(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0xc0]));

            expect(emitStub).to.be.calledWith("Response", "LightState", {
                id: "id",
                target: "uplight",
                level: 0,
                luminance: 4000,
                on: false,
                auto: false,
                warm: 0,
            });
        });

        it("should not emit a downlight state event if state is undefined", async () => {
            parseStub = {
                software: "3.2.5",
                firmware: "3.2.3",
                mac: "20:63:83:12:DE:F0",
                capabilities: {
                    fan: true,
                    downlight: true,
                    uplight: false,
                    temperature: true,
                    humidity: true,
                    occupancy: true,
                    light: false,
                    luminance: false,
                    indicator: true,
                    standby: false,
                    speaker: true,
                    piezo: false,
                    uvc: false,
                    eco: true,
                },
                light: {
                    target: "downlight",
                },
            };

            await connection.connect();

            callbacks.data(Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03]));
            callbacks.data(Buffer.from([0x04, 0x05, 0xc0]));
            callbacks.data(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0xc0]));

            expect(emitStub).to.not.be.calledWith("Response", "LightState", sinon.match.any);
        });
    });
});