// TODO: add support for deno & quickjs, too

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node

// cross-platform audio-context
export default async function getContext (input) {
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

    context.pipe(aio)
    aio.start()
  } else {
    context = new globalThis.AudioContext()
  }
  return context
}
