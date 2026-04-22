function decodeUplink(input) {
  const bytes = input.bytes;
  let i = 0;

  function readUint32() {
    return (
      (bytes[i++] << 24) >>> 0 |
      (bytes[i++] << 16) |
      (bytes[i++] << 8)  |
       bytes[i++]
    ) >>> 0;
  }

  if (bytes.length !== 15) {
    return {
      errors: ["Payload inválido: tamanho esperado = 15 bytes"]
    };
  }

  const contador1 = readUint32();
  const contador2 = readUint32();
  const contador3 = readUint32();

  const tamper = bytes[i++];

  const bateria_mV = (bytes[i++] << 8) | bytes[i++];

  return {
    data: {
      contador1: contador1,
      contador2: contador2,
      contador3: contador3,
      tamper: tamper,
      bateria_V: bateria_mV / 1000.0
    }
  };
}
