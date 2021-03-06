/* global Audio */

import emitonoff from 'emitonoff'
import getContext from '@crossaudio/context'

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
  const context = await getContext()
  synth(context, params)
  context.resume()
}
