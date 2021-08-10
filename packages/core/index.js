/* global Audio, AudioContext */

import emitonoff from 'emitonoff'

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node

export const mtof = note => 440 * Math.pow(2, (note - 69) / 12)

// simple observable prop-store
// TOOD: add min/max/default
export class Params {
  constructor (values) {
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

  on (name, callback) {
    this.watcher.on(name, callback)
  }

  off (name, callback) {
    this.watcher.off(name, callback)
  }
}

// load an audio file into a context
export async function audioFile (context, filename) {
  if (Array.isArray(filename)) {
    return Promise.all(
      filename.map((filename) => audioFile(context, filename))
    )
  }

  if (isNode) {
    const {
      promises: { readFile }
    } = await import('fs')
    return context.decodeAudioData(await readFile(filename))
  } else {
    return context.createMediaElementSource(new Audio(filename))
  }
}

// hooks up audio and starts playing
export async function play (synth, params, input = false) {
  let context

  if (isNode) {
    const AudioContext = (await import('web-audio-engine')).StreamAudioContext
    const { AudioIO } = (await import('naudiodon'))

    const options = {
      outOptions: {
        channelCount: 1,
        sampleFormat: 16,
        sampleRate: 44100
      }
    }

    if (input) {
      options.inOptions = {
        channelCount: 1,
        sampleFormat: 16,
        sampleRate: 44100
      }
    }

    const aio = new AudioIO(options)

    context = new AudioContext()

    if (input) {
      context.mic = context.createBufferSource()
      context.mic.buffer = context.createBufferSource(1, context.sampleRate * 3, context.sampleRate)
      context.mic.start()
    }

    synth(context, params)
    context.pipe(aio)
    context.resume()
    aio.start()
  } else {
    // TODO: setup mic input
    // audio requires click to start, in browser
    window.addEventListener('click', () => {
      if (!context) {
        context = new AudioContext()
        synth(context, params)
        context.resume()
      }
    })
  }
}
