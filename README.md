# crossaudio

A browser (and react) & native way to make synthesizers in javascript using an an [audio context](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext).

# WIP

This is a work-in-progress. It's getting close to "ready for use", but there still might be some rough edges. Check back to see how it fills in.

## motivation

I wanted a frontend & backend library I can use to run an "instrument" written in javascript or wasm, so I could make custom headless (or hardware UI, like LCD and rotary-encoders attached to a pi) synths, and also make a web-based emulator that will run them. It takes some inspiration from react & [elementary](https://www.elementary.audio/). At it's core, it uses [web-audio-engine](https://www.npmjs.com/package/web-audio-engine), so it uses a fairly simple and unmodified web audio API. In the browser, it uses the regular [audio context](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext), elsewhere, it uses native audio.

## getting started


There are READMEs in all the sub-projects:

- [core](./packages/core)
- [cli](./packages/cli)
- [react](./packages/react)
- [bargraph](./packages/bargraph)
- [oscilloscope](./packages/oscilloscope)
- [spectrograph](./packages/spectrograph)


See [Getting Started](https://github.com/konsumer/crossaudio/wiki/Getting-Started) to quickly get up to speed.

The quick gist:

```sh
npm init crossaudio myproject
cd myproject
npm start
```


## development

If you are developing on crossaudio packages, it is managed with [lerna](https://lerna.js.org/).

```sh
git clone git@github.com:konsumer/crossaudio.git
cd crossaudio
npm i
```

I have `./node_modules/.bin/` in my path, so local commands work, but you might have to globally install lerne, or reference the full path.

You can add new dependencies to one or all packages:

```sh
lerna add PACKAGE
lerna add PACKAGE --scope @crossaudio/core
```

You can publish all packages with `lerna publish`

I made a couple of shortcuts for messing with the doc-site:

```sh
# run a watching local dev-server
npm start

# build & deploy the doc-site
npm run deploy

```

## TODO

- write more instruments
- make a rust wasm instrument
- get audio-input working: use a `start` sort of function on audio-context to start listening
- get offline rendering working
- write viz for webgl to use in plain threejs, react-three-fiber and node-webgl. [this](https://medium.com/@mag_ops/music-visualiser-with-three-js-web-audio-api-b30175e7b5ba) looks like a cool demo to play with
- write some sort of CLI viz
- finish emulator for pi hardware
- flesh out docs, completely
- make proper website with react demo
- add more codecs (only supports wav)
- use [webmidi](https://github.com/djipco/webmidi/tree/develop) to normalize midi on local/browser
- autopublish everything via github actions (build & publish page, all npm module, etc)
- Confirm making current dir a project in `create` and add `--yes` option to not prompt
 
