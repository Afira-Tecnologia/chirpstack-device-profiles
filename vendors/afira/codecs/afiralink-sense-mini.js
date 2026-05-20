function decodeUplink(input) {
    var b = input.bytes;
    var i = 0;

    // temperatura (signed int16)
    var t_raw = (b[i++] << 8) | b[i++];
    if (t_raw > 32767) {
        t_raw -= 65536;
    }
    var temperatura = t_raw / 100.0;

    // umidade (uint16)
    var h_raw = (b[i++] << 8) | b[i++];
    var umidade = h_raw / 10.0;

    // tensão bateria (uint16)
    var v_raw = (b[i++] << 8) | b[i++];
    var tensao = v_raw / 1000.0;

    return {
        data: {
            temperatura: temperatura,
            umidade: umidade,
            tensao: tensao
        }
    };
}