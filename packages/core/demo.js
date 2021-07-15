// I am trying to work out basic idea here

import { StreamAudioContext as AudioContext } from 'web-audio-engine'
import Speaker from 'speaker'
import WebAudioScheduler from 'web-audio-scheduler'
import emitonoff from 'emitonoff'

const mysynth = (context, params) => {
  function ticktack(e) {
    // get value from params
    console.log('ticktack:', params.cool)

    const osc = context.createOscillator()
    const amp = context.createGain()

    const t0 = e.playbackTime
    const t1 = t0 + e.args.duration
    osc.frequency.value = e.args.frequency
    osc.start(t0)
    osc.stop(t1)
    amp.gain.setValueAtTime(0.5 * e.args.amp, t0)
    amp.gain.exponentialRampToValueAtTime(1e-6, t1)

    osc.connect(amp)
    amp.connect(context.destination)
  }

  function metronome(e) {
    const t0 = e.playbackTime
    sched.insert(t0 + 0.0, ticktack, {
      frequency: 880,
      amp: 1.0,
      duration: 1.0
    })
    sched.insert(t0 + 0.5, ticktack, {
      frequency: 440,
      amp: 0.4,
      duration: 0.25
    })
    sched.insert(t0 + 1.0, ticktack, {
      frequency: 440,
      amp: 0.5,
      duration: 0.25
    })
    sched.insert(t0 + 1.5, ticktack, {
      frequency: 440,
      amp: 0.4,
      duration: 0.25
    })
    sched.insert(t0 + 2.0, metronome)
  }

  // subscribe to changes
  params.on('cool', (val) => {
    console.log('subscribe:', val)
  })

  const sched = new WebAudioScheduler({ context, timerAPI: global })
  sched.start(metronome)
}

// simple observable prop-store
class Params {
  constructor(values) {
    this.values = values
    this.watcher = emitonoff()
    Object.keys(values).forEach((name) => {
      Object.defineProperty(this, name, {
        get: () => this.values[name],
        set: (value) => {
          this.values[name] = value
          this.watcher.emit(name, value)
        }
      })
    })
  }

  on(name, callback) {
    this.watcher.on(name, callback)
  }

  off(name, callback) {
    this.watcher.off(name, callback)
  }
}

function play(synth, params) {
  const context = new AudioContext()
  const speaker = new Speaker()
  context.pipe(speaker)
  context.resume()
  synth(context, params)
}

const params = new Params({
  cool: true
})

// illustrates value changing
setInterval(() => {
  params.cool = !params.cool
}, 1000)

play(mysynth, params)
