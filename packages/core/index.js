export { default as WebAudioScheduler } from 'web-audio-scheduler'

// load an audio file into a context
export const fetchAudioBuffer = async (context, filename) => {
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

// create a render-loop for audio
// TODO: I'm not sure this will actually be the interface
export const render = (synthCallback) => {}
