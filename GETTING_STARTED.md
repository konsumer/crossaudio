# Getting Started

This is meant to be a simple tutorial on getting started with [crossaudio](https://github.com/konsumer/crossaudio).


## first setup your project

If you are making a CLI synth, there is a nice create-crossaudio-cli package, so you can do this:

```sh
npm init crossaudio-cli myproject
cd myproject
```

If you are making a react app, I recommned just adding stuff to however you do that:

```sh
# here is one way, that uses webpack
npx create-react-app myproject

# here is another way that uses vite, which I prefer
npm init vite@latest myproject -- --template react


# once that is setup, add the lib
cd myproject
npm i @crossaudio/react
```

In either type of project, I add this to my package.json, so I can use the new ES6 module syntax (in latest nodejs.):

```json
{
  "type": "module"
}
```

If you intend to do any sequencing, you should also install [web-audio-scheduler](http://mohayonao.github.io/web-audio-scheduler/) and any other web-audio based tools (there are a ton on npm, search for "webaudio".) There are a ton of building-blocks in [web-audio-components](https://github.com/web-audio-components).

## make your first synth

The basic idea is to emualate the [web audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), if it's native. This allows you to use the same synth code everywhere.

The basic structure is `function(context, params)` where `context` is an audio-context and `params` is a special reactive object (so synth can subscribe to changes.) I have made a few [examples](https://github.com/konsumer/crossaudio/examples).

Here is a minimal, but complete synth that will make a sine-wave that randomly changes frequency:

```js
import { play, Params } from '@crossaudio/core'

function synth(context, params) {
  // make an oscillator
  const vco = context.createOscillator()
  vco.frequency.value = params.frequency
  vco.start()
  
  // respond to chnages of frequency
  params.on('frequency', newFrequency => {
    vco.frequency.value = newFrequency
  })

  // connect oscillator to output
  vco.connect(context.destination)
}

// setup initial params
const p = new Params({
  frequency: 440
})

// periodically update the frequency param, every second
setInterval(() =>  {
  p.frequency = 65 + (Math.random() * 800
}, 1000)

play(synth, p)
```

You can run this with `node synth.js`.

If you have a look at the [examples](https://github.com/konsumer/crossaudio/examples), I don't setup the `play()` part or `params` since they are meant to run in other things. An example of the same thing (without the random frequency part) using `crossaudio` runtime would look like this:

```js

// this converts 0-127 into midi frequency tables, similar to puredata's mtof
function mtof(value) {
  return 440 * Math.pow(2, (value - 69) / 12)
}

export default function synth(context, params) {
  // make an oscillator
  const vco = context.createOscillator()
  vco.frequency.value = mtof(params.frequency)
  vco.start()
  
  // respond to chnages of frequency
  params.on('frequency', newFrequency => {
    vco.frequency.value = mtof(newFrequency)
  })

  // connect oscillator to output
  vco.connect(context.destination)
}
```

You could then run this with frequency bound to MIDI CC1, like this:

```sh
crossaudio synth.js --frequency=1
```

If you wanted a standalone synth that can sequence it's own random MIDI notes, see the [sines example](https://github.com/konsumer/crossaudio/examples/sines.js) which uses [web-audio-scheduler](http://mohayonao.github.io/web-audio-scheduler/) to schedule random notes.

If you want to see a similar thing, but inside a polyphonic MIDI wrapper, that listens to note on/off, see [midi example](https://github.com/konsumer/crossaudio/examples/midi.js). This will expand the number of running oscillator voices to match the number of keys pressed down, so you can play chords and stuff.

For a web-only version that uses canvas to create a spectrograph, check out [spectrograph example](https://github.com/konsumer/crossaudio/examples/spectrograph.html)