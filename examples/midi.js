// polyphonic example
// run with crossaudio midi.js --note=note

import WebAudioScheduler from 'web-audio-scheduler'

class Voice {
  constructor(note, context, gain) {
    this.vco = context.createOscillator()
    this.vco.frequency.value = 440 * Math.pow(2, (note - 69) / 12)

    const vca = context.createGain()
    vca.gain.value = gain

    this.vco.connect(vca)
    vca.connect(context.destination)
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
      active_voices[note] = new Voice(note, context, velocity / 127 / 4)
    } else {
      if (active_voices[note]) {
        active_voices[note].stop()
        delete active_voices[note]
      }
    }
    console.log(active_voices)
  })
}
