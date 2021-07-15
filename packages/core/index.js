import { StreamAudioContext as AudioContext } from 'web-audio-engine'
import Speaker from 'speaker'
import emitonoff from 'emitonoff'

export { default as WebAudioScheduler } from 'web-audio-scheduler'

// simple observable prop-store
export class Params {
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

// load an audio file into a context
export async function fetchAudioBuffer(context, filename) {
  if (Array.isArray(filename)) {
    return Promise.all(
      filename.map((filename) => fetchAudioBuffer(context, filename))
    )
  }

  if (process?.versions?.node) {
    const {
      promises: { readFile }
    } = await import('fs')
    return context.decodeAudioData(await readFile(filename))
  } else {
    return context.createMediaElementSource(new Audio(filename))
  }
}

// hooks up audio and
function play(synth, params) {
  const context = new AudioContext()
  const speaker = new Speaker()
  context.pipe(speaker)
  context.resume()
  synth(context, params)
}
