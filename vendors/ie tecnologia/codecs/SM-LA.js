function decodeUplink(input) {
  try {
    if (!input || !input.bytes) {
      return {
        errors: ["Payload não encontrado!"]
      };
    }

    const bytes = input.bytes;

    if (bytes.length !== 15) {
      return {
        errors: [
          "Payload inválido: " + bytes.length +
          " bytes. Esperado: 15 bytes."
        ]
      };
    }

    let i = 0;

    // Lê um inteiro de 32 bits sem sinal, em big-endian.
    function readUint32() {
      const value = (
        (bytes[i] << 24) |
        (bytes[i + 1] << 16) |
        (bytes[i + 2] << 8) |
        bytes[i + 3]
      ) >>> 0;

      i += 4;
      return value;
    }

    const contador1 = readUint32();
    const contador2 = readUint32();
    const contador3 = readUint32();

    // Tamper: 1 byte, mantido como valor numérico.
    const tamper = bytes[i++];

    // Bateria: 2 bytes em big-endian, em milivolts.
    const bateria_mV = (bytes[i] << 8) | bytes[i + 1];

    return {
      data: {
        contador1: contador1,
        contador2: contador2,
        contador3: contador3,
        tamper: tamper,
        bateria_V: bateria_mV / 1000
      }
    };

  } catch (e) {
    return {
      errors: ["Erro ao processar payload: " + String(e)]
    };
  }
}