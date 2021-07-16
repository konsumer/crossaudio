# crossaudio

I wanted a frontend & backend library I can use to run an "instrument" written in javascript or wasm, so I could make custom headless (or hardware UI, like LCD and rotary-encoders) synths on a pi, and also make a web-based emulator that will run them. It takes some inspiration from react & [elementary](https://www.elementary.audio/). At it's core, it uses [web-audio-engine](https://www.npmjs.com/package/web-audio-engine), so it uses a fairly simple and unmodified web audio API. In the browser, it uses the web-api, elsewhere, it uses native audio.

# WIP

This is a work-in-progress. It's not close to done. Check back to see how it fills in.


There are READMEs in all the sub-projects:

- [core](./packages/core)
- [cli](./packages/cli)
- [react](./packages/react)


## TODO

- create react demo on `gh-pages`
- write more instruments
- make a rust wasm instrument
- get audio-input working
- write viz for webgl to use in plain threejs, react-three-fiber and node-webgl. [this](https://medium.com/@mag_ops/music-visualiser-with-three-js-web-audio-api-b30175e7b5ba) looks like a cool demo to play with
- write some sort of CLI viz
- finish emulator for pi hardware
- flesh out docs, completely
- make proper website
- use [webmidi](https://github.com/djipco/webmidi/tree/develop) to normalize midi on local/browser
