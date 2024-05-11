export interface LightState {
    id: string;
    target: "uplight" | "downlight";
    level: number;
    luminance:  number;
    on: boolean;
    auto: boolean;
    warm: number;
}
