import chai, { expect } from "chai";
import sinonChai from "sinon-chai";

import { Connection } from "../src";

chai.use(sinonChai);

describe("index", () => {
    it("should define a Connection object", () => {
        expect(Connection).to.not.be.null;
    });
});
