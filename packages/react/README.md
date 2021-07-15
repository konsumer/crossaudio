# crossaudio react

This will allow you to use [crossaudio](https://www.npmjs.com/package/@crossaudio/core) more easily in react.


```jsx
import React, { useEffect, useState } from 'react'
import { render } from 'react-dom'
import { CrossAudioProvider, useCrossAudio } from '@crossaudio/react'
import mySynth from './synths/synth1'

const MyCoolSynthUI = () => {
  const [params, setParams] = useCrossAudio()
  const handleChange = name => e => setParams({ ...params, [name]: e.target.value })

  return (
    <div>
      <input type='range' min='1' max='88' onChange={handleChange('cutoff')} value={params.cutoff} />
      <input
        type='range'
        min='0'
        max='100'
        onChange={handleChange('resonance')}
        value={params.resonance}
      />
    </div>
  )
}

render(
  document.getElementById('app'),
  <CrossAudioProvider synth={mySynth} params={{  cutoff: 48, resonance: 0 }}>
    <MyCoolSynthUI />
  </CrossAudioProvider>
)
```

For more information about how these synthesizers work, see [crossaudio](https://www.npmjs.com/package/@crossaudio/core).