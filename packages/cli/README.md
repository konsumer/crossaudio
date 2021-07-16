# crossaudio CLI

This is a little runtime to make building synthesizers in javascript (native, not on web) fun & easy.

## install

- You can run it without installing with `npx crossaudio`.
- You can install it in your project with `npm i crossaudio`.
- You can install it globally with `npm i -g crossaudio`.

## use

Any params you use (other than `help` and `version`, which are reserved) will be turned into params to your synth. For example, this will hit your synth with `cutoff` when CC #74 comes in, and `resonance` on #71.

```sh
crossaudio file.js --cutoff=74 --resonance=71
```

Instead of a number, you can use `note`, which will send midi note info.

```sh
crossaudio file.js --mynote=note
```

For more information about how these synthesizers work, see [crossaudio](https://www.npmjs.com/package/@crossaudio/core).

See [Getting Started](https://github.com/konsumer/crossaudio/wiki/Getting-Started) to quickly get up to speed.