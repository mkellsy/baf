export interface LightState {
    id: string;
    target: "uplight" | "downlight" | "uvc";
    level: number;
    luminance:  number;
    on: boolean;
    auto: boolean;
    warm: number;
}
