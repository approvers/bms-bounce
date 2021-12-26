class OggReader extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.array = options.processorOptions.array;
  }

  process(inputs, outputs, parameters) {
    this.array.forEach((channel, channelIndex) => {
      const input = inputs[inputs.length === 1 ? 0 : channelIndex];
      channel.push(...input);
    });
  }
}

registerProcessor("ogg-reader", OggReader);
