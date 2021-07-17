import React from 'react'
import ReactDOM from 'react-dom'
import { CrossAudioProvider } from '@crossaudio/react'

import './index.css'
import App from './App.mdx'
import synth from './synth'

ReactDOM.render(
  <React.StrictMode>
    <CrossAudioProvider synth={synth} params={{ cutoff: 48, resonance: 0, power: false, note: 48 }}>
      <App />
    </CrossAudioProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
