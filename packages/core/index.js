// load an audio file into a context
export const fetchAudioBuffer = async (context, filename) => {
  if (Array.isArray(filename)) {
    return Promise.all(filename.map(filename => fetchAudioBuffer(context, filename)))
  }

  if (process?.versions?.node) {
    const { promises: { readFile } } = await import('fs')
    return context.decodeAudioData(await readFile(filename))
  } else {
    return context.createMediaElementSource(new Audio(filename))
  }
}

// create a render-loop for audio
export const render = (synthCallback) => {}

// allow user to schedule (sequence) things
// see https://mohayonao.github.io/web-audio-engine/demo/
export class Scheduler