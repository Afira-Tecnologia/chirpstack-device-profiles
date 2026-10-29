
/*
 * ITE 11LI - Decoder LoRaWAN
 * Compatível com ChirpStack v4
 * fPort: 10
 */

const PHASE_NAMES = ["phase_a", "phase_b", "phase_c"];

const TC_CONFIG_NAMES = [
    "POWCT-T16-150-333",
    "POWCT-T24-250-333",
    "POWCT-T36-630-333",
    "POWCT-T50-1500-333",
    "POWCT-T16-25-333",
    "POWCT-T16-40-333",
    "POWCT-T16-100-333"
];

// Arredondamento
function roundValue(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(
        (value + Number.EPSILON) * factor
    ) / factor;
}

// Leitura uint16 - Big Endian
function readUint16(bytes, offset) {
    return (
        (bytes[offset] << 8) |
        bytes[offset + 1]
    );
}

// Leitura uint32 - Big Endian sem sinal
function readUint32(bytes, offset) {
    return (
        (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]
    ) >>> 0;
}

// Funcao principal do ChirpStack v4
function decodeUplink(input) {

    const data = {
        device: [],
        sensors: []
    };

    // Validacao do fPort
    if (input.fPort !== 10) {
        data.device.push({
            n: "model",
            v: "Unknown model"
        });

        return { data: data };
    }

    const bytes = input.bytes;

    if (!bytes || bytes.length < 3) {
        return {
            data: data,
            errors: [
                "Payload muito curto: minimo 3 bytes."
            ]
        };
    }

    let i = 0;

    // Protecao contra payload incompleto
    function needBytes(size, field) {
        if (i + size > bytes.length) {
            throw new Error(
                "Payload incompleto em " + field +
                ": necessita " + size +
                " byte(s), restam " +
                (bytes.length - i) + "."
            );
        }
    }

    function u8(field) {
        needBytes(1, field);
        return bytes[i++];
    }

    function u16(field) {
        needBytes(2, field);

        const value = readUint16(bytes, i);
        i += 2;

        return value;
    }

    function u32(field) {
        needBytes(4, field);

        const value = readUint32(bytes, i);
        i += 4;

        return value;
    }

    try {

        // Versao do protocolo
        const decodeVer = u8("decode_version");

        // Mascara de campos
        const mask = u16("mask");

        data.device.push({
            n: "model",
            v: "ITE 11LI"
        });

        // Firmware - bit 0
        if ((mask & 0x01) !== 0) {

            const fw1 = u8("firmware_version");
            const fw2 = u8("firmware_version");

            const firmware =
                (fw1 >> 4) + "." +
                (fw1 & 0x0F) + "." +
                (fw2 >> 4) + "." +
                (fw2 & 0x0F);

            data.device.push({
                n: "firmware_version",
                v: firmware
            });
        }

        // Temperatura - bit 1
        if ((mask & 0x02) !== 0) {
            data.sensors.push({
                n: "temperature",
                v: roundValue(
                    u8("temperature") / 2, 1
                ),
                u: "C"
            });
        }

        // Frequencia - bit 2
        if ((mask & 0x04) !== 0) {
            data.sensors.push({
                n: "frequency",
                v: roundValue(
                    u8("frequency") / 10 + 45, 1
                ),
                u: "Hz"
            });
        }

        let totalAcEnergy = 0;
        let totalReEnergy = 0;

        // Fases A, B e C - bits 3, 4 e 5
        for (let index = 0; index < 3; index++) {

            if ((mask & (1 << (3 + index))) === 0) {
                continue;
            }

            const phase = PHASE_NAMES[index];

            // Tensao
            const voltage = roundValue(
                u16(phase + "_voltage") / 10, 1
            );

            // Corrente conforme versao
            const current = decodeVer === 1
                ? roundValue(
                    u16(phase + "_current") / 1000, 3
                  )
                : roundValue(
                    u16(phase + "_current") / 20, 2
                  );

            // Fator de potencia
            const pwrFactor = roundValue(
                u8(phase + "_pwr_factor") / 100 - 1,
                2
            );

            // Energia ativa
            const activeEnergy = roundValue(
                u32(phase + "_active_energy") / 100,
                2
            );

            // Energia reativa
            const reactiveEnergy = roundValue(
                u32(phase + "_reactive_energy") / 100,
                2
            );

            // Configuracao TC
            const tcIndex = u8(phase + "_tc_config");

            const tcConfig =
                TC_CONFIG_NAMES[tcIndex] ||
                ("Unknown TC (" + tcIndex + ")");

            // Sensores
            data.sensors.push({
                n: phase + "_voltage",
                v: voltage,
                u: "V"
            });

            data.sensors.push({
                n: phase + "_current",
                v: current,
                u: "A"
            });

            data.sensors.push({
                n: phase + "_pwr_factor",
                v: pwrFactor,
                u: "/"
            });

            data.sensors.push({
                n: phase + "_active_energy",
                v: activeEnergy,
                u: "kWh"
            });

            data.sensors.push({
                n: phase + "_reactive_energy",
                v: reactiveEnergy,
                u: "kVArh"
            });

            data.sensors.push({
                n: phase + "_tc_config",
                v: tcConfig
            });

            // Acumuladores
            totalAcEnergy += activeEnergy;
            totalReEnergy += reactiveEnergy;

            // Potencia aparente
            const apparentPower = voltage * current;

            // Potencia ativa
            const activePower =
                apparentPower * pwrFactor;

            // Potencia reativa
            const reactivePower = Math.sqrt(
                Math.max(
                    0,
                    apparentPower * apparentPower -
                    activePower * activePower
                )
            );

            data.sensors.push({
                n: phase + "_apparent_power",
                v: roundValue(apparentPower, 2),
                u: "VA"
            });

            data.sensors.push({
                n: phase + "_active_power",
                v: roundValue(activePower, 2),
                u: "W"
            });

            data.sensors.push({
                n: phase + "_reactive_power",
                v: roundValue(reactivePower, 2),
                u: "VAr"
            });
        }

        // Energia ativa total
        data.sensors.push({
            n: "total_active_energy",
            v: roundValue(totalAcEnergy, 2),
            u: "kWh"
        });

        // Energia reativa total
        data.sensors.push({
            n: "total_reactive_energy",
            v: roundValue(totalReEnergy, 2),
            u: "kVArh"
        });

        // Entrada digital B1 - bit 6
        if ((mask & 0x40) !== 0) {
            data.sensors.push({
                n: "b1_state",
                v: u8("b1_state") ? "CLOSED" : "OPEN",
                u: "bool"
            });
        }

        return {
            data: data
        };

    } catch (e) {

        return {
            data: {},
            errors: [e.message]
        };
    }
}
