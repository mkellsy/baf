import chai, { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";

import { Parser } from "../src/Parser";

chai.use(sinonChai);

describe("Parser", function () {
    describe("stuff()", () => {
        it("should return the propper stuffed number array", async () => {
            let result: any;

            result = Parser.stuff([0xc0, 0, 1, 2, 3, 4, 0xdb]);

            expect(result).to.deep.equal([219, 220, 0, 1, 2, 3, 4, 219, 221]);
        });
    });

    describe("unstuff()", () => {
        it("should return an unstuffed buffer", async () => {
            let result: any;

            result = Parser.unstuff(Buffer.from([219, 220, 0, 1, 2, 3, 4, 219, 221]));

            expect(result).to.deep.equal(Buffer.from([0xc0, 0, 1, 2, 3, 4, 0xdb]));
        });
    });

    describe("chunkify()", () => {
        it("should return a single fragment object", () => {
            let result: any;

            result = Parser.chunkify(Buffer.from([0xc0, 0xc0, 0x01, 0x02, 0x03, 0x04]));
            result = Parser.chunkify(Buffer.from([0x05, 0x06, 0x07, 0x08, 0x09, 0xc0]));

            expect(result).to.deep.equal({
                chunks: [Buffer.from([0xc0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0xc0])],
                count: 1,
            });
        });

        it("should return no chunks for non marked data", () => {
            let result: any;

            result = Parser.chunkify(Buffer.from([0xc0, 0x01, 0x02, 0x03, 0x04]));

            expect(result).to.deep.equal({
                chunks: [],
                count: 0,
            });
        });

        it("should return a single chunck for non-fragmented responses", () => {
            let result: any;

            result = Parser.chunkify(Buffer.from([0xc0, 0x05, 0x06, 0x07, 0x08, 0x09, 0xc0]));

            expect(result).to.deep.equal({
                chunks: [Buffer.from([0xc0, 0x05, 0x06, 0x07, 0x08, 0x09, 0xc0])],
                count: 1,
            });
        });
    });

    describe("parse()", () => {
        // TODO
    });
});
