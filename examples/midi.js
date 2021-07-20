// polyphonic example
// run with crossaudio midi.js --note=note

class Voice {
  constructor (note, context, gain) {
    this.vco = context.createOscillator()
    this.vco.frequency.value = 48 * Math.pow(2, (note - 69) / 12)

    const vca = context.createGain()
    vca.gain.value = gain

    this.vco.connect(vca)
    vca.connect(context.destination)
    this.vco.start(0)
  }

  stop () {
    this.vco.stop()
  }
}

export default (context, params) => {
  const activeVoices = {}

  params.on('note', ({ note, velocity, type }) => {
    if (type === 'noteon') {
      activeVoices[note] = new Voice(note, context, velocity / 127 / 4)
    } else {
      if (activeVoices[note]) {
        activeVoices[note].stop()
        delete activeVoices[note]
      }
    }
    console.log(activeVoices)
  })
}
