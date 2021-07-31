/* global Audio, AudioContext */

// inlining this for less deps
const emitonoff = function (thing) {
  if (!thing) thing = {}

  thing._subs = []
  thing._paused = false
  thing._pending = []

  /**
   * Sub of pubsub
   * @param  {String}   name name of event
   * @param  {Function} cb   your callback
   */
  thing.on = function (name, cb) {
    thing._subs[name] = thing._subs[name] || []
    thing._subs[name].push(cb)
  }

  /**
   * Remove sub of pubsub
   * @param  {String}   name name of event
   * @param  {Function} cb   your callback
   */
  thing.off = function (name, cb) {
    if (!thing._subs[name]) return
    for (const i in thing._subs[name]) {
      if (thing._subs[name][i] === cb) {
        thing._subs[name].splice(i, 1)
        break
      }
    }
  }

  /**
   * Pub of pubsub
   * @param  {String}   name name of event
   * @param  {Mixed}    data the data to publish
   */
  thing.emit = function (name) {
    if (!thing._subs[name]) return

    const args = Array.prototype.slice.call(arguments, 1)

    if (thing._paused) {
      thing._pending[name] = thing._pending[name] || []
      thing._pending[name].push(args)
      return
    }

    for (const i in thing._subs[name]) {
      thing._subs[name][i].apply(thing, args)
    }
  }

  return thing
}

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
export async function play (synth, params, autostart = true) {
  let speaker
  let context
  let clicked = false

  if (isNode) {
    const AudioContext = (await import('web-audio-engine')).StreamAudioContext
    const Speaker = (await import('speaker')).default
    speaker = new Speaker()
    context = new AudioContext()
    context.pipe(speaker)
    if (autostart) {
      context.resume()
    }
    synth(context, params)
  } else {
    context = new AudioContext()
    synth(context, params)

    // audio requires click to start, in browser
    window.addEventListener('click', () => {
      if (!clicked) {
        clicked = true
        context.resume()
      }
    })
  }
}
