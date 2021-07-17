/* global Audio, AudioContext */

import emitonoff from 'emitonoff'

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node

// simple observable prop-store
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
export async function play (synth, params) {
  let speaker
  let context

  if (isNode) {
    const AudioContext = (await import('web-audio-engine')).StreamAudioContext
    const Speaker = await import('speaker')
    speaker = new Speaker()
    context = new AudioContext()
    context.pipe(speaker)
    context.resume()
    synth(context, params)
  } else {
    window.addEventListener('click', () => {
      context = new AudioContext()
      context.resume()
      synth(context, params)
    })
  }
}
