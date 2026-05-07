function decodeUplink(input) {
    var b = input.bytes;
    var i = 0;

    var t  = ((b[i++] << 8) | b[i++]) / 100.0;
    var h  = ((b[i++] << 8) | b[i++]) / 10.0;
    
    var te_raw = (b[i] << 8) | b[i+1]; i += 2;
    // converte para int16 signed
    if (te_raw > 0x7FFE) te_raw = null;  // sentinel = NAN
    else if (te_raw > 32767) te_raw = te_raw - 65536;
    var te = te_raw !== null ? te_raw / 10.0 : null;

    var v  = ((b[i++] << 8) | b[i++]) / 1000.0;
    var r  = b[i++];

    return {
        data: {
            temperatura:       t,
            umidade:           h,
            temperatura_pt100: te,
            tensao:            v,
            reed:              r
        }
    };
}