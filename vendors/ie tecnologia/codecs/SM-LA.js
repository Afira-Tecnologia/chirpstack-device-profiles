function decodeUplink(input) {
    try {
        var bytes = input.bytes;

        if (!bytes || bytes.length === 0) {
            return {
                errors: ["Payload vazio"]
            };
        }

        var contador1, contador2, contador3;
        var tamper, bateria_V;

        if (bytes.length === 15) {
            // Formato binario antigo: 15 bytes
            var i = 0;

            function readUint32() {
                var value = (
                    (bytes[i] << 24) |
                    (bytes[i + 1] << 16) |
                    (bytes[i + 2] << 8) |
                    bytes[i + 3]
                ) >>> 0;

                i += 4;
                return value;
            }

            contador1 = readUint32();
            contador2 = readUint32();
            contador3 = readUint32();

            tamper = bytes[i++];

            var bateria_mV =
                (bytes[i] << 8) | bytes[i + 1];

            bateria_V = bateria_mV / 1000;

        } else {
            // Formato ASCII:
            // 00042D00|00000000|00000198|0|4.63

            var texto = "";

            for (var j = 0; j < bytes.length; j++) {
                texto += String.fromCharCode(bytes[j]);
            }

            var campos = texto.trim().split("|");

            if (campos.length !== 5) {
                return {
                    errors: ["Formato ASCII invalido: " + texto]
                };
            }

            for (var k = 0; k < 3; k++) {
                if (!/^[0-9a-fA-F]{8}$/.test(campos[k])) {
                    return {
                        errors: ["Contador hexadecimal invalido"]
                    };
                }
            }

            if (!/^[0-9]+$/.test(campos[3]) ||
                !/^[0-9]+(\.[0-9]+)?$/.test(campos[4])) {
                return {
                    errors: ["Tamper ou bateria invalido"]
                };
            }

            contador1 = parseInt(campos[0], 16);
            contador2 = parseInt(campos[1], 16);
            contador3 = parseInt(campos[2], 16);

            tamper = parseInt(campos[3], 10);
            bateria_V = parseFloat(campos[4]);
        }

        return {
            data: {
                contador1: contador1,
                contador2: contador2,
                contador3: contador3,
                tamper: tamper,
                bateria_V: bateria_V
            }
        };

    } catch (e) {
        return {
            errors: ["Erro no decoder: " + String(e)]
        };
    }
}