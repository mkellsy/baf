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
    luminance: boolean;
    speaker: boolean;
    uvc: boolean;
    eco: boolean;
}