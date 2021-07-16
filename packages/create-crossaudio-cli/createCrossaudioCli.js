const { exec } = require('child_process')
const { mkdir, writeFile } = require('fs').promises

//TODO: add fancy CLI option-parsing:
// https://github.com/facebook/create-react-app/blob/main/packages/create-react-app/createReactApp.js#L55

const synthTemplate = `
// polyphonic sinewave
// run with crossaudio --note=note ./src/synth.js

import WebAudioScheduler from 'web-audio-scheduler'

class Voice {
  constructor(note, context, gain) {
    this.vco = context.createOscillator()
    this.vco.frequency.value = 440 * Math.pow(2, (note - 69) / 12)

    const vca = context.createGain()
    vca.gain.value = gain

    this.vco.connect(vca)
    vca.connect(context.destination)
    this.vco.start(0)
  }

  stop() {
    this.vco.stop()
  }
}

export default (context, params) => {
  const active_voices = {}

  params.on('note', ({ note, velocity, type }) => {
    if (type === 'noteon') {
      active_voices[note] = new Voice(note, context, velocity / 127 / 4)
    } else {
      if (active_voices[note]) {
        active_voices[note].stop()
        delete active_voices[note]
      }
    }
    console.log(active_voices)
  })
}
`

async function init() {
  console.log('Creating a Crossaudio CLI application...')
  exec(
    'npm install --no-audit --save --save-exact --loglevel error crossaudio @crossaudio/core'
  )

  const pkg = require('./package.json')
  pkg.type = 'module'
  pkg.scripts = {
    start: 'crossaudio --note=note ./src/synth.js'
  }
  await writeFile('package.json', JSON.stringify(pkg, null, 2))

  await mkdir('src')
  writeFile('./src/synth.js', synthTemplate)
}

module.exports = { init }
