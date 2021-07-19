import React from 'react'
import ReactDOM from 'react-dom'
import { CrossAudioProvider, useCrossAudio } from '@crossaudio/react'
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano'
import 'react-piano/dist/styles.css'
import './style.css'
import synth from './synth'

// config for piano
const firstNote = MidiNumbers.fromNote('c3')
const lastNote = MidiNumbers.fromNote('f5')
const keyboardShortcuts = KeyboardShortcuts.create({
  firstNote: firstNote,
  lastNote: lastNote,
  keyboardConfig: KeyboardShortcuts.HOME_ROW
})

const App = () => {
  const [params, setParams] = useCrossAudio()
  return (
    <Piano
      noteRange={{ first: firstNote, last: lastNote }}
      playNote={(note) => setParams({ ...params, note: { note, velocity: 100, type: 'noteon' } })}
      stopNote={(note) => setParams({ ...params, note: { note, velocity: 0, type: 'noteoff' } })}
      width={1000}
      keyboardShortcuts={keyboardShortcuts}
    />
  )
}

ReactDOM.render(
  <React.StrictMode>
    <CrossAudioProvider synth={synth} params={{ note: undefined }}>
      <App />
    </CrossAudioProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
