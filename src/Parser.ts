export abstract class Parser {
    private static fragment: Buffer = Buffer.alloc(0);

    public static stuff(data: number[]): number[] {
        const result: number[] = [];

        let index = 0;

        for (let i = 0; i < data.length; i++) {
            if (data[i] === 0xc0) {
                result[index++] = 0xdb;
                result[index++] = 0xdc;
            } else if (data[i] === 0xdb) {
                result[index++] = 0xdb;
                result[index++] = 0xdd;
            } else {
                result[index++] = data[i];
            }
        }

        return result;
    }

    public static unstuff(data: Buffer): Buffer {
        const result: number[] = [];

        let index = 0;
        let position = 0;

        while (index < data.length) {
            if (data[index] === 0xdb && data[index + 1] === 0xdc) {
                result[position++] = 0xc0;

                index += 2;
            } else if (data[index] === 0xdb && data[index + 1] === 0xdd) {
                result[position++] = 0xdb;

                index += 2;
            } else {
                result[position++] = data[index++];
            }
        }

        return Buffer.from(result);
    }

    public static chunkify(data: Buffer): { chunks: Buffer[], count: number } {
        let index = 0;
        let count = 0;

        const chunks: Buffer[] = [];

        if (data[0] !== 0xc0 || (data[0] === 0xc0 && data[1] === 0xc0)) {
            index = data.indexOf(0xc0) + 1;

            if (Parser.fragment.length > 0) {
                const arr = [Parser.fragment, data.subarray(0, index)];

                chunks[count] = Buffer.concat(arr);

                count++;
            }
        }

        let eof = 0;
        let started = false;

        for (let i = index; i < data.length; i++) {
            if (data[i] === 0xc0) {
                if (!started) {
                    started = true;
                    index = i;
                } else {
                    chunks[count] = data.subarray(index, i + 1);

                    count++;
                    started = false;
                    eof = i;
                }
            }
        }

        if (eof < data.length - 1) {
            Parser.fragment = data.subarray(eof + 1);
        } else {
            Parser.fragment = Buffer.from([]);
        }

        return { chunks, count };
    }

    public static parse(data: Buffer): Record<string, any> {
        let type: number;
        let field: number;
        let length: number;

        let alpha: string;
        let numeric: number;

        let remaining: number;

        const results: Record<string, any> = {};

        [data, type, field] = Parser.deconstruct(data);

        if (field === 2) {
            [data, length] = Parser.varint(data);
            [data, type, field] = Parser.deconstruct(data);

            while (data.length > 0) {
                if (field === 4) {
                    [data, length] = Parser.varint(data);

                    remaining = data.length - length;

                    while (data.length > remaining) {
                        [data, type, field] = Parser.deconstruct(data);

                        if (field === 2) {
                            [data, length] = Parser.varint(data);
                            [data, type, field] = Parser.deconstruct(data);

                            switch (field) {
                                case 2: // device product name
                                    [data, alpha] = Parser.getString(data);

                                    results.product = alpha;
                                    break;

                                case 7: // device firmware version
                                    [data, alpha] = Parser.getString(data);

                                    results.firmware = alpha;
                                    break;

                                case 43: // fan on/auto state
                                    [data, numeric] = Parser.getValue(data);

                                    results.fan = { ...results.fan };

                                    results.fan.state = {
                                        ...results.fan.state,
                                        on: numeric >= 1,
                                        auto: numeric === 2,
                                    };

                                    break;

                                case 44: // fan reverse state
                                    [data, numeric] = Parser.getValue(data);

                                    results.fan = { ...results.fan };

                                    results.fan.state = {
                                        ...results.fan.state,
                                        reverse: numeric === 1,
                                    };

                                    break;

                                case 46: // fan rotation speed state
                                    [data, numeric] = Parser.getValue(data);

                                    results.fan = { ...results.fan };

                                    results.fan.state = {
                                        ...results.fan.state,
                                        speed: numeric,
                                    };

                                    break;

                                case 58: // fan whoosh state
                                    [data, numeric] = Parser.getValue(data);

                                    results.fan = { ...results.fan };

                                    results.fan.state = {
                                        ...results.fan.state,
                                        whoosh: numeric === 1,
                                    };

                                    break;

                                case 65: // fan eco mode state
                                    [data, numeric] = Parser.getValue(data);

                                    results.fan = { ...results.fan };

                                    results.fan.state = {
                                        ...results.fan.state,
                                        eco: numeric === 1,
                                    };

                                    break;

                                case 66: // fan occupancy state
                                    [data, numeric] = Parser.getValue(data);

                                    results.fan = { ...results.fan };

                                    results.fan.state = {
                                        ...results.fan.state,
                                        occupancy: numeric === 1,
                                    };

                                    break;

                                case 67: // fan on means auto
                                    [data, numeric] = Parser.getValue(data);
                                    break;

                                case 68: // light on/off/auto
                                    [data, numeric] = Parser.getValue(data);

                                    results.light = { ...results.light };

                                    results.light.state = {
                                        ...results.light.state,
                                        on: numeric >= 1,
                                        auto: numeric === 2,
                                    };

                                    break;

                                case 69: // light brightness
                                    [data, numeric] = Parser.getValue(data);

                                    results.light = { ...results.light };

                                    results.light.state = {
                                        ...results.light.state,
                                        level: numeric,
                                    };

                                    break;

                                case 71: // color temperature
                                    [data, numeric] = Parser.getValue(data);

                                    results.light = { ...results.light };

                                    results.light.state = {
                                        ...results.light.state,
                                        luminance: numeric,
                                    };

                                    break;

                                case 77: // light dim to warm
                                    [data, numeric] = Parser.getValue(data);

                                    results.light = { ...results.light };

                                    results.light.state = {
                                        ...results.light.state,
                                        warm: numeric,
                                    };

                                    break;

                                case 82: // light selector light mode 0/all, 1/downlight, 2/uplight
                                    [data, numeric] = Parser.getValue(data);

                                    results.light = {
                                        ...results.light,
                                        target: numeric === 2 ? "uplight" : "downlight",
                                    };

                                    break;

                                case 85: // light occupied state
                                    [data, numeric] = Parser.getValue(data);

                                    results.light = { ...results.light };

                                    results.light.state = {
                                        ...results.light.state,
                                        occupancy: numeric === 1,
                                    };

                                    break;

                                case 86: // temperature sensor state
                                    [data, numeric] = Parser.getValue(data);

                                    results.sensor = { ...results.sensor };

                                    results.sensor.state = {
                                        ...results.sensor.state,
                                        temperature: numeric / 100,
                                    };

                                    break;

                                case 87: // humidity sensor state
                                    [data, numeric] = Parser.getValue(data);

                                    results.sensor = { ...results.sensor };

                                    results.sensor.state = {
                                        ...results.sensor.state,
                                        humidity: numeric / 100,
                                    };

                                    break;

                                case 109: // auto light state (ignore)
                                    [data, numeric] = Parser.getValue(data);
                                    break;

                                case 172: // fan uvc state
                                    [data, numeric] = Parser.getValue(data);

                                    results.fan = { ...results.fan };

                                    results.fan.state = {
                                        ...results.fan.state,
                                        uvc: numeric >= 1,
                                    };

                                    break;

                                case 1: // name
                                case 4: // local date time
                                case 5: // utc date time
                                case 6: // time zone
                                case 8: // mac address
                                case 9: // cloud id
                                case 10: // fan alpha uuid
                                case 11: // website
                                case 13: // api version
                                case 37: // pcba part number
                                case 38: // pcba revision
                                case 120: // ip address
                                case 139: // wall control configuration 1/top, 2/bottom
                                    [data, alpha] = Parser.getString(data);
                                    break;

                                case 15: // device type ID
                                case 45: // fan speed as %
                                case 47: // fan auto comfort
                                case 48: // comfort ideal temperature
                                case 50: // comfort min speed
                                case 51: // comfort max speed
                                case 52: // fan auto -> motion -> motion sense switch (fan occupancy enable)
                                case 53: // fan auto -> motion -> motion timeout (time)
                                case 54: // fan return to auto (return to auto switch)
                                case 55: // fan return to auto (return to auto timeout)
                                case 60: // comfort heat assist
                                case 61: // comfort sense heat assist speed
                                case 62: // comfort sense heat assist direction
                                case 63: // target revolutions per minute
                                case 64: // actual rpm
                                case 70: // brightness as level (0, 1-16)
                                case 72: // light occupancy enabled
                                case 73: // light auto motion timeout (time)
                                case 74: // light return to auto (return to auto switch)
                                case 75: // light return to auto (return after)
                                case 78: // warmest color temperature
                                case 79: // coolest color temperature
                                case 95: // fan timer minutes
                                case 96: // fan timer UTC expiration
                                case 134: // LED indicators enabled
                                case 135: // audible indicator enabled
                                case 136: // legacy IR remote enabled
                                case 140: // assist 0/nothing, 1/heating, 2/cooling, 3/all
                                case 150: // remote discovery enabled
                                case 151: // external device count
                                case 153: // bluetooth remote supported
                                case 173: // uvc life
                                    [data, numeric] = Parser.getValue(data);
                                    break;

                                case 56:
                                case 59:
                                case 76:
                                    [data, alpha] = Parser.getString(data);
                                    break;

                                case 3:
                                case 14:
                                case 24:
                                case 25:
                                case 26:
                                case 27:
                                case 28:
                                case 29:
                                case 30:
                                case 31:
                                case 32:
                                case 33:
                                case 49:
                                case 57:
                                case 84:
                                case 89:
                                case 118:
                                case 121:
                                case 133:
                                case 137:
                                case 138:
                                case 174:
                                case 175:
                                    [data, numeric] = Parser.getValue(data);
                                    break;

                                case 16: // detailed version
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 2: // app version
                                                [data, alpha] = Parser.getString(data);

                                                results.software = alpha;
                                                break;

                                            case 3: // boot loader version
                                                [data, alpha] = Parser.getString(data);

                                                results.firmware = alpha;
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 17: // capabilities
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    results.capabilities = {
                                        fan: false,
                                        downlight: false,
                                        uplight: false,
                                        temperature: false,
                                        humidity: false,
                                        occupancy: false,
                                        light: false,
                                        luminance: false,
                                        indicator: false,
                                        standby: false,
                                        speaker: false,
                                        piezo: false,
                                        uvc: false,
                                        eco: false,
                                    };

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 1: // temperature sensor
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.temperature = Boolean(numeric);
                                                break;

                                            case 2: // humidity sensor
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.humidity = Boolean(numeric);
                                                break;

                                            case 3: // occupancy sensor
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.occupancy = Boolean(numeric);
                                                break;

                                            case 4: // downlight
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.downlight = Boolean(numeric);
                                                break;

                                            case 5: // light sensor
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.light = Boolean(numeric);
                                                break;

                                            case 6: // luminance
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.luminance = Boolean(numeric);
                                                break;

                                            case 7: // fan
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.fan = Boolean(numeric);
                                                break;

                                            case 8: // speaker
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.speaker = Boolean(numeric);
                                                break;

                                            case 9: // piezo
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.piezo = Boolean(numeric);
                                                break;

                                            case 10: // indicators
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.indicator = Boolean(numeric);
                                                break;

                                            case 11: // uplight
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.uplight = Boolean(numeric);
                                                break;

                                            case 12: // uvc
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.uvc = Boolean(numeric);
                                                break;

                                            case 13: // standby
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.standby = Boolean(numeric);
                                                break;

                                            case 14: // eco
                                                [data, numeric] = Parser.getValue(data);

                                                results.capabilities.eco = Boolean(numeric);
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 83: // standby message: 1/color preset, 2/enabled, 3/percent, 4/red, 5/green, 6/blue
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 1: // color preset
                                                [data, numeric] = Parser.getValue(data);

                                                results.standbyColorPreset = numeric;
                                                break;

                                            case 2: // enabled
                                                [data, numeric] = Parser.getValue(data);

                                                results.standbyLEDEnable = numeric;
                                                break;

                                            case 3: // percent
                                                [data, numeric] = Parser.getValue(data);

                                                results.standbyLEDPercent = numeric;
                                                break;

                                            case 4: // red
                                                [data, numeric] = Parser.getValue(data);

                                                results.standbyLEDRed = numeric;
                                                break;

                                            case 5: // green
                                                [data, numeric] = Parser.getValue(data);

                                                results.standbyLEDGreen = numeric;
                                                break;

                                            case 6: // blue
                                                [data, numeric] = Parser.getValue(data);

                                                results.standbyLEDBlue = numeric;
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 124: // wifi messages
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 1: // ssid
                                                [data, alpha] = Parser.getString(data);
                                                break;

                                            case 2: // signal strength
                                                [data, numeric] = Parser.getValue(data);
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 152: // external device version
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        if (field === 4) {
                                            [data, alpha] = Parser.getString(data);

                                            results.mac = alpha;
                                        }
                                    }

                                    break;

                                case 156: // manufacturer
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        if (field > 0 && field <= 7) {
                                            [data, numeric] = Parser.getValue(data);
                                        } else {
                                            numeric = 0;
                                        }

                                        switch (field) {
                                            case 1: // uptime (minutes)
                                            case 2: // reboot count total
                                            case 4: // last reboot reason
                                            case 3: // reboot count
                                            case 5: // last reboot details
                                            case 6: // software error
                                            case 7: // software error details
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 171:
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length >= remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 2:
                                                [data, alpha] = Parser.getString(data);

                                                results.id = alpha;
                                                break;

                                            case 3:
                                                [data, alpha] = Parser.getString(data);

                                                results.name = alpha;
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 176:
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 1:
                                            case 2:
                                            case 4:
                                            case 5:
                                            case 7:
                                                [data, numeric] = Parser.getValue(data);
                                                break;

                                            case 3: {
                                                [data, length] = Parser.varint(data);

                                                remaining = data.length - length;

                                                while (data.length > remaining) {
                                                    [data, type, field] = Parser.deconstruct(data);

                                                    if (field === 0) {
                                                        [data, alpha] = Parser.getString(data);
                                                    } else {
                                                        data = Parser.advance(data, type);
                                                    }
                                                }

                                                break;
                                            }

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 177:
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 4:
                                            case 5:
                                            case 7:
                                                [data, numeric] = Parser.getValue(data);
                                                break;

                                            case 3:
                                                [data, alpha] = Parser.getString(data);
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 178:
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 1:
                                            case 4:
                                            case 5:
                                            case 7:
                                                [data, numeric] = Parser.getValue(data);
                                                break;

                                            case 3:
                                                [data, alpha] = Parser.getString(data);
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                case 179:
                                    [data, length] = Parser.varint(data);

                                    remaining = data.length - length;

                                    while (data.length > remaining) {
                                        [data, type, field] = Parser.deconstruct(data);

                                        switch (field) {
                                            case 2:
                                            case 4:
                                            case 5:
                                            case 7:
                                                [data, numeric] = Parser.getValue(data);
                                                break;

                                            case 3:
                                                [data, alpha] = Parser.getString(data);
                                                break;

                                            default:
                                                data = Parser.advance(data, type);
                                                break;
                                        }
                                    }

                                    break;

                                default:
                                    data = Parser.advance(data, type);
                                    break;
                            }
                        } else if (field === 3) {
                            [data, length] = Parser.varint(data);

                            const residualLength = data.length - length;

                            while (data.length > residualLength) {
                                [data, type, field] = Parser.deconstruct(data);

                                switch (field) {
                                    case 1: // action 0/no action, 1/update, 2/remove, 3/read
                                    case 3: // schedule acount
                                    case 4: // schedule max
                                        [data, numeric] = Parser.getValue(data); // ignore
                                        break;

                                    case 2: // schedule
                                        [data, length] = Parser.varint(data);

                                        const residualLength = data.length - length;

                                        while (data.length > residualLength) {
                                            [data, type, field] = Parser.deconstruct(data);

                                            switch (field) {
                                                case 1: // id
                                                    [data, numeric] = Parser.getValue(data);
                                                    break;

                                                case 2: // name
                                                    [data, alpha] = Parser.getString(data);
                                                    break;

                                                case 3: // devices
                                                    let bytes: Buffer;

                                                    [data, bytes] = Parser.getBytes(data);
                                                    break;

                                                case 4: // days
                                                    [data, length] = Parser.varint(data);

                                                    while (data.length > data.length - length) {
                                                        [data, numeric] = Parser.getValue(data);
                                                    }

                                                    break;

                                                case 5:
                                                case 6: // enabled
                                                    [data, numeric] = Parser.getValue(data);
                                                    break;

                                                case 7: // start event
                                                case 8: // end event
                                                    [data, length] = Parser.varint(data);

                                                    while (data.length > data.length - length) {
                                                        [data, type, field] = Parser.deconstruct(data);

                                                        switch (field) {
                                                            case 1: // time
                                                                [data, alpha] = Parser.getString(data);
                                                                break;

                                                            case 2: // properties
                                                                [data, length] = Parser.varint(data);

                                                                const residualLength = data.length - length;

                                                                while (data.length > residualLength) {
                                                                    [data, type, field] = Parser.deconstruct(data);

                                                                    switch (field) {
                                                                        case 1: // fan mode 0/off, 1/on, 2/auto
                                                                        case 2: // fan direction
                                                                        case 3: // fan percent
                                                                        case 4: // fan speed
                                                                        case 5: // light mode 0/off, 1/on, 2/auto
                                                                        case 6: // light percent
                                                                        case 7: // light level
                                                                        case 8: // light color temperature
                                                                        case 9: // up light percent
                                                                        case 10: // multiple light mode 0/all lights, 1/down light, 2/up light
                                                                        case 11: // comfort sense enable
                                                                        case 12: // comfort sense ideal temperature
                                                                        case 13: // comfort sense min speed
                                                                        case 14: // comfort sense max speed
                                                                        case 15: // fan occupancy enabled
                                                                        case 16: // fan occupancy timeout
                                                                        case 17: // light occupancy enabled
                                                                        case 18: // light occupancy timeout
                                                                            [data, numeric] = Parser.getValue(data);
                                                                            break;

                                                                        default:
                                                                            data = Parser.advance(data, type);
                                                                            break;
                                                                    }
                                                                }

                                                                break;

                                                            default:
                                                                data = Parser.advance(data, type);
                                                                break;
                                                        }
                                                    }

                                                    break;

                                                default:
                                                    data = Parser.advance(data, type);
                                                    break;
                                            }
                                        }

                                        break;

                                    default:
                                        data = Parser.advance(data, type);
                                        break;
                                }
                            }
                        } else {
                            data = Parser.advance(data, type);
                            return results;
                        }
                    }
                } else if (field === 5) {
                    [data, numeric] = Parser.getValue(data);
                } else if (field === 6) {
                    [data, alpha] = Parser.getString(data);
                } else {
                    data = Parser.advance(data, type);
                }

                if (data.length > 0) {
                    [data, type, field] = Parser.deconstruct(data);
                }
            }
        } else {
            data = Parser.advance(data, type);
        }

        return results;
    }

    private static getString(data: Buffer): [Buffer, string] {
        let length: number;
    
        [data, length] = Parser.varint(data);
    
        return [data.subarray(length), data.subarray(0, length).toString()];
    }

    private static getValue(data: Buffer): [Buffer, number] {
        let length: number;
    
        [data, length] = Parser.varint(data);
    
        return [data, length];
    }

    private static getBytes(data: Buffer): [Buffer, Buffer] {
        let length: number;
    
        [data, length] = Parser.varint(data);
    
        return [data.subarray(length), data.subarray(0, length)];
    }

    private static advance(data: Buffer, type: number) {
        if (type === 0) {
            let value: number;
    
            [data, value] = Parser.varint(data);
        } else if (type === 1) {
            data = data.subarray(8);
        } else if (type === 2) {
            let length: number;
    
            [data, length] = Parser.varint(data);
    
            data = data.subarray(length);
        } else if (type === 5) {
            data = data.subarray(4);
        }
    
        return data;
    }

    private static varint(data: Buffer): [Buffer, number] {
        let key = 0;
    
        const fields: number[] = [];
    
        for (let index = 0; index < data.length; index++) {
            if (data[index] & 0x80) {
                fields.push(data[index] & 0x7f);
            } else {
                fields.push(data[index] & 0x7f);
    
                break;
            }
        }
    
        for (let index = fields.length - 1; index >= 0; index--) {
            key = (key << 7) | fields[index];
        }
    
        return [data.subarray(fields.length), key];
    }

    private static deconstruct(data: Buffer): [Buffer, number, number] {
        let key = 0;
    
        const fields: number[] = [];
    
        for (let index = 0; index < data.length; index++) {
            if (data[index] & 0x80) {
                fields.push(data[index] & 0x7f);
            } else {
                fields.push(data[index] & 0x7f);
    
                break;
            }
        }
    
        for (let index = fields.length - 1; index >= 0; index--) {
            key = (key << 7) | fields[index];
        }
    
        return [data.subarray(fields.length), key & 0x07, key >>> 3];
    }
}
