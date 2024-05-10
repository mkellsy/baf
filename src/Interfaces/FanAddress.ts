import { HostAddress } from "@mkellsy/hap-device";

export interface FanAddress {
    id: string;
    addresses: HostAddress[];
    name: string;
    model: string;
};
