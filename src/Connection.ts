import Net from "net";

import { Capabilities } from "./Interfaces/Capabilities";
import { EventEmitter } from "@mkellsy/event-emitter";
import { FanState } from "./Interfaces/FanState";
import { LightState } from "./Interfaces/LightState";
import { Parser } from "./Parser";
import { ResponseTypes } from "./Interfaces/ResponseTypes";
import { SensorState } from "./Interfaces/SensorState";

export class Connection extends EventEmitter<{
    Connect: (connection: Connection) => void;
    Disconnect: () => void;
    Response: <K extends keyof ResponseTypes>(type: K, response: ResponseTypes[K]) => void;
    Error: (error: Error) => void;
}> {
    private socket?: Net.Socket;
    private teardown: boolean = false;

    private uuid: string;
    private name: string;
    private model: string;
    private host: string;
    private port: number;

    private device?: Partial<Capabilities>;
    private current?: Partial<Capabilities>;
    private state: { fan?: FanState; sensor?: SensorState; downlight?: LightState; uplight?: LightState } = {};

    constructor(host: string, id: string, name: string, model: string) {
        super();

        this.uuid = id;
        this.name = name;
        this.model = model;

        this.host = host;
        this.port = 31415;
    }

    public get id(): string {
        return this.uuid;
    }

    public async connect(): Promise<void> {
        this.teardown = false;

        this.socket = Net.connect(
            {
                host: this.host,
                port: this.port,
                family: 4,
            },
            () => {
                this.socket?.on("data", this.onSocketData);
                this.socket?.on("error", this.onSocketError);
                this.socket?.on("end", this.onSocketDisconnect);

                this.emit("Connect", this);
            }
        );
    }

    public disconnect() {
        this.teardown = true;
        this.socket?.destroy();
    }

    public write(buffer: number[]): void {
        const stuffed = Parser.stuff(buffer);
        const marked = Buffer.from([0xc0].concat(stuffed).concat([0xc0]));

        this.socket?.write(marked);
    }

    private onSocketData = (data: Buffer): void => {
        let results: Record<string, any> = {};

        const fragment = Parser.chunkify(data);

        for (let i = 0; i < fragment.count; i++) {
            if (fragment.chunks[i][0] !== 0xc0 || fragment.chunks[i][fragment.chunks[i].length - 1] !== 0xc0) {
                continue;
            } else {
                fragment.chunks[i] = fragment.chunks[i].subarray(1, fragment.chunks[i].length - 1);
            }

            results = { ...results, ...Parser.parse(Parser.unstuff(fragment.chunks[i])) };
        }

        this.updateDevice(results);
        this.updateFanState(results);
        this.updateLightState("downlight", results);
        this.updateLightState("uplight", results);
        this.updateSensorState(results);
    };

    private onSocketDisconnect = (): void => {
        if (!this.teardown) {
            this.connect();
        } else {
            this.emit("Disconnect");
        }
    };

    private onSocketError = (error: Error): void => {
        this.emit("Error", error);
    };

    private equals(left: any, right: any): boolean {
        return JSON.stringify(left) === JSON.stringify(right);
    }

    private supported(target: keyof Capabilities): boolean {
        if (this.device == null || this.device[target] === false) {
            return false;
        }

        return true;
    }

    private updateDevice(results: Record<string, any>): void {
        if (results.firmware) {
            this.current = { ...this.current, firmware: results.firmware };
        }

        if (results.capabilities) {
            this.current = { ...this.current, ...results.capabilities };
        }

        if (results.mac) {
            this.current = { ...this.current, mac: results.mac };
        }

        if (
            this.current == null ||
            this.current.firmware == null ||
            this.current.mac == null ||
            this.current.fan == null
        ) {
            return;
        }

        if (!this.equals(this.device, this.current)) {
            this.device = this.current;

            this.emit("Response", "Capabilities", {
                id: this.uuid,
                name: this.name,
                model: this.model,
                ...this.device,
            } as Capabilities);
        }
    }

    private updateFanState(results: Record<string, any>): void {
        if (!this.supported("fan")) {
            return;
        }

        if (results.fan?.state == null) {
            return;
        }

        if (!this.equals(this.state.fan, results.fan.state)) {
            this.state.fan = results.fan.state;

            this.emit("Response", "FanState", this.state.fan as FanState);
        }
    }

    private updateLightState(target: "downlight" | "uplight", results: Record<string, any>): void {
        if (!this.supported(target)) {
            return;
        }

        if (results.light.target !== target || results.light?.state == null) {
            return;
        }

        if (!this.equals(this.state[target], results.light.state)) {
            this.state[target] = results.light.state;

            this.emit("Response", "LightState", { target, ...this.state[target] } as LightState);
        }
    }

    private updateSensorState(results: Record<string, any>): void {
        if (!this.supported("temperature") && !this.supported("humidity")) {
            return;
        }

        if (results.sensor == null) {
            return;
        }

        if (!this.equals(this.state.sensor, results.sensor.state)) {
            this.state.sensor = results.sensor.state;

            this.emit("Response", "SensorState", this.state.sensor as SensorState);
        }
    }
}
