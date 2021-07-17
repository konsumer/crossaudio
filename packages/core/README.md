# crossaudio

This is a little runtime to make building synthesizers in javascript (native, and on the web) fun & easy. It runs on the web and locally (not in a browser.)

## install

- You can get a quick template-project with `npm init crossaudio`
- You can install it in your project with `npm i @crossaudio/core`.
- You can use [the crossaudio CLI](https://www.npmjs.com/package/crossaudio)
- You can use [the react lib](https://www.npmjs.com/package/@crossaudio/react)


## usage

## how to make synths

Essentially, you make a function that takes [an audio context](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) and a reactive set of paramaters, and the synth can respond to changes. There are some [examples](https://github.com/konsumer/crossaudio/tree/master/examples).

The basic flow is this:

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

and your synth might look like this:

```js
function mtof(value) {
  return 440 * Math.pow(2, (value - 69) / 12)
}

export default (context, params) => {
  const vco = context.createOscillator()
  vco.frequency.value = mtof(params.cutoff)
  vco.start()
  
  const vcf = biquadFilter = audioCtx.createBiquadFilter()
  vcf.type = 'lowpass'
  vcf.frequency.value = mtof(params.cutoff)
  vcf.q.value = params.resonance
  
  params.on('cutoff', value => {
    vcf.frequency.value = mtof(value)
  })
  
  params.on('resonance', value => {
     vcf.q.value = value
  })

  vco.connect(vcf)
  vcf.connect(context.destination)
}
```

See [Getting Started](https://github.com/konsumer/crossaudio/wiki/Getting-Started) to quickly get up to speed.