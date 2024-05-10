import { Capabilities } from "./Capabilities";
import { FanState } from "./FanState";
import { LightState } from "./LightState";
import { SensorState } from "./SensorState";

export interface ResponseTypes {
    Capabilities: Capabilities;
    FanState: FanState;
    LightState: LightState;
    SensorState: SensorState;
}
