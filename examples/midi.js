// polyphonic example
// run with crossaudio midi.js --note=note

import WebAudioScheduler from 'web-audio-scheduler'

class Voice {
  constructor(note, context) {
    this.note = note
    this.frequency = 440 * Math.pow(2, (note - 69) / 12)
    this.context = context
  }

  start(gain) {
    this.vco = this.context.createOscillator()
    this.vco.type = this.vco.SINE
    this.vco.frequency.value = this.frequency

    var vca = this.context.createGain()
    vca.gain.value = gain

    this.vco.connect(vca)
    vca.connect(this.context.destination)

    this.vco.start(0)
  }

  stop() {
    this.vco.stop()
  }
}

export default (context, params) => {
  const active_voices = {}

  params.on('note', ({ note, velocity, type }) => {
    if (type === 'noteon') {
      active_voices[note] = new Voice(note, context)
      active_voices[note].start(velocity / 127)
    } else {
      if (active_voices[note]) {
        active_voices[note].stop()
      }
    }
  })
}
