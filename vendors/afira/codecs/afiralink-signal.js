function decodeUplink(input) {
  var bytes = input.bytes;

  var ch1_mA = ((bytes[0] << 8) | bytes[1]) / 1000.0;
  var ch2_mA = ((bytes[2] << 8) | bytes[3]) / 1000.0;

  return {
    data: {
      ch1_mA: ch1_mA,
      ch2_mA: ch2_mA
    },
    warnings: [],
    errors: []
  };
}