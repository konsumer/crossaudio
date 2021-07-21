import React from 'react'
import { useCrossAudio, CrossAudioProvider, Canvas } from '@crossaudio/react'
import { Spectrograph } from '@crossaudio/spectrograph'
import { Oscilloscope } from '@crossaudio/oscilloscope'
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano'
import { mtof } from './utils'

const firstNote = MidiNumbers.fromNote('c3')
const lastNote = MidiNumbers.fromNote('e4')
const keyboardConfig = KeyboardShortcuts.BOTTOM_ROW
const keyboardShortcuts = KeyboardShortcuts.create({ firstNote, lastNote, keyboardConfig })

// time in seconds, this gets rid of clicking
const attack = 0.015
const release = 0.1

// a single voice (1 per note)
class Voice {
  constructor (note, context, gain) {
    this.context = context

    this.vco = context.createOscillator()
    this.vco.frequency.value = mtof(note)
    this.vco.type = 'triangle'

    this.vca = context.createGain()
    this.vca.gain.value = 0
    this.vca.gain.setTargetAtTime(gain, context.currentTime, attack)
    this.vca.connect(context.destination)

    this.vco.start()
    this.vco.connect(this.vca)
  }

  stop () {
    this.vca.gain.setTargetAtTime(0, this.context.currentTime, release)
  }
}

// diptcher for voices
const synth = (context, params) => {
  const activeVoices = {}

  let spectrograph
  let oscope

  params.on('canvas', canvas => {
    if (canvas && !spectrograph) {
      spectrograph = new Spectrograph(context, canvas)
      spectrograph.start()
      Object.values(activeVoices).forEach(voice => {
        voice.spectrographSet = true
        voice.vca.connect(spectrograph)
      })
    }
  })

  params.on('canvas2', canvas => {
    if (canvas && !oscope) {
      oscope = new Oscilloscope(context, canvas)
      oscope.start()
      Object.values(activeVoices).forEach(voice => {
        voice.oscopeSet = true
        voice.vca.connect(oscope)
      })
    }
  })

  params.on('note', ({ note, velocity, type }) => {
    if (type === 'noteon') {
      activeVoices[note] = new Voice(note, context, velocity / 127 / 4)
      if (spectrograph && !activeVoices[note].spectrographSet) {
        activeVoices[note].spectrographSet = true
        activeVoices[note].vca.connect(spectrograph)
      }
      if (oscope && !activeVoices[note].oscopeSet) {
        activeVoices[note].oscopeSet = true
        activeVoices[note].vca.connect(oscope)
      }
    } else {
      if (activeVoices[note]) {
        activeVoices[note].stop()
      }
    }
  })
}

const DemoSynthUI = () => {
  const [params, setParams] = useCrossAudio()
  return (
    <div className='synth'>
      <span>
        <Canvas name='canvas' width={480} height={100} style={{ marginRight: 10 }} />
        <Canvas name='canvas2' width={480} height={100} />
      </span>
      <Piano
        noteRange={{ first: firstNote, last: lastNote }}
        playNote={(note) => setParams({ ...params, note: { note, velocity: 100, type: 'noteon' } })}
        stopNote={(note) => setParams({ ...params, note: { note, velocity: 0, type: 'noteoff' } })}
        width={1000}
        keyboardShortcuts={keyboardShortcuts}
      />
    </div>
  )
}

const DemoSynth = () => (
  <CrossAudioProvider synth={synth} params={{ note: undefined, canvas: undefined, canvas2: undefined }}>
    <DemoSynthUI />
  </CrossAudioProvider>
)

export default DemoSynth
