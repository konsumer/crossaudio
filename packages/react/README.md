# crossaudio react

This will allow you to use [crossaudio](https://www.npmjs.com/package/@crossaudio/core) more easily in react.

## install

- You can get a quick template-project with `npm init crossaudio -- -t react`
- You can install it in your project with `npm i @crossaudio/react`.


## use

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

See [Getting Started](https://github.com/konsumer/crossaudio/wiki/Getting-Started) to quickly get up to speed.

You can see an example of [react-piano](https://www.npmjs.com/package/react-piano) sending note messages [here](https://github.com/konsumer/crossaudio/blob/main/packages/create/templates/main.jsx). That's the demo file that is included if you run `npm init crossaudio` and choose a react project.

Check out [useMidi](https://www.npmjs.com/package/@react-midi/hooks). You can hook this up to a synth to use midi hardware.