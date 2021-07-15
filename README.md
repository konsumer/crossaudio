# crossaudio

I wanted a frontend & backend library I can use to run an "instrument" written in javascript or wasm, so I could make custom headless (or hardware UI, like LCD and rotary-encoders) synths on a pi, and also make a web-based emulator that will run them. It takes some inspiration from react & [elementary](https://www.elementary.audio/). At it's core, it uses [web-audio-engine](https://www.npmjs.com/package/web-audio-engine), so it uses a fairly simple and unmodified web audio API. In the browser, it uses the web-api, elsewhere, it uses native audio.

# WIP

This is a work-in-progress. It's not close to done. Check back to see how it fills in.

## usage

In web, react, or local headless context, you can use whatever other modules you like. Look in [examples/](./examples) for example-synths.

You can use it as a CLI tool:

```
npx crossaudio yourfile.js
```

or

```sh
npm i -g crossaudio
crossaudio yourfile.js
```

Any params you use (other than `help` and `version`, which are reserved) will be turned into params to your synth. For example, this will hit your synth with `cutoff` when CC #74 comes in, and `resonance` on #71.

```sh
crossaudio file.js --cutoff=74 --resonance=71
```

Instead of a number, you can use `note` and `gate`, which will send midi note info.

```sh
crossaudio file.js --mygate=gate --mynote=note
```


You can use it on a web or non-web project, if you `npm i crossaudio`:

```js
import { play, Params } from '@crossaudio/core'
import mySynth from './synths/synth1'

// these can be whatever you want, but they need a default value, and keys shouldn't be added/removed
const params = new Params({
  cutoff: 48,
  resonance: 0
})

// play the synth
play(mySynth, params)
```

### react

I made a [react context](https://reactjs.org/docs/context.html), so you can build a cool UI in react, and access the synth (to set params) very easily:

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

## TODO

- finish basic CLI & lib that can run synths
- improve stream-flow, so it's simpler to setup streams that can react to input changes. This might involve [rxjs](https://github.com/ReactiveX/rxjs)
- publish on npm
- create react demo on `gh-pages`
- write more instruments, especially that use input
- make a rust wasm instruments
- get audio-input working
- write viz for webgl to use in plain threejs, react-three-fiber and node-webgl. [this](https://medium.com/@mag_ops/music-visualiser-with-three-js-web-audio-api-b30175e7b5ba) looks like a cool demo to play with
- write some sort of CLI viz
- finish emulator for pi hardware
- flesh out docs, completely
- make proper website
