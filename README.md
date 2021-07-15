# crossaudio

I wanted a frontend & backend library I can use to run an "instrument" written in javascript or wasm, so I could make custom headless (or hardware UI, like LCD and rotary-encoders) synths on a pi, and also make a web-based emulator that will run them. It takes some inspiration from react & [elementary](https://www.elementary.audio/). At it's core, it uses [web-audio-engine](https://www.npmjs.com/package/web-audio-engine), so it uses a fairly simple and unmodified web audio API. In the browser, it uses the web-api, elsewhere, it uses native audio.

# WIP

This is a work-in-progress. It's not close to done. Check back to see how it fills in.


## usage

In web, react, or local headless context, you can use whatever other modules you like.

You can use it as a CLI tool:

```
npx crossaudio yourfile.js
```

or

```sh
npm i -g crossaudio
crossaudio yourfile.js
```

You can use it on a web or non-web project, if you `npm i crossaudio`:

```js
import { render } from 'crossaudio'
import runSynth from './synths/synth1'

// these can be whatever you want
const params = {
  cutoff: 48,
  resonance: 0
}

// this creates a render-loop
render(context => {
  // do what you want to params here
  // this runs in a fast loop
  runSynth(context, params)
})
```

### react

I made a [react context](https://reactjs.org/docs/context.html), so you can build a cool UI in react, and access the synth (to set params) very easily:

```jsx
import React, { useEffect, useState } from 'react'
import { render } from 'react-dom'
import { CrossAudioProvider, useCrossAudio } from 'crossaudio/react'
import runSynth from './synths/synth1'

const MyCoolSynth = () => {
  const cross = useCrossAudio()
  
  const [params, setParams] = useState({
    cutoff: 48, // C3
    resonance: 0
  })
  
  cross(context => runSynth(context, params))

  const handleChange = name => e => setParams(s => ({ ...s, [name]: e.target.value }))

  return (
    <div>
      <input type="range" min="1" max="88" onChange={handleChange('cutoff')}  />
      <input type="range" min="0" max="100" onChange={handleChange('resonance')}  />
    </div>
  )
}

render(document.getElementById('app'),
  <CrossAudioProvider>
    <MyCoolSynth />
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
