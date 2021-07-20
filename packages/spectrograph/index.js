/* global AudioWorkletProcessor, registerProcessor, AudioWorkletNode */

export class SpectrographProcessor extends AudioWorkletProcessor {
  process (inputs, outputs, parameters) {
    console.log({ inputs, outputs, parameters })
    return true
  }
}

registerProcessor('crossaudio-spectrograph-processor', SpectrographProcessor)

export class Spectrograph extends AudioWorkletNode {
  constructor (audioContext, canvasContext) {
    super(audioContext, 'crossaudio-spectrograph-processor')
    this.canvasContext = canvasContext
  }
}
