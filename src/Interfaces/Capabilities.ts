export interface Capabilities {
    id: string;
    name: string;
    model: string;
    firmware: string;
    mac: string;
    fan: boolean;
    downlight: boolean;
    uplight: boolean;
    temperature: boolean;
    humidity: boolean;
    occupancy: boolean;
    light: boolean;
    luminance: boolean;
    indicator: boolean;
    standby: boolean;
    speaker: boolean;
    piezo: boolean;
    uvc: boolean;
    eco: boolean;
}