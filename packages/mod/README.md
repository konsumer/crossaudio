# @crossaudio/mod

This is a mod-player, based on [webaudio modplayer](https://github.com/electronoora/webaudio-mod-player) that works in browsers (with a more modern interface), by itself, or on native nodejs.

## usage

Basically, you can support whatever mod-types you want to. Other options: `PlayerProtracker` (mod) & `PlayerScreamtracker` (s3m). I only load 1, since I know I don't need the others, but you can also load all 3. You need `fetch` and `AudioContext` to be available (they are in browsers, but not node.) Use `cross-fetch` and `@crossaudio/core` to polyfill these for node, if you need that.

Here is a complete example using node:

```js
// used in node to get data
import { readFile } from 'fs/promises'

// used in node to create AudioContext
import getContext from '@crossaudio/core'

import { Modplayer, PlayerFasttracker } from 'modernmod'

// setup the players you want to support
const modplayer = new Modplayer({ xm: PlayerFasttracker })

// polyfill AudioContext and pipe it to output
modplayer.createContext(await getContext())

// load a file from bytes
modplayer.autoplay = true
await modplayer.load(await readFile('music/mysong.xm'), 'xm')
```

Here is a complete example, in a browser, using `loadUrl`:

```html
<script type="module">
import { Modplayer, PlayerFasttracker } from 'https://unpkg.com/modernmod'

const modplayer = new Modplayer({ xm: PlayerFasttracker })

// this must happen in a click handler on web
modplayer.createContext()

modplayer.autoplay = true
modplayer.loadUrl('music/tunes.xm')
</script>
```


## installation

There are quite a few ways to install it.

### npm

You can install it in your project, like this, if you use npm:

```sh
npm i @crossaudio/mod
```

Now, you can use it like this:

```js
import { Modplayer, PlayerFasttracker } from '@crossaudio/mod'
```

or this:

```js
const { Modplayer, PlayerFasttracker } = require('@crossaudio/mod')
```


### With old-school `script` tags:

```html
<script src="https://unpkg.com/@crossaudio/mod"></script>
```

Now, you have `Modplayer`, `PlayerFasttracker`, `PlayerProtracker`, `PlayerScreamtracker` in your global context (`window`.)


### browser es6 module

```html
<script type="importmap">
{
  "imports": {
    "@crossaudio/mod": "https://unpkg.com/modernmod"
  }
}
</script>
<script type="module">
import { Modplayer, PlayerFasttracker } from '@crossaudio/mod'
</script>
```
