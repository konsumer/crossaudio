/*
  (c) 2012-2021 Noora Halme et al. (see AUTHORS)

  This code is licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

  Front end wrapper class for format-specific players

  https://github.com/electronoora/webaudio-mod-player
*/

/* global fetch, AudioContext */

// TODO: gross globals
let i, p, t

// helper functions for picking up signed, unsigned, little endian, etc from an unsigned 8-bit buffer
function leWord (buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8)
}
function leDword (buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24)
}
function sByte (buffer, offset) {
  return (buffer[offset] < 128) ? buffer[offset] : (buffer[offset] - 256)
}
function sLeWord (buffer, offset) {
  return (leWord(buffer, offset) < 32768) ? leWord(buffer, offset) : (leWord(buffer, offset) - 65536)
}

// convert from MS-DOS extended ASCII to Unicode
function dos2utf (c) {
  if (c < 128) return String.fromCharCode(c)
  const cs = [
    0x00c7, 0x00fc, 0x00e9, 0x00e2, 0x00e4, 0x00e0, 0x00e5, 0x00e7, 0x00ea, 0x00eb, 0x00e8, 0x00ef, 0x00ee, 0x00ec, 0x00c4, 0x00c5,
    0x00c9, 0x00e6, 0x00c6, 0x00f4, 0x00f6, 0x00f2, 0x00fb, 0x00f9, 0x00ff, 0x00d6, 0x00dc, 0x00f8, 0x00a3, 0x00d8, 0x00d7, 0x0192,
    0x00e1, 0x00ed, 0x00f3, 0x00fa, 0x00f1, 0x00d1, 0x00aa, 0x00ba, 0x00bf, 0x00ae, 0x00ac, 0x00bd, 0x00bc, 0x00a1, 0x00ab, 0x00bb,
    0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x00c1, 0x00c2, 0x00c0, 0x00a9, 0x2563, 0x2551, 0x2557, 0x255d, 0x00a2, 0x00a5, 0x2510,
    0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x00e3, 0x00c3, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x00a4,
    0x00f0, 0x00d0, 0x00ca, 0x00cb, 0x00c8, 0x0131, 0x00cd, 0x00ce, 0x00cf, 0x2518, 0x250c, 0x2588, 0x2584, 0x00a6, 0x00cc, 0x2580,
    0x00d3, 0x00df, 0x00d4, 0x00d2, 0x00f5, 0x00d5, 0x00b5, 0x00fe, 0x00de, 0x00da, 0x00db, 0x00d9, 0x00fd, 0x00dd, 0x00af, 0x00b4,
    0x00ad, 0x00b1, 0x2017, 0x00be, 0x00b6, 0x00a7, 0x00f7, 0x00b8, 0x00b0, 0x00a8, 0x00b7, 0x00b9, 0x00b3, 0x00b2, 0x25a0, 0x00a0
  ]
  return String.fromCharCode(cs[c - 128])
}

function Modplayer (players) {
  this.supportedformats = Object.keys(players)

  this.url = ''
  this.format = 's3m'

  this.state = 'initializing..'
  this.request = null

  this.loading = false
  this.playing = false
  this.paused = false
  this.repeat = false

  this.separation = 1
  this.mixval = 8.0

  this.amiga500 = false

  this.filter = false
  this.endofsong = false

  this.autostart = false
  this.bufferstodelay = 4 // adjust this if you get stutter after loading new song
  this.delayfirst = 0
  this.delayload = 0

  this.onReady = function () {}
  this.onPlay = function () {}
  this.onStop = function () {}

  this.buffer = 0
  this.mixerNode = 0
  this.context = null
  this.samplerate = 44100
  this.bufferlen = 4096

  this.chvu = new Float32Array(32)

  // format-specific player
  this.player = null
  this.players = players

  // read-only data from player class
  this.title = ''
  this.signature = '....'
  this.songlen = 0
  this.channels = 0
  this.patterns = 0
  this.samplenames = []
}

// load module from bytes
Modplayer.prototype.load = async function (buffer, ext) {
  // try to identify file format from url and create a new
  // player class for it
  this.format = ext

  switch (ext) {
    case 'mod':
      this.player = new Protracker()
      break
    case 's3m':
      this.player = new Screamtracker()
      break
    case 'xm':
      this.player = new Fasttracker()
      break
  }

  this.player.onReady = this.loadSuccess

  this.state = 'loading..'

  this.loading = true
  const asset = this

  this.state = 'parsing..'
  if (asset.player.parse(new Uint8Array(buffer))) {
    // copy static data from player
    asset.title = asset.player.title
    asset.signature = asset.player.signature
    asset.songlen = asset.player.songlen
    asset.channels = asset.player.channels
    asset.patterns = asset.player.patterns
    asset.filter = asset.player.filter
    if (asset.context) asset.setfilter(asset.filter)
    asset.mixval = asset.player.mixval // usually 8.0, though
    asset.samplenames = new Array(32)
    for (i = 0; i < 32; i++) asset.samplenames[i] = ''
    if (asset.format == 'xm' || asset.format == 'it') {
      for (i = 0; i < asset.player.instrument.length; i++) asset.samplenames[i] = asset.player.instrument[i].name
    } else {
      for (i = 0; i < asset.player.sample.length; i++) asset.samplenames[i] = asset.player.sample[i].name
    }

    asset.state = 'ready.'
    asset.loading = false
    asset.onReady()
    if (asset.autostart) asset.play()
  } else {
    asset.state = 'error!'
    asset.loading = false
  }

  return true
}

// load module from url into local buffer
Modplayer.prototype.loadUrl = async function (url) {
  this.url = url
  const ext = url.split('.').pop().toLowerCase().trim()
  const buffer = await fetch(url).then(r => r.arrayBuffer())
  return this.load(buffer, ext)
}

// play loaded and parsed module with webaudio context
Modplayer.prototype.play = function () {
  if (this.loading) return false
  if (this.player) {
    if (this.context == null) this.createContext()
    this.player.samplerate = this.samplerate
    if (this.context) this.setfilter(this.player.filter)

    if (this.player.paused) {
      this.player.paused = false
      return true
    }

    this.endofsong = false
    this.player.endofsong = false
    this.player.paused = false
    this.player.initialize()
    this.player.flags = 1 + 2
    this.player.playing = true
    this.playing = true

    this.chvu = new Float32Array(this.player.channels)
    for (i = 0; i < this.player.channels; i++) this.chvu[i] = 0.0

    this.onPlay()

    this.player.delayfirst = this.bufferstodelay
    return true
  } else {
    return false
  }
}

// pause playback
Modplayer.prototype.pause = function () {
  if (this.player) {
    if (!this.player.paused) {
      this.player.paused = true
    } else {
      this.player.paused = false
    }
  }
}

// stop playback
Modplayer.prototype.stop = function () {
  this.paused = false
  this.playing = false
  if (this.player) {
    this.player.paused = false
    this.player.playing = false
    this.player.delayload = 1
  }
  this.onStop()
}

// stop playing but don't call callbacks
Modplayer.prototype.stopaudio = function (st) {
  if (this.player) {
    this.player.playing = st
  }
}

// jump positions forward/back
Modplayer.prototype.jump = function (step) {
  if (this.player) {
    this.player.tick = 0
    this.player.row = 0
    this.player.position += step
    this.player.flags = 1 + 2
    if (this.player.position < 0) this.player.position = 0
    if (this.player.position >= this.player.songlen) this.stop()
  }
  this.position = this.player.position
  this.row = this.player.row
}

// set whether module repeats after songlen
Modplayer.prototype.setrepeat = function (rep) {
  this.repeat = rep
  if (this.player) this.player.repeat = rep
}

// set stereo separation mode (0=standard, 1=65/35 mix, 2=mono)
Modplayer.prototype.setseparation = function (sep) {
  this.separation = sep
  if (this.player) this.player.separation = sep
}

// set autostart to play immediately after loading
Modplayer.prototype.setautostart = function (st) {
  this.autostart = st
}

// set amiga model - changes lowpass filter state
Modplayer.prototype.setamigamodel = function (amiga) {
  if (amiga == '600' || amiga == '1200' || amiga == '4000') {
    this.amiga500 = false
    if (this.filterNode) this.filterNode.frequency.value = 22050
  } else {
    this.amiga500 = true
    if (this.filterNode) this.filterNode.frequency.value = 6000
  }
}

// amiga "LED" filter
Modplayer.prototype.setfilter = function (f) {
  if (f) {
    this.lowpassNode.frequency.value = 3275
  } else {
    this.lowpassNode.frequency.value = 28867
  }
  this.filter = f
  if (this.player) this.player.filter = f
}

// are there E8x sync events queued?
Modplayer.prototype.hassyncevents = function () {
  if (this.player) return (this.player.syncqueue.length != 0)
  return false
}

// pop oldest sync event nybble from the FIFO queue
Modplayer.prototype.popsyncevent = function () {
  if (this.player) return this.player.syncqueue.pop()
}

// ger current pattern number
Modplayer.prototype.currentpattern = function () {
  if (this.player) return this.player.patterntable[this.player.position]
}

// get current pattern in standard unpacked format (note, sample, volume, command, data)
// note: 254=noteoff, 255=no note
// sample: 0=no instrument, 1..255=sample number
// volume: 255=no volume set, 0..64=set volume, 65..239=ft2 volume commands
// command: 0x2e=no command, 0..0x24=effect command
// data: 0..255
Modplayer.prototype.patterndata = function (pn) {
  let i, c, patt
  if (this.format == 'mod') {
    patt = new Uint8Array(this.player.pattern_unpack[pn])
    for (i = 0; i < 64; i++) {
      for (c = 0; c < this.player.channels; c++) {
        if (patt[i * 5 * this.channels + c * 5 + 3] == 0 && patt[i * 5 * this.channels + c * 5 + 4] == 0) {
          patt[i * 5 * this.channels + c * 5 + 3] = 0x2e
        } else {
          patt[i * 5 * this.channels + c * 5 + 3] += 0x37
          if (patt[i * 5 * this.channels + c * 5 + 3] < 0x41) patt[i * 5 * this.channels + c * 5 + 3] -= 0x07
        }
      }
    }
  } else if (this.format == 's3m') {
    patt = new Uint8Array(this.player.pattern[pn])
    for (i = 0; i < 64; i++) {
      for (c = 0; c < this.player.channels; c++) {
        if (patt[i * 5 * this.channels + c * 5 + 3] == 255) patt[i * 5 * this.channels + c * 5 + 3] = 0x2e
        else patt[i * 5 * this.channels + c * 5 + 3] += 0x40
      }
    }
  } else if (this.format == 'xm') {
    patt = new Uint8Array(this.player.pattern[pn])
    for (i = 0; i < this.player.patternlen[pn]; i++) {
      for (c = 0; c < this.player.channels; c++) {
        if (patt[i * 5 * this.channels + c * 5 + 0] < 97) { patt[i * 5 * this.channels + c * 5 + 0] = (patt[i * 5 * this.channels + c * 5 + 0] % 12) | (Math.floor(patt[i * 5 * this.channels + c * 5 + 0] / 12) << 4) }
        if (patt[i * 5 * this.channels + c * 5 + 3] == 255) patt[i * 5 * this.channels + c * 5 + 3] = 0x2e
        else {
          if (patt[i * 5 * this.channels + c * 5 + 3] < 0x0a) {
            patt[i * 5 * this.channels + c * 5 + 3] += 0x30
          } else {
            patt[i * 5 * this.channels + c * 5 + 3] += 0x41 - 0x0a
          }
        }
      }
    }
  }
  return patt
}

// check if a channel has a note on
Modplayer.prototype.noteon = function (ch) {
  if (ch >= this.channels) return 0
  return this.player.channel[ch].noteon
}

// get currently active sample on channel
Modplayer.prototype.currentsample = function (ch) {
  if (ch >= this.channels) return 0
  if (this.format == 'xm' || this.format == 'it') return this.player.channel[ch].instrument
  return this.player.channel[ch].sample
}

// get length of currently playing pattern
Modplayer.prototype.currentpattlen = function () {
  if (this.format == 'mod' || this.format == 's3m') return 64
  return this.player.patternlen[this.player.patterntable[this.player.position]]
}

// create the web audio context
Modplayer.prototype.createContext = function (context = new AudioContext()) {
  this.context = context
  this.samplerate = this.context.sampleRate
  this.bufferlen = (this.samplerate > 44100) ? 4096 : 2048

  // Amiga 500 fixed filter at 6kHz. WebAudio lowpass is 12dB/oct, whereas
  // older Amigas had a 6dB/oct filter at 4900Hz.
  this.filterNode = this.context.createBiquadFilter()
  if (this.amiga500) {
    this.filterNode.frequency.value = 6000
  } else {
    this.filterNode.frequency.value = 22050
  }

  // "LED filter" at 3275kHz - off by default
  this.lowpassNode = this.context.createBiquadFilter()
  this.setfilter(this.filter)

  // mixer
  if (typeof this.context.createJavaScriptNode === 'function') {
    this.mixerNode = this.context.createJavaScriptNode(this.bufferlen, 1, 2)
  } else {
    this.mixerNode = this.context.createScriptProcessor(this.bufferlen, 1, 2)
  }
  this.mixerNode.module = this
  this.mixerNode.onaudioprocess = Modplayer.prototype.mix

  // patch up some cables :)
  this.mixerNode.connect(this.filterNode)
  this.filterNode.connect(this.lowpassNode)
  this.lowpassNode.connect(this.context.destination)
}

// scriptnode callback - pass through to player class
Modplayer.prototype.mix = function (ape) {
  let mod

  if (ape.srcElement) {
    mod = ape.srcElement.module
  } else {
    mod = this.module
  }

  if (mod.player && mod.delayfirst == 0) {
    mod.player.repeat = mod.repeat

    const bufs = new Array(ape.outputBuffer.getChannelData(0), ape.outputBuffer.getChannelData(1))
    const buflen = ape.outputBuffer.length
    mod.player.mix(mod.player, bufs, buflen)

    // apply stereo separation and soft clipping
    const outp = new Float32Array(2)
    for (let s = 0; s < buflen; s++) {
      outp[0] = bufs[0][s]
      outp[1] = bufs[1][s]

      // a more headphone-friendly stereo separation
      if (mod.separation) {
        t = outp[0]
        if (mod.separation == 2) { // mono
          outp[0] = outp[0] * 0.5 + outp[1] * 0.5
          outp[1] = outp[1] * 0.5 + t * 0.5
        } else { // narrow stereo
          outp[0] = outp[0] * 0.65 + outp[1] * 0.35
          outp[1] = outp[1] * 0.65 + t * 0.35
        }
      }

      // scale down and soft clip
      outp[0] /= mod.mixval; outp[0] = 0.5 * (Math.abs(outp[0] + 0.975) - Math.abs(outp[0] - 0.975))
      outp[1] /= mod.mixval; outp[1] = 0.5 * (Math.abs(outp[1] + 0.975) - Math.abs(outp[1] - 0.975))

      bufs[0][s] = outp[0]
      bufs[1][s] = outp[1]
    }

    mod.row = mod.player.row
    mod.position = mod.player.position
    mod.speed = mod.player.speed
    mod.bpm = mod.player.bpm
    mod.endofsong = mod.player.endofsong

    if (mod.player.filter != mod.filter) {
      mod.setfilter(mod.player.filter)
    }

    if (mod.endofsong && mod.playing) mod.stop()

    if (mod.delayfirst > 0) mod.delayfirst--
    mod.delayload = 0

    // update this.chvu from player channel vu
    for (let i = 0; i < mod.player.channels; i++) {
      mod.chvu[i] = mod.chvu[i] * 0.25 + mod.player.chvu[i] * 0.75
      mod.player.chvu[i] = 0.0
    }
  }
}
/*
  (c) 2012-2021 Noora Halme et al. (see AUTHORS)

  This code is licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

  Fast Tracker 2 module player class

  Reading material:
  - ftp://ftp.modland.com/pub/documents/format_documentation/FastTracker%202%20v2.04%20(.xm).html
  - http://sid.ethz.ch/debian/milkytracker/milkytracker-0.90.85%2Bdfsg/resources/reference/xm-form.txt
  - ftp://ftp.modland.com/pub/documents/format_documentation/Tracker%20differences%20for%20Coders.txt
  - http://wiki.openmpt.org/Manual:_Compatible_Playback

  Greets to Guru, Alfred and CCR for their work figuring out the .xm format. :)
*/

function Fasttracker () {
  let i, t

  this.clearsong()
  this.initialize()

  this.playing = false
  this.paused = false
  this.repeat = false

  this.filter = false

  this.syncqueue = []

  this.samplerate = 44100
  this.ramplen = 64.0

  this.mixval = 8.0

  // amiga period value table
  this.periodtable = new Float32Array([
  // ft -8     -7     -6     -5     -4     -3     -2     -1
  //    0      1      2      3      4      5      6      7
    907.0, 900.0, 894.0, 887.0, 881.0, 875.0, 868.0, 862.0, // B-3
    856.0, 850.0, 844.0, 838.0, 832.0, 826.0, 820.0, 814.0, // C-4
    808.0, 802.0, 796.0, 791.0, 785.0, 779.0, 774.0, 768.0, // C#4
    762.0, 757.0, 752.0, 746.0, 741.0, 736.0, 730.0, 725.0, // D-4
    720.0, 715.0, 709.0, 704.0, 699.0, 694.0, 689.0, 684.0, // D#4
    678.0, 675.0, 670.0, 665.0, 660.0, 655.0, 651.0, 646.0, // E-4
    640.0, 636.0, 632.0, 628.0, 623.0, 619.0, 614.0, 610.0, // F-4
    604.0, 601.0, 597.0, 592.0, 588.0, 584.0, 580.0, 575.0, // F#4
    570.0, 567.0, 563.0, 559.0, 555.0, 551.0, 547.0, 543.0, // G-4
    538.0, 535.0, 532.0, 528.0, 524.0, 520.0, 516.0, 513.0, // G#4
    508.0, 505.0, 502.0, 498.0, 494.0, 491.0, 487.0, 484.0, // A-4
    480.0, 477.0, 474.0, 470.0, 467.0, 463.0, 460.0, 457.0, // A#4
    453.0, 450.0, 447.0, 445.0, 442.0, 439.0, 436.0, 433.0, // B-4
    428.0
  ])

  this.pan = new Float32Array(32)
  this.finalpan = new Float32Array(32)
  for (i = 0; i < 32; i++) this.pan[i] = this.finalpan[i] = 0.5

  // calc tables for vibrato waveforms
  this.vibratotable = new Array()
  for (t = 0; t < 4; t++) {
    this.vibratotable[t] = new Float32Array(64)
    for (i = 0; i < 64; i++) {
      switch (t) {
        case 0:
          this.vibratotable[t][i] = 127 * Math.sin(Math.PI * 2 * (i / 64))
          break
        case 1:
          this.vibratotable[t][i] = 127 - 4 * i
          break
        case 2:
          this.vibratotable[t][i] = (i < 32) ? 127 : -127
          break
        case 3:
          this.vibratotable[t][i] = (1 - 2 * Math.random()) * 127
          break
      }
    }
  }

  // volume column effect jumptable for 0x50..0xef
  this.voleffects_t0 = new Array(
    this.effect_vol_t0_f0,
    this.effect_vol_t0_60, this.effect_vol_t0_70, this.effect_vol_t0_80, this.effect_vol_t0_90, this.effect_vol_t0_a0,
    this.effect_vol_t0_b0, this.effect_vol_t0_c0, this.effect_vol_t0_d0, this.effect_vol_t0_e0
  )
  this.voleffects_t1 = new Array(
    this.effect_vol_t1_f0,
    this.effect_vol_t1_60, this.effect_vol_t1_70, this.effect_vol_t1_80, this.effect_vol_t1_90, this.effect_vol_t1_a0,
    this.effect_vol_t1_b0, this.effect_vol_t1_c0, this.effect_vol_t1_d0, this.effect_vol_t1_e0
  )

  // effect jumptables for tick 0 and ticks 1..f
  this.effects_t0 = new Array(
    this.effect_t0_0, this.effect_t0_1, this.effect_t0_2, this.effect_t0_3, this.effect_t0_4, this.effect_t0_5, this.effect_t0_6, this.effect_t0_7,
    this.effect_t0_8, this.effect_t0_9, this.effect_t0_a, this.effect_t0_b, this.effect_t0_c, this.effect_t0_d, this.effect_t0_e, this.effect_t0_f,
    this.effect_t0_g, this.effect_t0_h, this.effect_t0_i, this.effect_t0_j, this.effect_t0_k, this.effect_t0_l, this.effect_t0_m, this.effect_t0_n,
    this.effect_t0_o, this.effect_t0_p, this.effect_t0_q, this.effect_t0_r, this.effect_t0_s, this.effect_t0_t, this.effect_t0_u, this.effect_t0_v,
    this.effect_t0_w, this.effect_t0_x, this.effect_t0_y, this.effect_t0_z
  )
  this.effects_t0_e = new Array(
    this.effect_t0_e0, this.effect_t0_e1, this.effect_t0_e2, this.effect_t0_e3, this.effect_t0_e4, this.effect_t0_e5, this.effect_t0_e6, this.effect_t0_e7,
    this.effect_t0_e8, this.effect_t0_e9, this.effect_t0_ea, this.effect_t0_eb, this.effect_t0_ec, this.effect_t0_ed, this.effect_t0_ee, this.effect_t0_ef
  )
  this.effects_t1 = new Array(
    this.effect_t1_0, this.effect_t1_1, this.effect_t1_2, this.effect_t1_3, this.effect_t1_4, this.effect_t1_5, this.effect_t1_6, this.effect_t1_7,
    this.effect_t1_8, this.effect_t1_9, this.effect_t1_a, this.effect_t1_b, this.effect_t1_c, this.effect_t1_d, this.effect_t1_e, this.effect_t1_f,
    this.effect_t1_g, this.effect_t1_h, this.effect_t1_i, this.effect_t1_j, this.effect_t1_k, this.effect_t1_l, this.effect_t1_m, this.effect_t1_n,
    this.effect_t1_o, this.effect_t1_p, this.effect_t1_q, this.effect_t1_r, this.effect_t1_s, this.effect_t1_t, this.effect_t1_u, this.effect_t1_v,
    this.effect_t1_w, this.effect_t1_x, this.effect_t1_y, this.effect_t1_z
  )
  this.effects_t1_e = new Array(
    this.effect_t1_e0, this.effect_t1_e1, this.effect_t1_e2, this.effect_t1_e3, this.effect_t1_e4, this.effect_t1_e5, this.effect_t1_e6, this.effect_t1_e7,
    this.effect_t1_e8, this.effect_t1_e9, this.effect_t1_ea, this.effect_t1_eb, this.effect_t1_ec, this.effect_t1_ed, this.effect_t1_ee, this.effect_t1_ef
  )
}

// clear song data
Fasttracker.prototype.clearsong = function () {
  let i

  this.title = ''
  this.signature = ''
  this.trackerversion = 0x0104

  this.songlen = 1
  this.repeatpos = 0

  this.channels = 0
  this.patterns = 0
  this.instruments = 32

  this.amigaperiods = 0

  this.initSpeed = 6
  this.initBPM = 125

  this.patterntable = new ArrayBuffer(256)
  for (i = 0; i < 256; i++) this.patterntable[i] = 0

  this.pattern = new Array()
  this.instrument = new Array(this.instruments)
  for (i = 0; i < 32; i++) {
    this.instrument[i] = new Object()
    this.instrument[i].name = ''
    this.instrument[i].samples = new Array()
  }

  this.chvu = new Float32Array(2)
}

// initialize all player variables to defaults prior to starting playback
Fasttracker.prototype.initialize = function () {
  this.syncqueue = []

  this.tick = -1
  this.position = 0
  this.row = 0
  this.flags = 0

  this.volume = 64
  if (this.initSpeed) this.speed = this.initSpeed
  if (this.initBPM) this.bpm = this.initBPM
  this.stt = 0 // this.samplerate/(this.bpm*0.4);
  this.breakrow = 0
  this.patternjump = 0
  this.patterndelay = 0
  this.patternwait = 0
  this.endofsong = false
  this.looprow = 0
  this.loopstart = 0
  this.loopcount = 0

  this.globalvolslide = 0

  this.channel = new Array()
  for (i = 0; i < this.channels; i++) {
    this.channel[i] = new Object()

    this.channel[i].instrument = 0
    this.channel[i].sampleindex = 0

    this.channel[i].note = 36
    this.channel[i].command = 0
    this.channel[i].data = 0
    this.channel[i].samplepos = 0
    this.channel[i].samplespeed = 0
    this.channel[i].flags = 0
    this.channel[i].noteon = 0

    this.channel[i].volslide = 0
    this.channel[i].slidespeed = 0
    this.channel[i].slideto = 0
    this.channel[i].slidetospeed = 0
    this.channel[i].arpeggio = 0

    this.channel[i].period = 640
    this.channel[i].frequency = 8363

    this.channel[i].volume = 64
    this.channel[i].voiceperiod = 0
    this.channel[i].voicevolume = 0
    this.channel[i].finalvolume = 0

    this.channel[i].semitone = 12
    this.channel[i].vibratospeed = 0
    this.channel[i].vibratodepth = 0
    this.channel[i].vibratopos = 0
    this.channel[i].vibratowave = 0

    this.channel[i].volramp = 1.0
    this.channel[i].volrampfrom = 0

    this.channel[i].volenvpos = 0
    this.channel[i].panenvpos = 0
    this.channel[i].fadeoutpos = 0

    this.channel[i].playdir = 1

    // interpolation/ramps
    this.channel[i].volramp = 0
    this.channel[i].volrampfrom = 0
    this.channel[i].trigramp = 0
    this.channel[i].trigrampfrom = 0.0
    this.channel[i].currentsample = 0.0
    this.channel[i].lastsample = 0.0
    this.channel[i].oldfinalvolume = 0.0
  }
}

// parse the module from local buffer
Fasttracker.prototype.parse = function (buffer) {
  let i, j, k, c, offset, datalen, hdrlen

  if (!buffer) return false

  // check xm signature, type and tracker version
  for (i = 0; i < 17; i++) this.signature += String.fromCharCode(buffer[i])
  if (this.signature != 'Extended Module: ') return false
  if (buffer[37] != 0x1a) return false
  this.signature = 'X.M.'
  this.trackerversion = leWord(buffer, 58)
  if (this.trackerversion < 0x0104) return false // older versions not currently supported

  // song title
  i = 0
  while (buffer[i] && i < 20) this.title += dos2utf(buffer[17 + i++])

  offset = 60
  hdrlen = leDword(buffer, offset)
  this.songlen = leWord(buffer, offset + 4)
  this.repeatpos = leWord(buffer, offset + 6)
  this.channels = leWord(buffer, offset + 8)
  this.patterns = leWord(buffer, offset + 10)
  this.instruments = leWord(buffer, offset + 12)

  this.amigaperiods = (!leWord(buffer, offset + 14)) & 1

  this.initSpeed = leWord(buffer, offset + 16)
  this.initBPM = leWord(buffer, offset + 18)

  let maxpatt = 0
  for (i = 0; i < 256; i++) {
    this.patterntable[i] = buffer[offset + 20 + i]
    if (this.patterntable[i] > maxpatt) maxpatt = this.patterntable[i]
  }
  maxpatt++

  // allocate arrays for pattern data
  this.pattern = new Array(maxpatt)
  this.patternlen = new Array(maxpatt)

  for (i = 0; i < maxpatt; i++) {
    // initialize the pattern to defaults prior to unpacking
    this.patternlen[i] = 64
    this.pattern[i] = new Uint8Array(this.channels * this.patternlen[i] * 5)
    for (row = 0; row < this.patternlen[i]; row++) {
      for (ch = 0; ch < this.channels; ch++) {
        this.pattern[i][row * this.channels * 5 + ch * 5 + 0] = 255 // note (255=no note)
        this.pattern[i][row * this.channels * 5 + ch * 5 + 1] = 0 // instrument
        this.pattern[i][row * this.channels * 5 + ch * 5 + 2] = 255 // volume
        this.pattern[i][row * this.channels * 5 + ch * 5 + 3] = 255 // command
        this.pattern[i][row * this.channels * 5 + ch * 5 + 4] = 0 // parameter
      }
    }
  }

  // load and unpack patterns
  offset += hdrlen // initial offset for patterns
  i = 0
  while (i < this.patterns) {
    this.patternlen[i] = leWord(buffer, offset + 5)
    this.pattern[i] = new Uint8Array(this.channels * this.patternlen[i] * 5)

    // initialize pattern to defaults prior to unpacking
    for (k = 0; k < (this.patternlen[i] * this.channels); k++) {
      this.pattern[i][k * 5 + 0] = 0 // note
      this.pattern[i][k * 5 + 1] = 0 // instrument
      this.pattern[i][k * 5 + 2] = 0 // volume
      this.pattern[i][k * 5 + 3] = 0 // command
      this.pattern[i][k * 5 + 4] = 0 // parameter
    }

    datalen = leWord(buffer, offset + 7)
    offset += leDword(buffer, offset) // jump over header
    j = 0; k = 0
    while (j < datalen) {
      c = buffer[offset + j++]
      if (c & 128) {
        // first byte is a bitmask
        if (c & 1) this.pattern[i][k + 0] = buffer[offset + j++]
        if (c & 2) this.pattern[i][k + 1] = buffer[offset + j++]
        if (c & 4) this.pattern[i][k + 2] = buffer[offset + j++]
        if (c & 8) this.pattern[i][k + 3] = buffer[offset + j++]
        if (c & 16) this.pattern[i][k + 4] = buffer[offset + j++]
      } else {
        // first byte is note -> all columns present sequentially
        this.pattern[i][k + 0] = c
        this.pattern[i][k + 1] = buffer[offset + j++]
        this.pattern[i][k + 2] = buffer[offset + j++]
        this.pattern[i][k + 3] = buffer[offset + j++]
        this.pattern[i][k + 4] = buffer[offset + j++]
      }
      k += 5
    }

    for (k = 0; k < (this.patternlen[i] * this.channels * 5); k += 5) {
      // remap note to st3-style, 255=no note, 254=note off
      if (this.pattern[i][k + 0] >= 97) {
        this.pattern[i][k + 0] = 254
      } else if (this.pattern[i][k + 0] == 0) {
        this.pattern[i][k + 0] = 255
      } else {
        this.pattern[i][k + 0]--
      }

      // command 255=no command
      if (this.pattern[i][k + 3] == 0 && this.pattern[i][k + 4] == 0) this.pattern[i][k + 3] = 255

      // remap volume column setvol to 0x00..0x40, tone porta to 0x50..0x5f and 0xff for nop
      if (this.pattern[i][k + 2] < 0x10) { this.pattern[i][k + 2] = 0xff } else if (this.pattern[i][k + 2] >= 0x10 && this.pattern[i][k + 2] <= 0x50) { this.pattern[i][k + 2] -= 0x10 } else if (this.pattern[i][k + 2] >= 0xf0) this.pattern[i][k + 2] -= 0xa0
    }

    // unpack next pattern
    offset += j
    i++
  }
  this.patterns = maxpatt

  // instruments
  this.instrument = new Array(this.instruments)
  i = 0
  while (i < this.instruments) {
    hdrlen = leDword(buffer, offset)
    this.instrument[i] = new Object()
    this.instrument[i].sample = new Array()
    this.instrument[i].name = ''
    j = 0
    while (buffer[offset + 4 + j] && j < 22) { this.instrument[i].name += dos2utf(buffer[offset + 4 + j++]) }
    this.instrument[i].samples = leWord(buffer, offset + 27)

    // initialize to defaults
    this.instrument[i].samplemap = new Uint8Array(96)
    for (j = 0; j < 96; j++) this.instrument[i].samplemap[j] = 0
    this.instrument[i].volenv = new Float32Array(325)
    this.instrument[i].panenv = new Float32Array(325)
    this.instrument[i].voltype = 0
    this.instrument[i].pantype = 0
    for (j = 0; j <= this.instrument[i].samples; j++) {
      this.instrument[i].sample[j] = {
        bits: 8,
        stereo: 0,
        bps: 1,
        length: 0,
        loopstart: 0,
        looplength: 0,
        loopend: 0,
        looptype: 0,
        volume: 64,
        finetune: 0,
        relativenote: 0,
        panning: 128,
        name: '',
        data: new Float32Array(0)
      }
    }

    if (this.instrument[i].samples) {
      const smphdrlen = leDword(buffer, offset + 29)

      for (j = 0; j < 96; j++) this.instrument[i].samplemap[j] = buffer[offset + 33 + j]

      // envelope points. the xm specs say 48 bytes per envelope, but while that may
      // technically be correct, what they don't say is that it means 12 pairs of
      // little endian words. first word is the x coordinate, second is y. point
      // 0 always has x=0.
      const tmp_volenv = new Array(12)
      const tmp_panenv = new Array(12)
      for (j = 0; j < 12; j++) {
        tmp_volenv[j] = new Uint16Array([leWord(buffer, offset + 129 + j * 4), leWord(buffer, offset + 129 + j * 4 + 2)])
        tmp_panenv[j] = new Uint16Array([leWord(buffer, offset + 177 + j * 4), leWord(buffer, offset + 177 + j * 4 + 2)])
      }

      // are envelopes enabled?
      this.instrument[i].voltype = buffer[offset + 233] // 1=enabled, 2=sustain, 4=loop
      this.instrument[i].pantype = buffer[offset + 234]

      // pre-interpolate the envelopes to arrays of [0..1] float32 values which
      // are stepped through at a rate of one per tick. max tick count is 0x0144.

      // volume envelope
      for (j = 0; j < 325; j++) this.instrument[i].volenv[j] = 1.0
      if (this.instrument[i].voltype & 1) {
        for (j = 0; j < 325; j++) {
          var p, delta
          p = 1
          while (tmp_volenv[p][0] < j && p < 11) p++
          if (tmp_volenv[p][0] == tmp_volenv[p - 1][0]) { delta = 0 } else {
            delta = (tmp_volenv[p][1] - tmp_volenv[p - 1][1]) / (tmp_volenv[p][0] - tmp_volenv[p - 1][0])
          }
          this.instrument[i].volenv[j] = (tmp_volenv[p - 1][1] + delta * (j - tmp_volenv[p - 1][0])) / 64.0
        }
        this.instrument[i].volenvlen = tmp_volenv[Math.max(0, buffer[offset + 225] - 1)][0]
        this.instrument[i].volsustain = tmp_volenv[buffer[offset + 227]][0]
        this.instrument[i].volloopstart = tmp_volenv[buffer[offset + 228]][0]
        this.instrument[i].volloopend = tmp_volenv[buffer[offset + 229]][0]
      }

      // pan envelope
      for (j = 0; j < 325; j++) this.instrument[i].panenv[j] = 0.5
      if (this.instrument[i].pantype & 1) {
        for (j = 0; j < 325; j++) {
          var p, delta
          p = 1
          while (tmp_panenv[p][0] < j && p < 11) p++
          if (tmp_panenv[p][0] == tmp_panenv[p - 1][0]) { delta = 0 } else {
            delta = (tmp_panenv[p][1] - tmp_panenv[p - 1][1]) / (tmp_panenv[p][0] - tmp_panenv[p - 1][0])
          }
          this.instrument[i].panenv[j] = (tmp_panenv[p - 1][1] + delta * (j - tmp_panenv[p - 1][0])) / 64.0
        }
        this.instrument[i].panenvlen = tmp_panenv[Math.max(0, buffer[offset + 226] - 1)][0]
        this.instrument[i].pansustain = tmp_panenv[buffer[offset + 230]][0]
        this.instrument[i].panloopstart = tmp_panenv[buffer[offset + 231]][0]
        this.instrument[i].panloopend = tmp_panenv[buffer[offset + 232]][0]
      }

      // vibrato
      this.instrument[i].vibratotype = buffer[offset + 235]
      this.instrument[i].vibratosweep = buffer[offset + 236]
      this.instrument[i].vibratodepth = buffer[offset + 237]
      this.instrument[i].vibratorate = buffer[offset + 238]

      // volume fade out
      this.instrument[i].volfadeout = leWord(buffer, offset + 239)

      // sample headers
      offset += hdrlen
      this.instrument[i].sample = new Array(this.instrument[i].samples)
      for (j = 0; j < this.instrument[i].samples; j++) {
        datalen = leDword(buffer, offset + 0)

        this.instrument[i].sample[j] = new Object()
        this.instrument[i].sample[j].bits = (buffer[offset + 14] & 16) ? 16 : 8
        this.instrument[i].sample[j].stereo = 0
        this.instrument[i].sample[j].bps = (this.instrument[i].sample[j].bits == 16) ? 2 : 1 // bytes per sample

        // sample length and loop points are in BYTES even for 16-bit samples!
        this.instrument[i].sample[j].length = datalen / this.instrument[i].sample[j].bps
        this.instrument[i].sample[j].loopstart = leDword(buffer, offset + 4) / this.instrument[i].sample[j].bps
        this.instrument[i].sample[j].looplength = leDword(buffer, offset + 8) / this.instrument[i].sample[j].bps
        this.instrument[i].sample[j].loopend = this.instrument[i].sample[j].loopstart + this.instrument[i].sample[j].looplength
        this.instrument[i].sample[j].looptype = buffer[offset + 14] & 0x03

        this.instrument[i].sample[j].volume = buffer[offset + 12]

        // finetune and seminote tuning
        if (buffer[offset + 13] < 128) {
          this.instrument[i].sample[j].finetune = buffer[offset + 13]
        } else {
          this.instrument[i].sample[j].finetune = buffer[offset + 13] - 256
        }
        if (buffer[offset + 16] < 128) {
          this.instrument[i].sample[j].relativenote = buffer[offset + 16]
        } else {
          this.instrument[i].sample[j].relativenote = buffer[offset + 16] - 256
        }

        this.instrument[i].sample[j].panning = buffer[offset + 15]

        k = 0; this.instrument[i].sample[j].name = ''
        while (buffer[offset + 18 + k] && k < 22) this.instrument[i].sample[j].name += dos2utf(buffer[offset + 18 + k++])

        offset += smphdrlen
      }

      // sample data (convert to signed float32)
      for (j = 0; j < this.instrument[i].samples; j++) {
        this.instrument[i].sample[j].data = new Float32Array(this.instrument[i].sample[j].length)
        c = 0
        if (this.instrument[i].sample[j].bits == 16) {
          for (k = 0; k < this.instrument[i].sample[j].length; k++) {
            c += sLeWord(buffer, offset + k * 2)
            if (c < -32768) c += 65536
            if (c > 32767) c -= 65536
            this.instrument[i].sample[j].data[k] = c / 32768.0
          }
        } else {
          for (k = 0; k < this.instrument[i].sample[j].length; k++) {
            c += sByte(buffer, offset + k)
            if (c < -128) c += 256
            if (c > 127) c -= 256
            this.instrument[i].sample[j].data[k] = c / 128.0
          }
        }
        offset += this.instrument[i].sample[j].length * this.instrument[i].sample[j].bps
      }
    } else {
      offset += hdrlen
    }
    i++
  }

  this.mixval = 4.0 - 2.0 * (this.channels / 32.0)

  this.chvu = new Float32Array(this.channels)
  for (i = 0; i < this.channels; i++) this.chvu[i] = 0.0

  return true
}

// calculate period value for note
Fasttracker.prototype.calcperiod = function (mod, note, finetune) {
  let pv
  if (mod.amigaperiods) {
    let ft = Math.floor(finetune / 16.0) // = -8 .. 7
    const p1 = mod.periodtable[8 + (note % 12) * 8 + ft]
    const p2 = mod.periodtable[8 + (note % 12) * 8 + ft + 1]
    ft = (finetune / 16.0) - ft
    pv = ((1.0 - ft) * p1 + ft * p2) * (16.0 / Math.pow(2, Math.floor(note / 12) - 1))
  } else {
    pv = 7680.0 - note * 64.0 - finetune / 2
  }
  return pv
}

// advance player by a tick
Fasttracker.prototype.advance = function (mod) {
  mod.stt = Math.floor((125.0 / mod.bpm) * (1 / 50.0) * mod.samplerate) // 50Hz

  // advance player
  mod.tick++
  mod.flags |= 1

  // new row on this tick?
  if (mod.tick >= mod.speed) {
    if (mod.patterndelay) { // delay pattern
      if (mod.tick < ((mod.patternwait + 1) * mod.speed)) {
        mod.patternwait++
      } else {
        mod.row++; mod.tick = 0; mod.flags |= 2; mod.patterndelay = 0
      }
    } else {
      if (mod.flags & (16 + 32 + 64)) {
        if (mod.flags & 64) { // loop pattern?
          mod.row = mod.looprow
          mod.flags &= 0xa1
          mod.flags |= 2
        } else {
          if (mod.flags & 16) { // pattern jump/break?
            mod.position = mod.patternjump
            mod.row = mod.breakrow
            mod.patternjump = 0
            mod.breakrow = 0
            mod.flags &= 0xe1
            mod.flags |= 2
          }
        }
        mod.tick = 0
      } else {
        mod.row++; mod.tick = 0; mod.flags |= 2
      }
    }
  }

  // step to new pattern?
  if (mod.row >= mod.patternlen[mod.patterntable[mod.position]]) {
    mod.position++
    mod.row = 0
    mod.flags |= 4
  }

  // end of song?
  if (mod.position >= mod.songlen) {
    if (mod.repeat) {
      mod.position = 0
    } else {
      this.endofsong = true
    }
  }
}

// process one channel on a row in pattern p, pp is an offset to pattern data
Fasttracker.prototype.process_note = function (mod, p, ch) {
  let n, i, s, v, pp, pv

  pp = mod.row * 5 * mod.channels + ch * 5
  n = mod.pattern[p][pp]
  i = mod.pattern[p][pp + 1]
  if (i && i <= mod.instrument.length) {
    mod.channel[ch].instrument = i - 1

    if (mod.instrument[i - 1].samples) {
      s = mod.instrument[i - 1].samplemap[mod.channel[ch].note]
      mod.channel[ch].sampleindex = s
      mod.channel[ch].volume = mod.instrument[i - 1].sample[s].volume
      mod.channel[ch].playdir = 1 // fixes crash in respirator.xm pos 0x12

      // set pan from sample
      mod.pan[ch] = mod.instrument[i - 1].sample[s].panning / 255.0
    }
    mod.channel[ch].voicevolume = mod.channel[ch].volume
  }
  i = mod.channel[ch].instrument

  if (n < 254) {
    // look up the sample
    s = mod.instrument[i].samplemap[n]
    mod.channel[ch].sampleindex = s

    const rn = n + mod.instrument[i].sample[s].relativenote

    // calc period for note
    pv = mod.calcperiod(mod, rn, mod.instrument[i].sample[s].finetune)

    if (mod.channel[ch].noteon) {
      // retrig note, except if command=0x03 (porta to note) or 0x05 (porta+volslide)
      if ((mod.channel[ch].command != 0x03) && (mod.channel[ch].command != 0x05)) {
        mod.channel[ch].note = n
        mod.channel[ch].period = pv
        mod.channel[ch].voiceperiod = mod.channel[ch].period
        mod.channel[ch].flags |= 3 // force sample speed recalc

        mod.channel[ch].trigramp = 0.0
        mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample

        mod.channel[ch].samplepos = 0
        mod.channel[ch].playdir = 1
        if (mod.channel[ch].vibratowave > 3) mod.channel[ch].vibratopos = 0

        mod.channel[ch].noteon = 1

        mod.channel[ch].fadeoutpos = 65535
        mod.channel[ch].volenvpos = 0
        mod.channel[ch].panenvpos = 0
      }
    } else {
      // note is off, restart but don't set period if slide command
      if (mod.pattern[p][pp + 1]) { // instrument set on row?
        mod.channel[ch].samplepos = 0
        mod.channel[ch].playdir = 1
        if (mod.channel[ch].vibratowave > 3) mod.channel[ch].vibratopos = 0
        mod.channel[ch].noteon = 1
        mod.channel[ch].fadeoutpos = 65535
        mod.channel[ch].volenvpos = 0
        mod.channel[ch].panenvpos = 0
        mod.channel[ch].trigramp = 0.0
        mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample
      }
      if ((mod.channel[ch].command != 0x03) && (mod.channel[ch].command != 0x05)) {
        mod.channel[ch].note = n
        mod.channel[ch].period = pv
        mod.channel[ch].voiceperiod = mod.channel[ch].period
        mod.channel[ch].flags |= 3 // force sample speed recalc
      }
    }
    // in either case, set the slide to note target to note period
    mod.channel[ch].slideto = pv
  } else if (n == 254) {
    mod.channel[ch].noteon = 0 // note off
    if (!(mod.instrument[i].voltype & 1)) mod.channel[ch].voicevolume = 0
  }

  if (mod.pattern[p][pp + 2] != 255) {
    v = mod.pattern[p][pp + 2]
    if (v <= 0x40) {
      mod.channel[ch].volume = v
      mod.channel[ch].voicevolume = mod.channel[ch].volume
    }
  }
}

// advance player and all channels by a tick
Fasttracker.prototype.process_tick = function (mod) {
  // advance global player state by a tick
  mod.advance(mod)

  // advance all channels by a tick
  for (let ch = 0; ch < mod.channels; ch++) {
    // calculate playback position
    const p = mod.patterntable[mod.position]
    const pp = mod.row * 5 * mod.channels + ch * 5

    // save old volume if ramping is needed
    mod.channel[ch].oldfinalvolume = mod.channel[ch].finalvolume

    if (mod.flags & 2) { // new row on this tick?
      mod.channel[ch].command = mod.pattern[p][pp + 3]
      mod.channel[ch].data = mod.pattern[p][pp + 4]
      if (!(mod.channel[ch].command == 0x0e && (mod.channel[ch].data & 0xf0) == 0xd0)) { // note delay?
        mod.process_note(mod, p, ch)
      }
    }
    i = mod.channel[ch].instrument
    si = mod.channel[ch].sampleindex

    // kill empty instruments
    if (mod.channel[ch].noteon && !mod.instrument[i].samples) {
      mod.channel[ch].noteon = 0
    }

    // effects
    const v = mod.pattern[p][pp + 2]
    if (v >= 0x50 && v < 0xf0) {
      if (!mod.tick) mod.voleffects_t0[(v >> 4) - 5](mod, ch, v & 0x0f)
      else mod.voleffects_t1[(v >> 4) - 5](mod, ch, v & 0x0f)
    }
    if (mod.channel[ch].command < 36) {
      if (!mod.tick) {
        // process only on tick 0
        mod.effects_t0[mod.channel[ch].command](mod, ch)
      } else {
        mod.effects_t1[mod.channel[ch].command](mod, ch)
      }
    }

    // recalc sample speed if voiceperiod has changed
    if ((mod.channel[ch].flags & 1 || mod.flags & 2) && mod.channel[ch].voiceperiod) {
      var f
      if (mod.amigaperiods) {
        f = 8287.137 * 1712.0 / mod.channel[ch].voiceperiod
      } else {
        f = 8287.137 * Math.pow(2.0, (4608.0 - mod.channel[ch].voiceperiod) / 768.0)
      }
      mod.channel[ch].samplespeed = f / mod.samplerate
    }

    // advance vibrato on each new tick
    mod.channel[ch].vibratopos += mod.channel[ch].vibratospeed
    mod.channel[ch].vibratopos &= 0x3f

    // advance volume envelope, if enabled (also fadeout)
    if (mod.instrument[i].voltype & 1) {
      mod.channel[ch].volenvpos++

      if (mod.channel[ch].noteon &&
          (mod.instrument[i].voltype & 2) &&
          mod.channel[ch].volenvpos >= mod.instrument[i].volsustain) { mod.channel[ch].volenvpos = mod.instrument[i].volsustain }

      if ((mod.instrument[i].voltype & 4) &&
          mod.channel[ch].volenvpos >= mod.instrument[i].volloopend) { mod.channel[ch].volenvpos = mod.instrument[i].volloopstart }

      if (mod.channel[ch].volenvpos >= mod.instrument[i].volenvlen) { mod.channel[ch].volenvpos = mod.instrument[i].volenvlen }

      if (mod.channel[ch].volenvpos > 324) mod.channel[ch].volenvpos = 324

      // fadeout if note is off
      if (!mod.channel[ch].noteon && mod.channel[ch].fadeoutpos) {
        mod.channel[ch].fadeoutpos -= mod.instrument[i].volfadeout
        if (mod.channel[ch].fadeoutpos < 0) mod.channel[ch].fadeoutpos = 0
      }
    }

    // advance pan envelope, if enabled
    if (mod.instrument[i].pantype & 1) {
      mod.channel[ch].panenvpos++

      if (mod.channel[ch].noteon &&
          mod.instrument[i].pantype & 2 &&
          mod.channel[ch].panenvpos >= mod.instrument[i].pansustain) { mod.channel[ch].panenvpos = mod.instrument[i].pansustain }

      if (mod.instrument[i].pantype & 4 &&
          mod.channel[ch].panenvpos >= mod.instrument[i].panloopend) { mod.channel[ch].panenvpos = mod.instrument[i].panloopstart }

      if (mod.channel[ch].panenvpos >= mod.instrument[i].panenvlen) { mod.channel[ch].panenvpos = mod.instrument[i].panenvlen }

      if (mod.channel[ch].panenvpos > 324) mod.channel[ch].panenvpos = 324
    }

    // calc final volume for channel
    mod.channel[ch].finalvolume = mod.channel[ch].voicevolume * mod.instrument[i].volenv[mod.channel[ch].volenvpos] * mod.channel[ch].fadeoutpos / 65536.0

    // calc final panning for channel
    mod.finalpan[ch] = mod.pan[ch] + (mod.instrument[i].panenv[mod.channel[ch].panenvpos] - 0.5) * (0.5 * Math.abs(mod.pan[ch] - 0.5)) * 2.0

    // setup volramp if voice volume changed
    if (mod.channel[ch].oldfinalvolume != mod.channel[ch].finalvolume) {
      mod.channel[ch].volrampfrom = mod.channel[ch].oldfinalvolume
      mod.channel[ch].volramp = 0.0
    }

    // clear channel flags
    mod.channel[ch].flags = 0
  }

  // clear global flags after all channels are processed
  mod.flags &= 0x70
}

// mix a buffer of audio for an audio processing event
Fasttracker.prototype.mix = function (mod, bufs, buflen) {
  const outp = new Float32Array(2)

  // return a buffer of silence if not playing
  if (mod.paused || mod.endofsong || !mod.playing) {
    for (var s = 0; s < buflen; s++) {
      bufs[0][s] = 0.0
      bufs[1][s] = 0.0
      for (var ch = 0; ch < mod.chvu.length; ch++) mod.chvu[ch] = 0.0
    }
    return
  }

  // fill audiobuffer
  for (var s = 0; s < buflen; s++) {
    outp[0] = 0.0
    outp[1] = 0.0

    // if STT has run out, step player forward by tick
    if (mod.stt <= 0) mod.process_tick(mod)

    // mix channels
    for (var ch = 0; ch < mod.channels; ch++) {
      let fl = 0.0; let fr = 0.0; let fs = 0.0
      const i = mod.channel[ch].instrument
      const si = mod.channel[ch].sampleindex

      // add channel output to left/right master outputs
      if (mod.channel[ch].noteon ||
          ((mod.instrument[i].voltype & 1) && !mod.channel[ch].noteon && mod.channel[ch].fadeoutpos) ||
          (!mod.channel[ch].noteon && mod.channel[ch].volramp < 1.0)
      ) {
        if (mod.instrument[i].sample[si].length > mod.channel[ch].samplepos) {
          fl = mod.channel[ch].lastsample

          // interpolate towards current sample
          let f = Math.floor(mod.channel[ch].samplepos)
          fs = mod.instrument[i].sample[si].data[f]
          f = mod.channel[ch].samplepos - f
          f = (mod.channel[ch].playdir < 0) ? (1.0 - f) : f
          fl = f * fs + (1.0 - f) * fl

          // smooth out discontinuities from retrig and sample offset
          f = mod.channel[ch].trigramp
          fl = f * fl + (1.0 - f) * mod.channel[ch].trigrampfrom
          f += 1.0 / 128.0
          mod.channel[ch].trigramp = Math.min(1.0, f)
          mod.channel[ch].currentsample = fl

          // ramp volume changes over 64 samples to avoid clicks
          fr = fl * (mod.channel[ch].finalvolume / 64.0)
          f = mod.channel[ch].volramp
          fl = f * fr + (1.0 - f) * (fl * (mod.channel[ch].volrampfrom / 64.0))
          f += (1.0 / 64.0)
          mod.channel[ch].volramp = Math.min(1.0, f)

          // pan samples, if envelope is disabled panvenv is always 0.5
          f = mod.finalpan[ch]
          fr = fl * f
          fl *= 1.0 - f
        }
        outp[0] += fl
        outp[1] += fr

        // advance sample position and check for loop or end
        const oldpos = mod.channel[ch].samplepos
        mod.channel[ch].samplepos += mod.channel[ch].playdir * mod.channel[ch].samplespeed
        if (mod.channel[ch].playdir == 1) {
          if (Math.floor(mod.channel[ch].samplepos) > Math.floor(oldpos)) mod.channel[ch].lastsample = fs
        } else {
          if (Math.floor(mod.channel[ch].samplepos) < Math.floor(oldpos)) mod.channel[ch].lastsample = fs
        }

        if (mod.instrument[i].sample[si].looptype) {
          if (mod.instrument[i].sample[si].looptype == 2) {
            // pingpong loop
            if (mod.channel[ch].playdir == -1) {
              // bounce off from start?
              if (mod.channel[ch].samplepos <= mod.instrument[i].sample[si].loopstart) {
                mod.channel[ch].samplepos += (mod.instrument[i].sample[si].loopstart - mod.channel[ch].samplepos)
                mod.channel[ch].playdir = 1
                mod.channel[ch].lastsample = mod.channel[ch].currentsample
              }
            } else {
              // bounce off from end?
              if (mod.channel[ch].samplepos >= mod.instrument[i].sample[si].loopend) {
                mod.channel[ch].samplepos -= (mod.channel[ch].samplepos - mod.instrument[i].sample[si].loopend)
                mod.channel[ch].playdir = -1
                mod.channel[ch].lastsample = mod.channel[ch].currentsample
              }
            }
          } else {
            // normal loop
            if (mod.channel[ch].samplepos >= mod.instrument[i].sample[si].loopend) {
              mod.channel[ch].samplepos -= mod.instrument[i].sample[si].looplength
              mod.channel[ch].lastsample = mod.channel[ch].currentsample
            }
          }
        } else {
          if (mod.channel[ch].samplepos >= mod.instrument[i].sample[si].length) {
            mod.channel[ch].noteon = 0
          }
        }
      } else {
        mod.channel[ch].currentsample = 0.0 // note is completely off
      }
      mod.chvu[ch] = Math.max(mod.chvu[ch], Math.abs(fl + fr))
    }

    // done - store to output buffer
    t = mod.volume / 64.0
    bufs[0][s] = outp[0] * t
    bufs[1][s] = outp[1] * t
    mod.stt--
  }
}

//
// volume column effect functions
//
Fasttracker.prototype.effect_vol_t0_60 = function (mod, ch, data) { // 60-6f vol slide down
}
Fasttracker.prototype.effect_vol_t0_70 = function (mod, ch, data) { // 70-7f vol slide up
}
Fasttracker.prototype.effect_vol_t0_80 = function (mod, ch, data) { // 80-8f fine vol slide down
  mod.channel[ch].voicevolume -= data
  if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
}
Fasttracker.prototype.effect_vol_t0_90 = function (mod, ch, data) { // 90-9f fine vol slide up
  mod.channel[ch].voicevolume += data
  if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
}
Fasttracker.prototype.effect_vol_t0_a0 = function (mod, ch, data) { // a0-af set vibrato speed
  mod.channel[ch].vibratospeed = data
}
Fasttracker.prototype.effect_vol_t0_b0 = function (mod, ch, data) { // b0-bf vibrato
  if (data) mod.channel[ch].vibratodepth = data
  mod.effect_t1_4(mod, ch)
}
Fasttracker.prototype.effect_vol_t0_c0 = function (mod, ch, data) { // c0-cf set panning
  mod.pan[ch] = (data & 0x0f) / 15.0
}
Fasttracker.prototype.effect_vol_t0_d0 = function (mod, ch, data) { // d0-df panning slide left
}
Fasttracker.prototype.effect_vol_t0_e0 = function (mod, ch, data) { // e0-ef panning slide right
}
Fasttracker.prototype.effect_vol_t0_f0 = function (mod, ch, data) { // f0-ff tone porta
//  if (data) mod.channel[ch].slidetospeed=data;
//  if (!mod.amigaperiods) mod.channel[ch].slidetospeed*=4;
}
/// ///
Fasttracker.prototype.effect_vol_t1_60 = function (mod, ch, data) { // 60-6f vol slide down
  mod.channel[ch].voicevolume -= data
  if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
}
Fasttracker.prototype.effect_vol_t1_70 = function (mod, ch, data) { // 70-7f vol slide up
  mod.channel[ch].voicevolume += data
  if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
}
Fasttracker.prototype.effect_vol_t1_80 = function (mod, ch, data) { // 80-8f fine vol slide down
}
Fasttracker.prototype.effect_vol_t1_90 = function (mod, ch, data) { // 90-9f fine vol slide up
}
Fasttracker.prototype.effect_vol_t1_a0 = function (mod, ch, data) { // a0-af set vibrato speed
}
Fasttracker.prototype.effect_vol_t1_b0 = function (mod, ch, data) { // b0-bf vibrato
  mod.effect_t1_4(mod, ch) // same as effect column vibrato on ticks 1+
}
Fasttracker.prototype.effect_vol_t1_c0 = function (mod, ch, data) { // c0-cf set panning
}
Fasttracker.prototype.effect_vol_t1_d0 = function (mod, ch, data) { // d0-df panning slide left
}
Fasttracker.prototype.effect_vol_t1_e0 = function (mod, ch, data) { // e0-ef panning slide right
}
Fasttracker.prototype.effect_vol_t1_f0 = function (mod, ch, data) { // f0-ff tone porta
//  mod.effect_t1_3(mod, ch);
}

//
// tick 0 effect functions
//
Fasttracker.prototype.effect_t0_0 = function (mod, ch) { // 0 arpeggio
  mod.channel[ch].arpeggio = mod.channel[ch].data
}
Fasttracker.prototype.effect_t0_1 = function (mod, ch) { // 1 slide up
  if (mod.channel[ch].data) mod.channel[ch].slideupspeed = mod.channel[ch].data * 4
}
Fasttracker.prototype.effect_t0_2 = function (mod, ch) { // 2 slide down
  if (mod.channel[ch].data) mod.channel[ch].slidedownspeed = mod.channel[ch].data * 4
}
Fasttracker.prototype.effect_t0_3 = function (mod, ch) { // 3 slide to note
  if (mod.channel[ch].data) mod.channel[ch].slidetospeed = mod.channel[ch].data * 4
}
Fasttracker.prototype.effect_t0_4 = function (mod, ch) { // 4 vibrato
  if (mod.channel[ch].data & 0x0f && mod.channel[ch].data & 0xf0) {
    mod.channel[ch].vibratodepth = (mod.channel[ch].data & 0x0f)
    mod.channel[ch].vibratospeed = (mod.channel[ch].data & 0xf0) >> 4
  }
  mod.effect_t1_4(mod, ch)
}
Fasttracker.prototype.effect_t0_5 = function (mod, ch) { // 5
  mod.effect_t0_a(mod, ch)
}
Fasttracker.prototype.effect_t0_6 = function (mod, ch) { // 6
  mod.effect_t0_a(mod, ch)
}
Fasttracker.prototype.effect_t0_7 = function (mod, ch) { // 7
}
Fasttracker.prototype.effect_t0_8 = function (mod, ch) { // 8 set panning
  mod.pan[ch] = mod.channel[ch].data / 255.0
}
Fasttracker.prototype.effect_t0_9 = function (mod, ch) { // 9 set sample offset
  mod.channel[ch].samplepos = mod.channel[ch].data * 256
  mod.channel[ch].playdir = 1

  mod.channel[ch].trigramp = 0.0
  mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample
}
Fasttracker.prototype.effect_t0_a = function (mod, ch) { // a volume slide
  // this behavior differs from protracker!! A00 will slide using previous non-zero parameter.
  if (mod.channel[ch].data) mod.channel[ch].volslide = mod.channel[ch].data
}
Fasttracker.prototype.effect_t0_b = function (mod, ch) { // b pattern jump
  mod.breakrow = 0
  mod.patternjump = mod.channel[ch].data
  mod.flags |= 16
}
Fasttracker.prototype.effect_t0_c = function (mod, ch) { // c set volume
  mod.channel[ch].voicevolume = mod.channel[ch].data
  if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
  if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
}
Fasttracker.prototype.effect_t0_d = function (mod, ch) { // d pattern break
  mod.breakrow = ((mod.channel[ch].data & 0xf0) >> 4) * 10 + (mod.channel[ch].data & 0x0f)
  if (!(mod.flags & 16)) mod.patternjump = mod.position + 1
  mod.flags |= 16
}
Fasttracker.prototype.effect_t0_e = function (mod, ch) { // e
  const i = (mod.channel[ch].data & 0xf0) >> 4
  mod.effects_t0_e[i](mod, ch)
}
Fasttracker.prototype.effect_t0_f = function (mod, ch) { // f set speed
  if (mod.channel[ch].data > 32) {
    mod.bpm = mod.channel[ch].data
  } else {
    if (mod.channel[ch].data) mod.speed = mod.channel[ch].data
  }
}
Fasttracker.prototype.effect_t0_g = function (mod, ch) { // g set global volume
  if (mod.channel[ch].data <= 0x40) mod.volume = mod.channel[ch].data
}
Fasttracker.prototype.effect_t0_h = function (mod, ch) { // h global volume slide
  if (mod.channel[ch].data) mod.globalvolslide = mod.channel[ch].data
}
Fasttracker.prototype.effect_t0_i = function (mod, ch) { // i
}
Fasttracker.prototype.effect_t0_j = function (mod, ch) { // j
}
Fasttracker.prototype.effect_t0_k = function (mod, ch) { // k key off
  mod.channel[ch].noteon = 0
  if (!(mod.instrument[mod.channel[ch].instrument].voltype & 1)) mod.channel[ch].voicevolume = 0
}
Fasttracker.prototype.effect_t0_l = function (mod, ch) { // l set envelope position
  mod.channel[ch].volenvpos = mod.channel[ch].data
  mod.channel[ch].panenvpos = mod.channel[ch].data
}
Fasttracker.prototype.effect_t0_m = function (mod, ch) { // m
}
Fasttracker.prototype.effect_t0_n = function (mod, ch) { // n
}
Fasttracker.prototype.effect_t0_o = function (mod, ch) { // o
}
Fasttracker.prototype.effect_t0_p = function (mod, ch) { // p panning slide
}
Fasttracker.prototype.effect_t0_q = function (mod, ch) { // q
}
Fasttracker.prototype.effect_t0_r = function (mod, ch) { // r multi retrig note
}
Fasttracker.prototype.effect_t0_s = function (mod, ch) { // s
}
Fasttracker.prototype.effect_t0_t = function (mod, ch) { // t tremor
}
Fasttracker.prototype.effect_t0_u = function (mod, ch) { // u
}
Fasttracker.prototype.effect_t0_v = function (mod, ch) { // v
}
Fasttracker.prototype.effect_t0_w = function (mod, ch) { // w
}
Fasttracker.prototype.effect_t0_x = function (mod, ch) { // x extra fine porta up/down
}
Fasttracker.prototype.effect_t0_y = function (mod, ch) { // y
}
Fasttracker.prototype.effect_t0_z = function (mod, ch) { // z
}

//
// tick 0 effect e functions
//
Fasttracker.prototype.effect_t0_e0 = function (mod, ch) { // e0 filter on/off
}
Fasttracker.prototype.effect_t0_e1 = function (mod, ch) { // e1 fine slide up
  mod.channel[ch].period -= mod.channel[ch].data & 0x0f
  if (mod.channel[ch].period < 113) mod.channel[ch].period = 113
}
Fasttracker.prototype.effect_t0_e2 = function (mod, ch) { // e2 fine slide down
  mod.channel[ch].period += mod.channel[ch].data & 0x0f
  if (mod.channel[ch].period > 856) mod.channel[ch].period = 856
  mod.channel[ch].flags |= 1
}
Fasttracker.prototype.effect_t0_e3 = function (mod, ch) { // e3 set glissando
}
Fasttracker.prototype.effect_t0_e4 = function (mod, ch) { // e4 set vibrato waveform
  mod.channel[ch].vibratowave = mod.channel[ch].data & 0x07
}
Fasttracker.prototype.effect_t0_e5 = function (mod, ch) { // e5 set finetune
}
Fasttracker.prototype.effect_t0_e6 = function (mod, ch) { // e6 loop pattern
  if (mod.channel[ch].data & 0x0f) {
    if (mod.loopcount) {
      mod.loopcount--
    } else {
      mod.loopcount = mod.channel[ch].data & 0x0f
    }
    if (mod.loopcount) mod.flags |= 64
  } else {
    mod.looprow = mod.row
  }
}
Fasttracker.prototype.effect_t0_e7 = function (mod, ch) { // e7
}
Fasttracker.prototype.effect_t0_e8 = function (mod, ch) { // e8, use for syncing
  mod.syncqueue.unshift(mod.channel[ch].data & 0x0f)
}
Fasttracker.prototype.effect_t0_e9 = function (mod, ch) { // e9
}
Fasttracker.prototype.effect_t0_ea = function (mod, ch) { // ea fine volslide up
  mod.channel[ch].voicevolume += mod.channel[ch].data & 0x0f
  if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
}
Fasttracker.prototype.effect_t0_eb = function (mod, ch) { // eb fine volslide down
  mod.channel[ch].voicevolume -= mod.channel[ch].data & 0x0f
  if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
}
Fasttracker.prototype.effect_t0_ec = function (mod, ch) { // ec
}
Fasttracker.prototype.effect_t0_ed = function (mod, ch) { // ed delay sample
  if (mod.tick == (mod.channel[ch].data & 0x0f)) {
    mod.process_note(mod, mod.patterntable[mod.position], ch)
  }
}
Fasttracker.prototype.effect_t0_ee = function (mod, ch) { // ee delay pattern
  mod.patterndelay = mod.channel[ch].data & 0x0f
  mod.patternwait = 0
}
Fasttracker.prototype.effect_t0_ef = function (mod, ch) { // ef
}

//
// tick 1+ effect functions
//
Fasttracker.prototype.effect_t1_0 = function (mod, ch) { // 0 arpeggio
  if (mod.channel[ch].data) {
    const i = mod.channel[ch].instrument
    let apn = mod.channel[ch].note
    if ((mod.tick % 3) == 1) apn += mod.channel[ch].arpeggio >> 4
    if ((mod.tick % 3) == 2) apn += mod.channel[ch].arpeggio & 0x0f

    const s = mod.channel[ch].sampleindex
    mod.channel[ch].voiceperiod = mod.calcperiod(mod, apn + mod.instrument[i].sample[s].relativenote, mod.instrument[i].sample[s].finetune)
    mod.channel[ch].flags |= 1
  }
}
Fasttracker.prototype.effect_t1_1 = function (mod, ch) { // 1 slide up
  mod.channel[ch].voiceperiod -= mod.channel[ch].slideupspeed
  if (mod.channel[ch].voiceperiod < 1) mod.channel[ch].voiceperiod += 65535 // yeah, this is how it supposedly works in ft2...
  mod.channel[ch].flags |= 3 // recalc speed
}
Fasttracker.prototype.effect_t1_2 = function (mod, ch) { // 2 slide down
  mod.channel[ch].voiceperiod += mod.channel[ch].slidedownspeed
  if (mod.channel[ch].voiceperiod > 7680) mod.channel[ch].voiceperiod = 7680
  mod.channel[ch].flags |= 3 // recalc speed
}
Fasttracker.prototype.effect_t1_3 = function (mod, ch) { // 3 slide to note
  if (mod.channel[ch].voiceperiod < mod.channel[ch].slideto) {
    mod.channel[ch].voiceperiod += mod.channel[ch].slidetospeed
    if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto) { mod.channel[ch].voiceperiod = mod.channel[ch].slideto }
  }
  if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto) {
    mod.channel[ch].voiceperiod -= mod.channel[ch].slidetospeed
    if (mod.channel[ch].voiceperiod < mod.channel[ch].slideto) { mod.channel[ch].voiceperiod = mod.channel[ch].slideto }
  }
  mod.channel[ch].flags |= 3 // recalc speed
}
Fasttracker.prototype.effect_t1_4 = function (mod, ch) { // 4 vibrato
  const waveform = mod.vibratotable[mod.channel[ch].vibratowave & 3][mod.channel[ch].vibratopos] / 63.0
  const a = mod.channel[ch].vibratodepth * waveform
  mod.channel[ch].voiceperiod += a
  mod.channel[ch].flags |= 1
}
Fasttracker.prototype.effect_t1_5 = function (mod, ch) { // 5 volslide + slide to note
  mod.effect_t1_3(mod, ch) // slide to note
  mod.effect_t1_a(mod, ch) // volslide
}
Fasttracker.prototype.effect_t1_6 = function (mod, ch) { // 6 volslide + vibrato
  mod.effect_t1_4(mod, ch) // vibrato
  mod.effect_t1_a(mod, ch) // volslide
}
Fasttracker.prototype.effect_t1_7 = function (mod, ch) { // 7
}
Fasttracker.prototype.effect_t1_8 = function (mod, ch) { // 8 unused
}
Fasttracker.prototype.effect_t1_9 = function (mod, ch) { // 9 set sample offset
}
Fasttracker.prototype.effect_t1_a = function (mod, ch) { // a volume slide
  if (!(mod.channel[ch].volslide & 0x0f)) {
    // y is zero, slide up
    mod.channel[ch].voicevolume += (mod.channel[ch].volslide >> 4)
    if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
  }
  if (!(mod.channel[ch].volslide & 0xf0)) {
    // x is zero, slide down
    mod.channel[ch].voicevolume -= (mod.channel[ch].volslide & 0x0f)
    if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
  }
}
Fasttracker.prototype.effect_t1_b = function (mod, ch) { // b pattern jump
}
Fasttracker.prototype.effect_t1_c = function (mod, ch) { // c set volume
}
Fasttracker.prototype.effect_t1_d = function (mod, ch) { // d pattern break
}
Fasttracker.prototype.effect_t1_e = function (mod, ch) { // e
  const i = (mod.channel[ch].data & 0xf0) >> 4
  mod.effects_t1_e[i](mod, ch)
}
Fasttracker.prototype.effect_t1_f = function (mod, ch) { // f
}
Fasttracker.prototype.effect_t1_g = function (mod, ch) { // g set global volume
}
Fasttracker.prototype.effect_t1_h = function (mod, ch) { // h global volume slude
  if (!(mod.globalvolslide & 0x0f)) {
    // y is zero, slide up
    mod.volume += (mod.globalvolslide >> 4)
    if (mod.volume > 64) mod.volume = 64
  }
  if (!(mod.globalvolslide & 0xf0)) {
    // x is zero, slide down
    mod.volume -= (mod.globalvolslide & 0x0f)
    if (mod.volume < 0) mod.volume = 0
  }
}
Fasttracker.prototype.effect_t1_i = function (mod, ch) { // i
}
Fasttracker.prototype.effect_t1_j = function (mod, ch) { // j
}
Fasttracker.prototype.effect_t1_k = function (mod, ch) { // k key off
}
Fasttracker.prototype.effect_t1_l = function (mod, ch) { // l set envelope position
}
Fasttracker.prototype.effect_t1_m = function (mod, ch) { // m
}
Fasttracker.prototype.effect_t1_n = function (mod, ch) { // n
}
Fasttracker.prototype.effect_t1_o = function (mod, ch) { // o
}
Fasttracker.prototype.effect_t1_p = function (mod, ch) { // p panning slide
}
Fasttracker.prototype.effect_t1_q = function (mod, ch) { // q
}
Fasttracker.prototype.effect_t1_r = function (mod, ch) { // r multi retrig note
}
Fasttracker.prototype.effect_t1_s = function (mod, ch) { // s
}
Fasttracker.prototype.effect_t1_t = function (mod, ch) { // t tremor
}
Fasttracker.prototype.effect_t1_u = function (mod, ch) { // u
}
Fasttracker.prototype.effect_t1_v = function (mod, ch) { // v
}
Fasttracker.prototype.effect_t1_w = function (mod, ch) { // w
}
Fasttracker.prototype.effect_t1_x = function (mod, ch) { // x extra fine porta up/down
}
Fasttracker.prototype.effect_t1_y = function (mod, ch) { // y
}
Fasttracker.prototype.effect_t1_z = function (mod, ch) { // z
}

//
// tick 1+ effect e functions
//
Fasttracker.prototype.effect_t1_e0 = function (mod, ch) { // e0
}
Fasttracker.prototype.effect_t1_e1 = function (mod, ch) { // e1
}
Fasttracker.prototype.effect_t1_e2 = function (mod, ch) { // e2
}
Fasttracker.prototype.effect_t1_e3 = function (mod, ch) { // e3
}
Fasttracker.prototype.effect_t1_e4 = function (mod, ch) { // e4
}
Fasttracker.prototype.effect_t1_e5 = function (mod, ch) { // e5
}
Fasttracker.prototype.effect_t1_e6 = function (mod, ch) { // e6
}
Fasttracker.prototype.effect_t1_e7 = function (mod, ch) { // e7
}
Fasttracker.prototype.effect_t1_e8 = function (mod, ch) { // e8
}
Fasttracker.prototype.effect_t1_e9 = function (mod, ch) { // e9 retrig sample
  if (mod.tick % (mod.channel[ch].data & 0x0f) == 0) {
    mod.channel[ch].samplepos = 0
    mod.channel[ch].playdir = 1

    mod.channel[ch].trigramp = 0.0
    mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample

    mod.channel[ch].fadeoutpos = 65535
    mod.channel[ch].volenvpos = 0
    mod.channel[ch].panenvpos = 0
  }
}
Fasttracker.prototype.effect_t1_ea = function (mod, ch) { // ea
}
Fasttracker.prototype.effect_t1_eb = function (mod, ch) { // eb
}
Fasttracker.prototype.effect_t1_ec = function (mod, ch) { // ec cut sample
  if (mod.tick == (mod.channel[ch].data & 0x0f)) { mod.channel[ch].voicevolume = 0 }
}
Fasttracker.prototype.effect_t1_ed = function (mod, ch) { // ed delay sample
  mod.effect_t0_ed(mod, ch)
}
Fasttracker.prototype.effect_t1_ee = function (mod, ch) { // ee
}
Fasttracker.prototype.effect_t1_ef = function (mod, ch) { // ef
}
/*
  (c) 2012-2021 Noora Halme et al. (see AUTHORS)

  This code is licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

  Scream Tracker 3 module player class

  todo:
  - are Exx, Fxx and Gxx supposed to share a single
    command data memory?
*/

function Screamtracker () {
  let i, t

  this.clearsong()
  this.initialize()

  this.playing = false
  this.paused = false
  this.repeat = false

  this.filter = false

  this.syncqueue = []

  this.samplerate = 44100

  this.periodtable = new Float32Array([
    27392.0, 25856.0, 24384.0, 23040.0, 21696.0, 20480.0, 19328.0, 18240.0, 17216.0, 16256.0, 15360.0, 14496.0,
    13696.0, 12928.0, 12192.0, 11520.0, 10848.0, 10240.0, 9664.0, 9120.0, 8608.0, 8128.0, 7680.0, 7248.0,
    6848.0, 6464.0, 6096.0, 5760.0, 5424.0, 5120.0, 4832.0, 4560.0, 4304.0, 4064.0, 3840.0, 3624.0,
    3424.0, 3232.0, 3048.0, 2880.0, 2712.0, 2560.0, 2416.0, 2280.0, 2152.0, 2032.0, 1920.0, 1812.0,
    1712.0, 1616.0, 1524.0, 1440.0, 1356.0, 1280.0, 1208.0, 1140.0, 1076.0, 1016.0, 960.0, 906.0,
    856.0, 808.0, 762.0, 720.0, 678.0, 640.0, 604.0, 570.0, 538.0, 508.0, 480.0, 453.0,
    428.0, 404.0, 381.0, 360.0, 339.0, 320.0, 302.0, 285.0, 269.0, 254.0, 240.0, 226.0,
    214.0, 202.0, 190.0, 180.0, 170.0, 160.0, 151.0, 143.0, 135.0, 127.0, 120.0, 113.0,
    107.0, 101.0, 95.0, 90.0, 85.0, 80.0, 75.0, 71.0, 67.0, 63.0, 60.0, 56.0
  ])

  this.retrigvoltab = new Float32Array([
    0, -1, -2, -4, -8, -16, 0.66, 0.5,
    0, 1, 2, 4, 8, 16, 1.50, 2.0
  ])

  this.pan_r = new Float32Array(32)
  this.pan_l = new Float32Array(32)
  for (i = 0; i < 32; i++) { this.pan_r[i] = 0.5; this.pan_l[i] = 0.5 }

  // calc tables for vibrato waveforms
  this.vibratotable = new Array()
  for (t = 0; t < 4; t++) {
    this.vibratotable[t] = new Float32Array(256)
    for (i = 0; i < 256; i++) {
      switch (t) {
        case 0:
          this.vibratotable[t][i] = 127 * Math.sin(Math.PI * 2 * (i / 256))
          break
        case 1:
          this.vibratotable[t][i] = 127 - i
          break
        case 2:
          this.vibratotable[t][i] = (i < 128) ? 127 : -128
          break
        case 3:
          this.vibratotable[t][i] = Math.random() * 255 - 128
          break
      }
    }
  }

  // effect jumptables for tick 0 and tick 1+
  this.effects_t0 = new Array(
    function (mod, ch) {}, // zero is ignored
    this.effect_t0_a, this.effect_t0_b, this.effect_t0_c, this.effect_t0_d, this.effect_t0_e,
    this.effect_t0_f, this.effect_t0_g, this.effect_t0_h, this.effect_t0_i, this.effect_t0_j,
    this.effect_t0_k, this.effect_t0_l, this.effect_t0_m, this.effect_t0_n, this.effect_t0_o,
    this.effect_t0_p, this.effect_t0_q, this.effect_t0_r, this.effect_t0_s, this.effect_t0_t,
    this.effect_t0_u, this.effect_t0_v, this.effect_t0_w, this.effect_t0_x, this.effect_t0_y,
    this.effect_t0_z
  )
  this.effects_t0_s = new Array(
    this.effect_t0_s0, this.effect_t0_s1, this.effect_t0_s2, this.effect_t0_s3, this.effect_t0_s4,
    this.effect_t0_s5, this.effect_t0_s6, this.effect_t0_s7, this.effect_t0_s8, this.effect_t0_s9,
    this.effect_t0_sa, this.effect_t0_sb, this.effect_t0_sc, this.effect_t0_sd, this.effect_t0_se,
    this.effect_t0_sf
  )
  this.effects_t1 = new Array(
    function (mod, ch) {}, // zero is ignored
    this.effect_t1_a, this.effect_t1_b, this.effect_t1_c, this.effect_t1_d, this.effect_t1_e,
    this.effect_t1_f, this.effect_t1_g, this.effect_t1_h, this.effect_t1_i, this.effect_t1_j,
    this.effect_t1_k, this.effect_t1_l, this.effect_t1_m, this.effect_t1_n, this.effect_t1_o,
    this.effect_t1_p, this.effect_t1_q, this.effect_t1_r, this.effect_t1_s, this.effect_t1_t,
    this.effect_t1_u, this.effect_t1_v, this.effect_t1_w, this.effect_t1_x, this.effect_t1_y,
    this.effect_t1_z
  )
  this.effects_t1_s = new Array(
    this.effect_t1_s0, this.effect_t1_s1, this.effect_t1_s2, this.effect_t1_s3, this.effect_t1_s4,
    this.effect_t1_s5, this.effect_t1_s6, this.effect_t1_s7, this.effect_t1_s8, this.effect_t1_s9,
    this.effect_t1_sa, this.effect_t1_sb, this.effect_t1_sc, this.effect_t1_sd, this.effect_t1_se,
    this.effect_t1_sf
  )
}

// clear song data
Screamtracker.prototype.clearsong = function () {
  let i

  this.title = ''
  this.signature = ''

  this.songlen = 1
  this.repeatpos = 0
  this.patterntable = new ArrayBuffer(256)
  for (i = 0; i < 256; i++) this.patterntable[i] = 0

  this.channels = 0
  this.ordNum = 0
  this.insNum = 0
  this.patNum = 0

  this.globalVol = 64
  this.initSpeed = 6
  this.initBPM = 125

  this.fastslide = 0

  this.mixval = 8.0

  this.sample = new Array()
  for (i = 0; i < 255; i++) {
    this.sample[i] = new Object()
    this.sample[i].length = 0
    this.sample[i].loopstart = 0
    this.sample[i].loopend = 0
    this.sample[i].looplength = 0
    this.sample[i].volume = 64
    this.sample[i].loop = 0
    this.sample[i].c2spd = 8363
    this.sample[i].name = ''
    this.sample[i].data = 0
  }

  this.pattern = new Array()

  this.looprow = 0
  this.loopstart = 0
  this.loopcount = 0

  this.patterndelay = 0
  this.patternwait = 0
}

// initialize all player variables to defaults prior to starting playback
Screamtracker.prototype.initialize = function () {
  this.syncqueue = []

  this.tick = -1
  this.position = 0
  this.row = 0
  this.flags = 0

  this.volume = this.globalVol
  this.speed = this.initSpeed
  this.bpm = this.initBPM
  this.stt = 0
  this.breakrow = 0
  this.patternjump = 0
  this.patterndelay = 0
  this.patternwait = 0
  this.endofsong = false

  this.channel = new Array()
  for (i = 0; i < this.channels; i++) {
    this.channel[i] = new Object()
    this.channel[i].sample = 0
    this.channel[i].note = 24
    this.channel[i].command = 0
    this.channel[i].data = 0
    this.channel[i].samplepos = 0
    this.channel[i].samplespeed = 0
    this.channel[i].flags = 0
    this.channel[i].noteon = 0

    this.channel[i].slidespeed = 0
    this.channel[i].slideto = 0
    this.channel[i].slidetospeed = 0
    this.channel[i].arpeggio = 0

    this.channel[i].period = 0
    this.channel[i].volume = 64
    this.channel[i].voiceperiod = 0
    this.channel[i].voicevolume = 0
    this.channel[i].oldvoicevolume = 0

    this.channel[i].semitone = 12
    this.channel[i].vibratospeed = 0
    this.channel[i].vibratodepth = 0
    this.channel[i].vibratopos = 0
    this.channel[i].vibratowave = 0

    this.channel[i].lastoffset = 0
    this.channel[i].lastretrig = 0

    this.channel[i].volramp = 0
    this.channel[i].volrampfrom = 0

    this.channel[i].trigramp = 0
    this.channel[i].trigrampfrom = 0.0

    this.channel[i].currentsample = 0.0
    this.channel[i].lastsample = 0.0
  }
}

// parse the module from local buffer
Screamtracker.prototype.parse = function (buffer) {
  let i, j, c

  if (!buffer) return false

  // check s3m signature and type
  for (i = 0; i < 4; i++) this.signature += String.fromCharCode(buffer[0x002c + i])
  if (this.signature != 'SCRM') return false
  if (buffer[0x001d] != 0x10) return false

  // get channel count
  for (this.channels = 0, i = 0; i < 32; i++, this.channels++) { if (buffer[0x0040 + i] & 0x80) break }

  // default panning 3/C/3/...
  for (i = 0; i < 32; i++) {
    if (!(buffer[0x0040 + i] & 0x80)) {
      c = buffer[0x0040 + i] & 15
      if (c < 8) {
        this.pan_r[i] = 0.2
        this.pan_l[i] = 0.8
      } else {
        this.pan_r[i] = 0.8
        this.pan_l[i] = 0.2
      }
    }
  }

  i = 0
  while (buffer[i] && i < 0x1c) this.title += dos2utf(buffer[i++])

  this.ordNum = buffer[0x0020] | (buffer[0x0021] << 8)
  this.insNum = buffer[0x0022] | (buffer[0x0023] << 8)
  this.patNum = buffer[0x0024] | (buffer[0x0025] << 8)

  this.globalVol = buffer[0x0030]
  this.initSpeed = buffer[0x0031]
  this.initBPM = buffer[0x0032]

  this.fastslide = (buffer[0x0026] & 64) ? 1 : 0

  this.speed = this.initSpeed
  this.bpm = this.initBPM

  // check for additional panning info
  if (buffer[0x0035] == 0xfc) {
    for (i = 0; i < 32; i++) {
      c = buffer[0x0070 + this.ordNum + this.insNum * 2 + this.patNum * 2 + i]
      if (c & 0x10) {
        c &= 0x0f
        this.pan_r[i] = (c / 15.0)
        this.pan_l[i] = 1.0 - this.pan_r[i]
      }
    }
  }

  // check for mono panning
  this.mixval = buffer[0x0033]
  if ((this.mixval & 0x80) == 0x80) {
    for (i = 0; i < 32; i++) {
      this.pan_r[i] = 0.5
      this.pan_l[i] = 0.5
    }
  }

  // calculate master mix scaling factor
  this.mixval = 128.0 / Math.max(0x10, this.mixval & 0x7f) // (8.0 when mastervol is 0x10, 1.0 when mastervol is 0x7f)

  // load orders
  for (i = 0; i < this.ordNum; i++) this.patterntable[i] = buffer[0x0060 + i]
  for (this.songlen = 0, i = 0; i < this.ordNum; i++) if (this.patterntable[i] != 255) this.songlen++

  // load instruments
  this.sample = new Array(this.insNum)
  for (i = 0; i < this.insNum; i++) {
    this.sample[i] = new Object()

    var offset = (buffer[0x0060 + this.ordNum + i * 2] | buffer[0x0060 + this.ordNum + i * 2 + 1] << 8) * 16
    j = 0
    this.sample[i].name = ''
    while (buffer[offset + 0x0030 + j] && j < 28) {
      this.sample[i].name += dos2utf(buffer[offset + 0x0030 + j])
      j++
    }
    this.sample[i].length = buffer[offset + 0x10] | buffer[offset + 0x11] << 8
    this.sample[i].loopstart = buffer[offset + 0x14] | buffer[offset + 0x15] << 8
    this.sample[i].loopend = buffer[offset + 0x18] | buffer[offset + 0x19] << 8
    this.sample[i].looplength = this.sample[i].loopend - this.sample[i].loopstart
    this.sample[i].volume = buffer[offset + 0x1c]
    this.sample[i].loop = buffer[offset + 0x1f] & 1
    this.sample[i].stereo = (buffer[offset + 0x1f] & 2) >> 1
    this.sample[i].bits = (buffer[offset + 0x1f] & 4) ? 16 : 8
    this.sample[i].c2spd = buffer[offset + 0x20] | buffer[offset + 0x21] << 8

    // sample data
    const smpoffset = (buffer[offset + 0x0d] << 16 | buffer[offset + 0x0e] | buffer[offset + 0x0f] << 8) * 16
    this.sample[i].data = new Float32Array(this.sample[i].length)
    for (j = 0; j < this.sample[i].length; j++) this.sample[i].data[j] = (buffer[smpoffset + j] - 128) / 128.0 // convert to mono float signed
  }

  // load and unpack patterns
  let max_ch = 0
  this.pattern = new Array()
  for (i = 0; i < this.patNum; i++) {
    var offset = (buffer[0x0060 + this.ordNum + this.insNum * 2 + i * 2] | buffer[0x0060 + this.ordNum + this.insNum * 2 + i * 2 + 1] << 8) * 16
    const patlen = buffer[offset] | buffer[offset + 1] << 8
    let row = 0; let pos = 0; let ch = 0

    this.pattern[i] = new Uint8Array(this.channels * 64 * 5)
    for (row = 0; row < 64; row++) {
      for (ch = 0; ch < this.channels; ch++) {
        this.pattern[i][row * this.channels * 5 + ch * 5 + 0] = 255
        this.pattern[i][row * this.channels * 5 + ch * 5 + 1] = 0
        this.pattern[i][row * this.channels * 5 + ch * 5 + 2] = 255
        this.pattern[i][row * this.channels * 5 + ch * 5 + 3] = 255
        this.pattern[i][row * this.channels * 5 + ch * 5 + 4] = 0
      }
    }

    if (!offset) continue // fix for control_e.s3m
    row = 0; ch = 0
    offset += 2
    while (row < 64) {
      if (c = buffer[offset + pos++]) {
        ch = c & 31
        if (ch < this.channels) {
          if (ch > max_ch) {
            for (j = 0; j < this.songlen; j++) {
              if (this.patterntable[j] == i) { max_ch = ch }
            } // only if pattern is actually used
          }
          if (c & 32) {
            this.pattern[i][row * this.channels * 5 + ch * 5 + 0] = buffer[offset + pos++] // note
            this.pattern[i][row * this.channels * 5 + ch * 5 + 1] = buffer[offset + pos++] // instrument
          }
          if (c & 64) { this.pattern[i][row * this.channels * 5 + ch * 5 + 2] = buffer[offset + pos++] } // volume
          if (c & 128) {
            this.pattern[i][row * this.channels * 5 + ch * 5 + 3] = buffer[offset + pos++] // command
            this.pattern[i][row * this.channels * 5 + ch * 5 + 4] = buffer[offset + pos++] // parameter
            if (!this.pattern[i][row * this.channels * 5 + ch * 5 + 3] || this.pattern[i][row * this.channels * 5 + ch * 5 + 3] > 26) {
              this.pattern[i][row * this.channels * 5 + ch * 5 + 3] = 255
            }
          }
        } else {
          if (c & 32) pos += 2
          if (c & 64) pos++
          if (c & 128) pos += 2
        }
      } else row++
    }
  }
  this.patterns = this.patNum

  // how many channels had actually pattern data on them? trim off the extra channels
  const oldch = this.channels
  this.channels = max_ch + 1
  for (i = 0; i < this.patNum; i++) {
    const oldpat = new Uint8Array(this.pattern[i])
    this.pattern[i] = new Uint8Array(this.channels * 64 * 5)
    for (j = 0; j < 64; j++) {
      for (c = 0; c < this.channels; c++) {
        this.pattern[i][j * this.channels * 5 + c * 5 + 0] = oldpat[j * oldch * 5 + c * 5 + 0]
        this.pattern[i][j * this.channels * 5 + c * 5 + 1] = oldpat[j * oldch * 5 + c * 5 + 1]
        this.pattern[i][j * this.channels * 5 + c * 5 + 2] = oldpat[j * oldch * 5 + c * 5 + 2]
        this.pattern[i][j * this.channels * 5 + c * 5 + 3] = oldpat[j * oldch * 5 + c * 5 + 3]
        this.pattern[i][j * this.channels * 5 + c * 5 + 4] = oldpat[j * oldch * 5 + c * 5 + 4]
      }
    }
  }

  this.chvu = new Float32Array(this.channels)
  for (i = 0; i < this.channels; i++) this.chvu[i] = 0.0

  return true
}

// advance player
Screamtracker.prototype.advance = function (mod) {
  mod.stt = (((mod.samplerate * 60) / mod.bpm) / 4) / 6 // samples to tick

  // advance player
  mod.tick++
  mod.flags |= 1

  // new row on this tick?
  if (mod.tick >= mod.speed) {
    if (mod.patterndelay) { // delay pattern
      if (mod.tick < ((mod.patternwait + 1) * mod.speed)) {
        mod.patternwait++
      } else {
        mod.row++; mod.tick = 0; mod.flags |= 2; mod.patterndelay = 0
      }
    } else {
      if (mod.flags & (16 + 32 + 64)) {
        if (mod.flags & 64) { // loop pattern?
          mod.row = mod.looprow
          mod.flags &= 0xa1
          mod.flags |= 2
        } else {
          if (mod.flags & 16) { // pattern jump/break?
            mod.position = mod.patternjump
            mod.row = mod.breakrow
            mod.patternjump = 0
            mod.breakrow = 0
            mod.flags &= 0xe1
            mod.flags |= 2
          }
        }
        mod.tick = 0
      } else {
        mod.row++; mod.tick = 0; mod.flags |= 2
      }
    }
  }

  // step to new pattern?
  if (mod.row >= 64) {
    mod.position++
    mod.row = 0
    mod.flags |= 4
    while (mod.patterntable[mod.position] == 254) mod.position++ // skip markers
  }

  // end of song?
  if (mod.position >= mod.songlen || mod.patterntable[mod.position] == 255) {
    if (mod.repeat) {
      mod.position = 0
    } else {
      this.endofsong = true
    }
  }
}

// process one channel on a row in pattern p, pp is an offset to pattern data
Screamtracker.prototype.process_note = function (mod, p, ch) {
  let n, s, pp, pv

  pp = mod.row * 5 * this.channels + ch * 5

  n = mod.pattern[p][pp]
  s = mod.pattern[p][pp + 1]
  if (s) {
    mod.channel[ch].sample = s - 1
    mod.channel[ch].volume = mod.sample[s - 1].volume
    mod.channel[ch].voicevolume = mod.channel[ch].volume
    if (n == 255 && (mod.channel[ch].samplepos > mod.sample[s - 1].length)) {
      mod.channel[ch].trigramp = 0.0
      mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample
      mod.channel[ch].samplepos = 0
    }
  }

  if (n < 254) {
    // calc period for note
    n = (n & 0x0f) + (n >> 4) * 12
    pv = (8363.0 * mod.periodtable[n]) / mod.sample[mod.channel[ch].sample].c2spd

    // noteon, except if command=0x07 ('G') (porta to note) or 0x0c ('L') (porta+volslide)
    if ((mod.channel[ch].command != 0x07) && (mod.channel[ch].command != 0x0c)) {
      mod.channel[ch].note = n
      mod.channel[ch].period = pv
      mod.channel[ch].voiceperiod = mod.channel[ch].period
      mod.channel[ch].samplepos = 0
      if (mod.channel[ch].vibratowave > 3) mod.channel[ch].vibratopos = 0

      mod.channel[ch].trigramp = 0.0
      mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample

      mod.channel[ch].flags |= 3 // force sample speed recalc
      mod.channel[ch].noteon = 1
    }
    // in either case, set the slide to note target to note period
    mod.channel[ch].slideto = pv
  } else if (n == 254) {
    mod.channel[ch].noteon = 0 // sample off
    mod.channel[ch].voicevolume = 0
  }

  if (mod.pattern[p][pp + 2] <= 64) {
    mod.channel[ch].volume = mod.pattern[p][pp + 2]
    mod.channel[ch].voicevolume = mod.channel[ch].volume
  }
}

// advance player and all channels by a tick
Screamtracker.prototype.process_tick = function (mod) {
  // advance global player state by a tick
  mod.advance(mod)

  // advance all channels
  for (let ch = 0; ch < mod.channels; ch++) {
    // calculate playback position
    const p = mod.patterntable[mod.position]
    const pp = mod.row * 5 * mod.channels + ch * 5

    mod.channel[ch].oldvoicevolume = mod.channel[ch].voicevolume

    if (mod.flags & 2) { // new row
      mod.channel[ch].command = mod.pattern[p][pp + 3]
      mod.channel[ch].data = mod.pattern[p][pp + 4]
      if (!(mod.channel[ch].command == 0x13 && (mod.channel[ch].data & 0xf0) == 0xd0)) { // note delay?
        mod.process_note(mod, p, ch)
      }
    }

    // kill empty samples
    if (!mod.sample[mod.channel[ch].sample].length) mod.channel[ch].noteon = 0

    // run effects on each new tick
    if (mod.channel[ch].command < 27) {
      if (!mod.tick) {
        // process only on tick 0 effects
        mod.effects_t0[mod.channel[ch].command](mod, ch)
      } else {
        mod.effects_t1[mod.channel[ch].command](mod, ch)
      }
    }

    // advance vibrato on each new tick
    mod.channel[ch].vibratopos += mod.channel[ch].vibratospeed * 2
    mod.channel[ch].vibratopos &= 0xff

    if (mod.channel[ch].oldvoicevolume != mod.channel[ch].voicevolume) {
      mod.channel[ch].volrampfrom = mod.channel[ch].oldvoicevolume
      mod.channel[ch].volramp = 0.0
    }

    // recalc sample speed if voiceperiod has changed
    if ((mod.channel[ch].flags & 1 || mod.flags & 2) && mod.channel[ch].voiceperiod) { mod.channel[ch].samplespeed = (14317056.0 / mod.channel[ch].voiceperiod) / mod.samplerate }

    // clear channel flags
    mod.channel[ch].flags = 0
  }

  // clear global flags after all channels are processed
  mod.flags &= 0x70
}

// mix an audio buffer with data
Screamtracker.prototype.mix = function (mod, bufs, buflen) {
  const outp = new Float32Array(2)

  // return a buffer of silence if not playing
  if (mod.paused || mod.endofsong || !mod.playing) {
    for (var s = 0; s < buflen; s++) {
      bufs[0][s] = 0.0
      bufs[1][s] = 0.0
      for (var ch = 0; ch < mod.chvu.length; ch++) mod.chvu[ch] = 0.0
    }
    return
  }

  // fill audiobuffer
  for (var s = 0; s < buflen; s++) {
    outp[0] = 0.0
    outp[1] = 0.0

    // if STT has run out, step player forward by tick
    if (mod.stt <= 0) mod.process_tick(mod)

    // mix channels
    for (var ch = 0; ch < mod.channels; ch++) {
      let fl = 0.0; fr = 0.0; fs = 0.0
      const si = mod.channel[ch].sample

      // add channel output to left/right master outputs
      mod.channel[ch].currentsample = 0.0 // assume note is off
      if (mod.channel[ch].noteon || (!mod.channel[ch].noteon && mod.channel[ch].volramp < 1.0)) {
        if (mod.sample[si].length > mod.channel[ch].samplepos) {
          fl = mod.channel[ch].lastsample

          // interpolate towards current sample
          let f = mod.channel[ch].samplepos - Math.floor(mod.channel[ch].samplepos)
          fs = mod.sample[si].data[Math.floor(mod.channel[ch].samplepos)]
          fl = f * fs + (1.0 - f) * fl

          // smooth out discontinuities from retrig and sample offset
          f = mod.channel[ch].trigramp
          fl = f * fl + (1.0 - f) * mod.channel[ch].trigrampfrom
          f += 1.0 / 128.0
          mod.channel[ch].trigramp = Math.min(1.0, f)
          mod.channel[ch].currentsample = fl

          // ramp volume changes over 64 samples to avoid clicks
          fr = fl * (mod.channel[ch].voicevolume / 64.0)
          f = mod.channel[ch].volramp
          fl = f * fr + (1.0 - f) * (fl * (mod.channel[ch].volrampfrom / 64.0))
          f += (1.0 / 64.0)
          mod.channel[ch].volramp = Math.min(1.0, f)

          // pan samples
          fr = fl * mod.pan_r[ch]
          fl *= mod.pan_l[ch]
        }
        outp[0] += fl
        outp[1] += fr

        const oldpos = mod.channel[ch].samplepos
        mod.channel[ch].samplepos += mod.channel[ch].samplespeed
        if (Math.floor(mod.channel[ch].samplepos) > Math.floor(oldpos)) mod.channel[ch].lastsample = fs

        // loop or stop sample?
        if (mod.sample[mod.channel[ch].sample].loop) {
          if (mod.channel[ch].samplepos >= mod.sample[mod.channel[ch].sample].loopend) {
            mod.channel[ch].samplepos -= mod.sample[mod.channel[ch].sample].looplength
            mod.channel[ch].lastsample = mod.channel[ch].currentsample
          }
        } else if (mod.channel[ch].samplepos >= mod.sample[mod.channel[ch].sample].length) mod.channel[ch].noteon = 0
      }
      mod.chvu[ch] = Math.max(mod.chvu[ch], Math.abs(fl + fr))
    }

    // done - store to output buffer
    t = mod.volume / 64.0
    bufs[0][s] = outp[0] * t
    bufs[1][s] = outp[1] * t
    mod.stt--
  }
}

//
// tick 0 effect functions
//
Screamtracker.prototype.effect_t0_a = function (mod, ch) { // set speed
  if (mod.channel[ch].data > 0) mod.speed = mod.channel[ch].data
}
Screamtracker.prototype.effect_t0_b = function (mod, ch) { // pattern jump
  mod.breakrow = 0
  mod.patternjump = mod.channel[ch].data
  mod.flags |= 16
}
Screamtracker.prototype.effect_t0_c = function (mod, ch) { // pattern break
  mod.breakrow = ((mod.channel[ch].data & 0xf0) >> 4) * 10 + (mod.channel[ch].data & 0x0f)
  if (!(mod.flags & 16)) mod.patternjump = mod.position + 1
  mod.flags |= 16
}
Screamtracker.prototype.effect_t0_d = function (mod, ch) { // volume slide
  if (mod.channel[ch].data) mod.channel[ch].volslide = mod.channel[ch].data
  if ((mod.channel[ch].volslide & 0x0f) == 0x0f) { // DxF fine up
    mod.channel[ch].voicevolume += mod.channel[ch].volslide >> 4
  } else if ((mod.channel[ch].volslide >> 4) == 0x0f) { // DFx fine down
    mod.channel[ch].voicevolume -= mod.channel[ch].volslide & 0x0f
  } else {
    if (mod.fastslide) mod.effect_t1_d(mod, ch)
  }

  if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
  if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
}
Screamtracker.prototype.effect_t0_e = function (mod, ch) { // slide down
  if (mod.channel[ch].data) mod.channel[ch].slidespeed = mod.channel[ch].data
  if ((mod.channel[ch].slidespeed & 0xf0) == 0xf0) {
    mod.channel[ch].voiceperiod += (mod.channel[ch].slidespeed & 0x0f) << 2
  }
  if ((mod.channel[ch].slidespeed & 0xf0) == 0xe0) {
    mod.channel[ch].voiceperiod += (mod.channel[ch].slidespeed & 0x0f)
  }
  if (mod.channel[ch].voiceperiod > 27392) mod.channel[ch].noteon = 0
  mod.channel[ch].flags |= 3 // recalc speed
}
Screamtracker.prototype.effect_t0_f = function (mod, ch) { // slide up
  if (mod.channel[ch].data) mod.channel[ch].slidespeed = mod.channel[ch].data
  if ((mod.channel[ch].slidespeed & 0xf0) == 0xf0) {
    mod.channel[ch].voiceperiod -= (mod.channel[ch].slidespeed & 0x0f) << 2
  }
  if ((mod.channel[ch].slidespeed & 0xf0) == 0xe0) {
    mod.channel[ch].voiceperiod -= (mod.channel[ch].slidespeed & 0x0f)
  }
  if (mod.channel[ch].voiceperiod < 56) mod.channel[ch].noteon = 0
  mod.channel[ch].flags |= 3 // recalc speed
}
Screamtracker.prototype.effect_t0_g = function (mod, ch) { // slide to note
//  if (mod.channel[ch].data) mod.channel[ch].slidetospeed=mod.channel[ch].data;
  if (mod.channel[ch].data) mod.channel[ch].slidespeed = mod.channel[ch].data
}
Screamtracker.prototype.effect_t0_h = function (mod, ch) { // vibrato
  if (mod.channel[ch].data & 0x0f && mod.channel[ch].data & 0xf0) {
    mod.channel[ch].vibratodepth = (mod.channel[ch].data & 0x0f)
    mod.channel[ch].vibratospeed = (mod.channel[ch].data & 0xf0) >> 4
  }
}
Screamtracker.prototype.effect_t0_i = function (mod, ch) { // tremor
}
Screamtracker.prototype.effect_t0_j = function (mod, ch) { // arpeggio
  if (mod.channel[ch].data) mod.channel[ch].arpeggio = mod.channel[ch].data
  mod.channel[ch].voiceperiod = mod.channel[ch].period
  mod.channel[ch].flags |= 3 // recalc speed
}
Screamtracker.prototype.effect_t0_k = function (mod, ch) { // vibrato + volslide
  mod.effect_t0_d(mod, ch)
}
Screamtracker.prototype.effect_t0_l = function (mod, ch) { // slide to note + volslide
  mod.effect_t0_d(mod, ch)
}
Screamtracker.prototype.effect_t0_m = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_n = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_o = function (mod, ch) { // set sample offset
  if (mod.channel[ch].data) mod.channel[ch].lastoffset = mod.channel[ch].data

  if (mod.channel[ch].lastoffset * 256 < mod.sample[mod.channel[ch].sample].length) {
    mod.channel[ch].samplepos = mod.channel[ch].lastoffset * 256
    mod.channel[ch].trigramp = 0.0
    mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample
  }
}
Screamtracker.prototype.effect_t0_p = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_q = function (mod, ch) { // retrig note
  if (mod.channel[ch].data) mod.channel[ch].lastretrig = mod.channel[ch].data
  mod.effect_t1_q(mod, ch) // to retrig also on lines with no note but Qxy command
}
Screamtracker.prototype.effect_t0_r = function (mod, ch) { // tremolo
}
Screamtracker.prototype.effect_t0_s = function (mod, ch) { // Sxy effects
  const i = (mod.channel[ch].data & 0xf0) >> 4
  mod.effects_t0_s[i](mod, ch)
}
Screamtracker.prototype.effect_t0_t = function (mod, ch) { // set tempo
  if (mod.channel[ch].data > 32) mod.bpm = mod.channel[ch].data
}
Screamtracker.prototype.effect_t0_u = function (mod, ch) { // fine vibrato
}
Screamtracker.prototype.effect_t0_v = function (mod, ch) { // set global volume
  mod.volume = mod.channel[ch].data
}
Screamtracker.prototype.effect_t0_w = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_x = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_y = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_z = function (mod, ch) { // sync for FMOD (was: unused)
  mod.syncqueue.unshift(mod.channel[ch].data & 0x0f)
}

//
// tick 0 special Sxy effect functions
//
Screamtracker.prototype.effect_t0_s0 = function (mod, ch) { // set filter (not implemented)
}
Screamtracker.prototype.effect_t0_s1 = function (mod, ch) { // set glissando control
}
Screamtracker.prototype.effect_t0_s2 = function (mod, ch) { // sync for BASS (was: set finetune)
  mod.syncqueue.unshift(mod.channel[ch].data & 0x0f)
}
Screamtracker.prototype.effect_t0_s3 = function (mod, ch) { // set vibrato waveform
  mod.channel[ch].vibratowave = mod.channel[ch].data & 0x07
}
Screamtracker.prototype.effect_t0_s4 = function (mod, ch) { // set tremolo waveform
}
Screamtracker.prototype.effect_t0_s5 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_s6 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_s7 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_s8 = function (mod, ch) { // set panning position
  mod.pan_r[ch] = (mod.channel[ch].data & 0x0f) / 15.0
  mod.pan_l[ch] = 1.0 - mod.pan_r[ch]
}
Screamtracker.prototype.effect_t0_s9 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t0_sa = function (mod, ch) { // old stereo control (not implemented)
}
Screamtracker.prototype.effect_t0_sb = function (mod, ch) { // loop pattern
  if (mod.channel[ch].data & 0x0f) {
    if (mod.loopcount) {
      mod.loopcount--
    } else {
      mod.loopcount = mod.channel[ch].data & 0x0f
    }
    if (mod.loopcount) mod.flags |= 64
  } else {
    mod.looprow = mod.row
  }
}
Screamtracker.prototype.effect_t0_sc = function (mod, ch) { // note cut
}
Screamtracker.prototype.effect_t0_sd = function (mod, ch) { // note delay
  if (mod.tick == (mod.channel[ch].data & 0x0f)) {
    mod.process_note(mod, mod.patterntable[mod.position], ch)
  }
}
Screamtracker.prototype.effect_t0_se = function (mod, ch) { // pattern delay
  mod.patterndelay = mod.channel[ch].data & 0x0f
  mod.patternwait = 0
}
Screamtracker.prototype.effect_t0_sf = function (mod, ch) { // funkrepeat (not implemented)
}

//
// tick 1+ effect functions
//
Screamtracker.prototype.effect_t1_a = function (mod, ch) { // set speed
}
Screamtracker.prototype.effect_t1_b = function (mod, ch) { // order jump
}
Screamtracker.prototype.effect_t1_c = function (mod, ch) { // jump to row
}
Screamtracker.prototype.effect_t1_d = function (mod, ch) { // volume slide
  if ((mod.channel[ch].volslide & 0x0f) == 0) {
    // slide up
    mod.channel[ch].voicevolume += mod.channel[ch].volslide >> 4
  } else if ((mod.channel[ch].volslide >> 4) == 0) {
    // slide down
    mod.channel[ch].voicevolume -= mod.channel[ch].volslide & 0x0f
  }
  if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
  if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
}
Screamtracker.prototype.effect_t1_e = function (mod, ch) { // slide down
  if (mod.channel[ch].slidespeed < 0xe0) {
    mod.channel[ch].voiceperiod += mod.channel[ch].slidespeed * 4
  }
  if (mod.channel[ch].voiceperiod > 27392) mod.channel[ch].noteon = 0
  mod.channel[ch].flags |= 3 // recalc speed
}
Screamtracker.prototype.effect_t1_f = function (mod, ch) { // slide up
  if (mod.channel[ch].slidespeed < 0xe0) {
    mod.channel[ch].voiceperiod -= mod.channel[ch].slidespeed * 4
  }
  if (mod.channel[ch].voiceperiod < 56) mod.channel[ch].noteon = 0
  mod.channel[ch].flags |= 3 // recalc speed
}
Screamtracker.prototype.effect_t1_g = function (mod, ch) { // slide to note
  if (mod.channel[ch].voiceperiod < mod.channel[ch].slideto) {
    //    mod.channel[ch].voiceperiod+=4*mod.channel[ch].slidetospeed;
    mod.channel[ch].voiceperiod += 4 * mod.channel[ch].slidespeed
    if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto) { mod.channel[ch].voiceperiod = mod.channel[ch].slideto }
  } else
  if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto) {
    //    mod.channel[ch].voiceperiod-=4*mod.channel[ch].slidetospeed;
    mod.channel[ch].voiceperiod -= 4 * mod.channel[ch].slidespeed
    if (mod.channel[ch].voiceperiod < mod.channel[ch].slideto) { mod.channel[ch].voiceperiod = mod.channel[ch].slideto }
  }
  mod.channel[ch].flags |= 3 // recalc speed
}
Screamtracker.prototype.effect_t1_h = function (mod, ch) { // vibrato
  mod.channel[ch].voiceperiod +=
    mod.vibratotable[mod.channel[ch].vibratowave & 3][mod.channel[ch].vibratopos] * mod.channel[ch].vibratodepth / 128
  if (mod.channel[ch].voiceperiod > 27392) mod.channel[ch].voiceperiod = 27392
  if (mod.channel[ch].voiceperiod < 56) mod.channel[ch].voiceperiod = 56
  mod.channel[ch].flags |= 1
}
Screamtracker.prototype.effect_t1_i = function (mod, ch) { // tremor
}
Screamtracker.prototype.effect_t1_j = function (mod, ch) { // arpeggio
  let n = mod.channel[ch].note
  if ((mod.tick & 3) == 1) n += mod.channel[ch].arpeggio >> 4
  if ((mod.tick & 3) == 2) n += mod.channel[ch].arpeggio & 0x0f
  mod.channel[ch].voiceperiod = (8363.0 * mod.periodtable[n]) / mod.sample[mod.channel[ch].sample].c2spd
  mod.channel[ch].flags |= 3 // recalc speed
}
Screamtracker.prototype.effect_t1_k = function (mod, ch) { // vibrato + volslide
  mod.effect_t1_h(mod, ch)
  mod.effect_t1_d(mod, ch)
}
Screamtracker.prototype.effect_t1_l = function (mod, ch) { // slide to note + volslide
  mod.effect_t1_g(mod, ch)
  mod.effect_t1_d(mod, ch)
}
Screamtracker.prototype.effect_t1_m = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_n = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_o = function (mod, ch) { // set sample offset
}
Screamtracker.prototype.effect_t1_p = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_q = function (mod, ch) { // retrig note
  if ((mod.tick % (mod.channel[ch].lastretrig & 0x0f)) == 0) {
    mod.channel[ch].samplepos = 0
    mod.channel[ch].trigramp = 0.0
    mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample
    const v = mod.channel[ch].lastretrig >> 4
    if ((v & 7) >= 6) {
      mod.channel[ch].voicevolume = Math.floor(mod.channel[ch].voicevolume * mod.retrigvoltab[v])
    } else {
      mod.channel[ch].voicevolume += mod.retrigvoltab[v]
    }
    if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0
    if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64
  }
}
Screamtracker.prototype.effect_t1_r = function (mod, ch) { // tremolo
}

Screamtracker.prototype.effect_t1_s = function (mod, ch) { // special effects
  const i = (mod.channel[ch].data & 0xf0) >> 4
  mod.effects_t1_s[i](mod, ch)
}
Screamtracker.prototype.effect_t1_t = function (mod, ch) { // set tempo
}
Screamtracker.prototype.effect_t1_u = function (mod, ch) { // fine vibrato
}
Screamtracker.prototype.effect_t1_v = function (mod, ch) { // set global volume
}
Screamtracker.prototype.effect_t1_w = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_x = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_y = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_z = function (mod, ch) { // -
}

//
// tick 1+ special Sxy effect functions
//
Screamtracker.prototype.effect_t1_s0 = function (mod, ch) { // set filter (not implemented)
}
Screamtracker.prototype.effect_t1_s1 = function (mod, ch) { // set glissando control
}
Screamtracker.prototype.effect_t1_s2 = function (mod, ch) { // set finetune
}
Screamtracker.prototype.effect_t1_s3 = function (mod, ch) { // set vibrato waveform
}
Screamtracker.prototype.effect_t1_s4 = function (mod, ch) { // set tremolo waveform
}
Screamtracker.prototype.effect_t1_s5 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_s6 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_s7 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_s8 = function (mod, ch) { // set panning position
}
Screamtracker.prototype.effect_t1_s9 = function (mod, ch) { // -
}
Screamtracker.prototype.effect_t1_sa = function (mod, ch) { // old stereo control (not implemented)
}
Screamtracker.prototype.effect_t1_sb = function (mod, ch) { // loop pattern
}
Screamtracker.prototype.effect_t1_sc = function (mod, ch) { // note cut
  if (mod.tick == (mod.channel[ch].data & 0x0f)) {
    mod.channel[ch].volume = 0
    mod.channel[ch].voicevolume = 0
  }
}
Screamtracker.prototype.effect_t1_sd = function (mod, ch) { // note delay
  mod.effect_t0_sd(mod, ch)
}
Screamtracker.prototype.effect_t1_se = function (mod, ch) { // pattern delay
}
Screamtracker.prototype.effect_t1_sf = function (mod, ch) { // funkrepeat (not implemented)
}
/*
  (c) 2012-2021 Noora Halme et al. (see AUTHORS)

  This code is licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

  Protracker module player class

  todo:
  - pattern looping is broken (see mod.black_queen)
  - properly test EEx delay pattern
*/

// constructor for protracker player object
function Protracker () {
  let i, t

  this.clearsong()
  this.initialize()

  this.playing = false
  this.paused = false
  this.repeat = false

  this.filter = false

  this.mixval = 4.0

  this.syncqueue = []

  this.samplerate = 44100

  // paula period values
  this.baseperiodtable = new Float32Array([
    856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453,
    428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226,
    214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113])

  // finetune multipliers
  this.finetunetable = new Float32Array(16)
  for (t = 0; t < 16; t++) this.finetunetable[t] = Math.pow(2, (t - 8) / 12 / 8)

  // calc tables for vibrato waveforms
  this.vibratotable = new Array()
  for (t = 0; t < 4; t++) {
    this.vibratotable[t] = new Float32Array(64)
    for (i = 0; i < 64; i++) {
      switch (t) {
        case 0:
          this.vibratotable[t][i] = 127 * Math.sin(Math.PI * 2 * (i / 64))
          break
        case 1:
          this.vibratotable[t][i] = 127 - 4 * i
          break
        case 2:
          this.vibratotable[t][i] = (i < 32) ? 127 : -127
          break
        case 3:
          this.vibratotable[t][i] = (1 - 2 * Math.random()) * 127
          break
      }
    }
  }

  // effect jumptables
  this.effects_t0 = new Array(
    this.effect_t0_0, this.effect_t0_1, this.effect_t0_2, this.effect_t0_3, this.effect_t0_4, this.effect_t0_5, this.effect_t0_6, this.effect_t0_7,
    this.effect_t0_8, this.effect_t0_9, this.effect_t0_a, this.effect_t0_b, this.effect_t0_c, this.effect_t0_d, this.effect_t0_e, this.effect_t0_f)
  this.effects_t0_e = new Array(
    this.effect_t0_e0, this.effect_t0_e1, this.effect_t0_e2, this.effect_t0_e3, this.effect_t0_e4, this.effect_t0_e5, this.effect_t0_e6, this.effect_t0_e7,
    this.effect_t0_e8, this.effect_t0_e9, this.effect_t0_ea, this.effect_t0_eb, this.effect_t0_ec, this.effect_t0_ed, this.effect_t0_ee, this.effect_t0_ef)
  this.effects_t1 = new Array(
    this.effect_t1_0, this.effect_t1_1, this.effect_t1_2, this.effect_t1_3, this.effect_t1_4, this.effect_t1_5, this.effect_t1_6, this.effect_t1_7,
    this.effect_t1_8, this.effect_t1_9, this.effect_t1_a, this.effect_t1_b, this.effect_t1_c, this.effect_t1_d, this.effect_t1_e, this.effect_t1_f)
  this.effects_t1_e = new Array(
    this.effect_t1_e0, this.effect_t1_e1, this.effect_t1_e2, this.effect_t1_e3, this.effect_t1_e4, this.effect_t1_e5, this.effect_t1_e6, this.effect_t1_e7,
    this.effect_t1_e8, this.effect_t1_e9, this.effect_t1_ea, this.effect_t1_eb, this.effect_t1_ec, this.effect_t1_ed, this.effect_t1_ee, this.effect_t1_ef)
}

// clear song data
Protracker.prototype.clearsong = function () {
  this.title = ''
  this.signature = ''

  this.songlen = 1
  this.repeatpos = 0
  this.patterntable = new ArrayBuffer(128)
  for (i = 0; i < 128; i++) this.patterntable[i] = 0

  this.channels = 4

  this.sample = new Array()
  this.samples = 31
  for (i = 0; i < 31; i++) {
    this.sample[i] = new Object()
    this.sample[i].name = ''
    this.sample[i].length = 0
    this.sample[i].finetune = 0
    this.sample[i].volume = 64
    this.sample[i].loopstart = 0
    this.sample[i].looplength = 0
    this.sample[i].data = 0
  }

  this.patterns = 0
  this.pattern = new Array()
  this.note = new Array()
  this.pattern_unpack = new Array()

  this.looprow = 0
  this.loopstart = 0
  this.loopcount = 0

  this.patterndelay = 0
  this.patternwait = 0
}

// initialize all player variables
Protracker.prototype.initialize = function () {
  this.syncqueue = []

  this.tick = 0
  this.position = 0
  this.row = 0
  this.offset = 0
  this.flags = 0

  this.speed = 6
  this.bpm = 125
  this.breakrow = 0
  this.patternjump = 0
  this.patterndelay = 0
  this.patternwait = 0
  this.endofsong = false

  this.channel = new Array()
  for (i = 0; i < this.channels; i++) {
    this.channel[i] = new Object()
    this.channel[i].sample = 0
    this.channel[i].period = 214
    this.channel[i].voiceperiod = 214
    this.channel[i].note = 24
    this.channel[i].volume = 64
    this.channel[i].command = 0
    this.channel[i].data = 0
    this.channel[i].samplepos = 0
    this.channel[i].samplespeed = 0
    this.channel[i].flags = 0
    this.channel[i].noteon = 0
    this.channel[i].slidespeed = 0
    this.channel[i].slideto = 214
    this.channel[i].slidetospeed = 0
    this.channel[i].arpeggio = 0

    this.channel[i].semitone = 12
    this.channel[i].vibratospeed = 0
    this.channel[i].vibratodepth = 0
    this.channel[i].vibratopos = 0
    this.channel[i].vibratowave = 0
  }
}

// parse the module from local buffer
Protracker.prototype.parse = function (buffer) {
  let i, j, c

  for (i = 0; i < 4; i++) this.signature += String.fromCharCode(buffer[1080 + i])
  switch (this.signature) {
    case 'M.K.':
    case 'M!K!':
    case '4CHN':
    case 'FLT4':
      break

    case '6CHN':
      this.channels = 6
      break

    case '8CHN':
    case 'FLT8':
      this.channels = 8
      break

    case '28CH':
      this.channels = 28
      break

    default:
      return false
  }
  this.chvu = new Array()
  for (i = 0; i < this.channels; i++) this.chvu[i] = 0.0

  i = 0
  while (buffer[i] && i < 20) { this.title = this.title + String.fromCharCode(buffer[i++]) }

  for (i = 0; i < this.samples; i++) {
    const st = 20 + i * 30
    j = 0
    while (buffer[st + j] && j < 22) {
      this.sample[i].name +=
        ((buffer[st + j] > 0x1f) && (buffer[st + j] < 0x7f))
          ? (String.fromCharCode(buffer[st + j]))
          : (' ')
      j++
    }
    this.sample[i].length = 2 * (buffer[st + 22] * 256 + buffer[st + 23])
    this.sample[i].finetune = buffer[st + 24]
    if (this.sample[i].finetune > 7) this.sample[i].finetune = this.sample[i].finetune - 16
    this.sample[i].volume = buffer[st + 25]
    this.sample[i].loopstart = 2 * (buffer[st + 26] * 256 + buffer[st + 27])
    this.sample[i].looplength = 2 * (buffer[st + 28] * 256 + buffer[st + 29])
    if (this.sample[i].looplength == 2) this.sample[i].looplength = 0
    if (this.sample[i].loopstart > this.sample[i].length) {
      this.sample[i].loopstart = 0
      this.sample[i].looplength = 0
    }
  }

  this.songlen = buffer[950]
  if (buffer[951] != 127) this.repeatpos = buffer[951]
  for (i = 0; i < 128; i++) {
    this.patterntable[i] = buffer[952 + i]
    if (this.patterntable[i] > this.patterns) this.patterns = this.patterntable[i]
  }
  this.patterns += 1
  const patlen = 4 * 64 * this.channels

  this.pattern = new Array()
  this.note = new Array()
  this.pattern_unpack = new Array()
  for (i = 0; i < this.patterns; i++) {
    this.pattern[i] = new Uint8Array(patlen)
    this.note[i] = new Uint8Array(this.channels * 64)
    this.pattern_unpack[i] = new Uint8Array(this.channels * 64 * 5)
    for (j = 0; j < patlen; j++) this.pattern[i][j] = buffer[1084 + i * patlen + j]
    for (j = 0; j < 64; j++) {
      for (c = 0; c < this.channels; c++) {
        this.note[i][j * this.channels + c] = 0
        var n = (this.pattern[i][j * 4 * this.channels + c * 4] & 0x0f) << 8 | this.pattern[i][j * 4 * this.channels + c * 4 + 1]
        for (let np = 0; np < this.baseperiodtable.length; np++) { if (n == this.baseperiodtable[np]) this.note[i][j * this.channels + c] = np }
      }
    }
    for (j = 0; j < 64; j++) {
      for (c = 0; c < this.channels; c++) {
        var pp = j * 4 * this.channels + c * 4
        const ppu = j * 5 * this.channels + c * 5
        var n = (this.pattern[i][pp] & 0x0f) << 8 | this.pattern[i][pp + 1]
        if (n) { n = this.note[i][j * this.channels + c]; n = (n % 12) | (Math.floor(n / 12) + 2) << 4 }
        this.pattern_unpack[i][ppu + 0] = (n) || 255
        this.pattern_unpack[i][ppu + 1] = this.pattern[i][pp + 0] & 0xf0 | this.pattern[i][pp + 2] >> 4
        this.pattern_unpack[i][ppu + 2] = 255
        this.pattern_unpack[i][ppu + 3] = this.pattern[i][pp + 2] & 0x0f
        this.pattern_unpack[i][ppu + 4] = this.pattern[i][pp + 3]
      }
    }
  }

  let sst = 1084 + this.patterns * patlen
  for (i = 0; i < this.samples; i++) {
    this.sample[i].data = new Float32Array(this.sample[i].length)
    for (j = 0; j < this.sample[i].length; j++) {
      let q = buffer[sst + j]
      if (q < 128) {
        q = q / 128.0
      } else {
        q = ((q - 128) / 128.0) - 1.0
      }
      this.sample[i].data[j] = q
    }
    sst += this.sample[i].length
  }

  // look ahead at very first row to see if filter gets enabled
  this.filter = false
  for (let ch = 0; ch < this.channels; ch++) {
    p = this.patterntable[0]
    pp = ch * 4
    const cmd = this.pattern[p][pp + 2] & 0x0f; const data = this.pattern[p][pp + 3]
    if (cmd == 0x0e && ((data & 0xf0) == 0x00)) {
      if (!(data & 0x01)) {
        this.filter = true
      } else {
        this.filter = false
      }
    }
  }

  // set lowpass cutoff
  if (this.context) {
    if (this.filter) {
      this.lowpassNode.frequency.value = 3275
    } else {
      this.lowpassNode.frequency.value = 28867
    }
  }

  this.chvu = new Float32Array(this.channels)
  for (i = 0; i < this.channels; i++) this.chvu[i] = 0.0

  return true
}

// advance player
Protracker.prototype.advance = function (mod) {
  const spd = (((mod.samplerate * 60) / mod.bpm) / 4) / 6

  // advance player
  if (mod.offset > spd) { mod.tick++; mod.offset = 0; mod.flags |= 1 }
  if (mod.tick >= mod.speed) {
    if (mod.patterndelay) { // delay pattern
      if (mod.tick < ((mod.patternwait + 1) * mod.speed)) {
        mod.patternwait++
      } else {
        mod.row++; mod.tick = 0; mod.flags |= 2; mod.patterndelay = 0
      }
    } else {
      if (mod.flags & (16 + 32 + 64)) {
        if (mod.flags & 64) { // loop pattern?
          mod.row = mod.looprow
          mod.flags &= 0xa1
          mod.flags |= 2
        } else {
          if (mod.flags & 16) { // pattern jump/break?
            mod.position = mod.patternjump
            mod.row = mod.breakrow
            mod.patternjump = 0
            mod.breakrow = 0
            mod.flags &= 0xe1
            mod.flags |= 2
          }
        }
        mod.tick = 0
      } else {
        mod.row++; mod.tick = 0; mod.flags |= 2
      }
    }
  }
  if (mod.row >= 64) { mod.position++; mod.row = 0; mod.flags |= 4 }
  if (mod.position >= mod.songlen) {
    if (mod.repeat) {
      mod.position = 0
    } else {
      this.endofsong = true
      // mod.stop();
    }
  }
}

// mix an audio buffer with data
Protracker.prototype.mix = function (mod, bufs, buflen) {
  let f
  let p, pp, n, nn

  const outp = new Float32Array(2)
  for (let s = 0; s < buflen; s++) {
    outp[0] = 0.0
    outp[1] = 0.0

    if (!mod.paused && !mod.endofsong && mod.playing) {
      mod.advance(mod)

      let och = 0
      for (let ch = 0; ch < mod.channels; ch++) {
        // calculate playback position
        p = mod.patterntable[mod.position]
        pp = mod.row * 4 * mod.channels + ch * 4
        if (mod.flags & 2) { // new row
          mod.channel[ch].command = mod.pattern[p][pp + 2] & 0x0f
          mod.channel[ch].data = mod.pattern[p][pp + 3]

          if (!(mod.channel[ch].command == 0x0e && (mod.channel[ch].data & 0xf0) == 0xd0)) {
            n = (mod.pattern[p][pp] & 0x0f) << 8 | mod.pattern[p][pp + 1]
            if (n) {
              // noteon, except if command=3 (porta to note)
              if ((mod.channel[ch].command != 0x03) && (mod.channel[ch].command != 0x05)) {
                mod.channel[ch].period = n
                mod.channel[ch].samplepos = 0
                if (mod.channel[ch].vibratowave > 3) mod.channel[ch].vibratopos = 0
                mod.channel[ch].flags |= 3 // recalc speed
                mod.channel[ch].noteon = 1
              }
              // in either case, set the slide to note target
              mod.channel[ch].slideto = n
            }
            nn = mod.pattern[p][pp + 0] & 0xf0 | mod.pattern[p][pp + 2] >> 4
            if (nn) {
              mod.channel[ch].sample = nn - 1
              mod.channel[ch].volume = mod.sample[nn - 1].volume
              if (!n && (mod.channel[ch].samplepos > mod.sample[nn - 1].length)) mod.channel[ch].samplepos = 0
            }
          }
        }
        mod.channel[ch].voiceperiod = mod.channel[ch].period

        // kill empty samples
        if (!mod.sample[mod.channel[ch].sample].length) mod.channel[ch].noteon = 0

        // effects
        if (mod.flags & 1) {
          if (!mod.tick) {
            // process only on tick 0
            mod.effects_t0[mod.channel[ch].command](mod, ch)
          } else {
            mod.effects_t1[mod.channel[ch].command](mod, ch)
          }
        }

        // recalc note number from period
        if (mod.channel[ch].flags & 2) {
          for (let np = 0; np < mod.baseperiodtable.length; np++) { if (mod.baseperiodtable[np] >= mod.channel[ch].period) mod.channel[ch].note = np }
          mod.channel[ch].semitone = 7
          if (mod.channel[ch].period >= 120) { mod.channel[ch].semitone = mod.baseperiodtable[mod.channel[ch].note] - mod.baseperiodtable[mod.channel[ch].note + 1] }
        }

        // recalc sample speed and apply finetune
        if ((mod.channel[ch].flags & 1 || mod.flags & 2) && mod.channel[ch].voiceperiod) {
          mod.channel[ch].samplespeed =
            7093789.2 / (mod.channel[ch].voiceperiod * 2) * mod.finetunetable[mod.sample[mod.channel[ch].sample].finetune + 8] / mod.samplerate
        }

        // advance vibrato on each new tick
        if (mod.flags & 1) {
          mod.channel[ch].vibratopos += mod.channel[ch].vibratospeed
          mod.channel[ch].vibratopos &= 0x3f
        }

        // mix channel to output
        och = och ^ (ch & 1)
        f = 0.0
        if (mod.channel[ch].noteon) {
          if (mod.sample[mod.channel[ch].sample].length > mod.channel[ch].samplepos) { f = (mod.sample[mod.channel[ch].sample].data[Math.floor(mod.channel[ch].samplepos)] * mod.channel[ch].volume) / 64.0 }
          outp[och] += f
          mod.channel[ch].samplepos += mod.channel[ch].samplespeed
        }
        mod.chvu[ch] = Math.max(mod.chvu[ch], Math.abs(f))

        // loop or end samples
        if (mod.channel[ch].noteon) {
          if (mod.sample[mod.channel[ch].sample].loopstart || mod.sample[mod.channel[ch].sample].looplength) {
            if (mod.channel[ch].samplepos >= (mod.sample[mod.channel[ch].sample].loopstart + mod.sample[mod.channel[ch].sample].looplength)) {
              mod.channel[ch].samplepos -= mod.sample[mod.channel[ch].sample].looplength
            }
          } else {
            if (mod.channel[ch].samplepos >= mod.sample[mod.channel[ch].sample].length) {
              mod.channel[ch].noteon = 0
            }
          }
        }

        // clear channel flags
        mod.channel[ch].flags = 0
      }
      mod.offset++
      mod.flags &= 0x70
    }

    // done - store to output buffer
    bufs[0][s] = outp[0]
    bufs[1][s] = outp[1]
  }
}

//
// tick 0 effect functions
//
Protracker.prototype.effect_t0_0 = function (mod, ch) { // 0 arpeggio
  mod.channel[ch].arpeggio = mod.channel[ch].data
}
Protracker.prototype.effect_t0_1 = function (mod, ch) { // 1 slide up
  if (mod.channel[ch].data) mod.channel[ch].slidespeed = mod.channel[ch].data
}
Protracker.prototype.effect_t0_2 = function (mod, ch) { // 2 slide down
  if (mod.channel[ch].data) mod.channel[ch].slidespeed = mod.channel[ch].data
}
Protracker.prototype.effect_t0_3 = function (mod, ch) { // 3 slide to note
  if (mod.channel[ch].data) mod.channel[ch].slidetospeed = mod.channel[ch].data
}
Protracker.prototype.effect_t0_4 = function (mod, ch) { // 4 vibrato
  if (mod.channel[ch].data & 0x0f && mod.channel[ch].data & 0xf0) {
    mod.channel[ch].vibratodepth = (mod.channel[ch].data & 0x0f)
    mod.channel[ch].vibratospeed = (mod.channel[ch].data & 0xf0) >> 4
  }
  mod.effects_t1[4](mod, ch)
}
Protracker.prototype.effect_t0_5 = function (mod, ch) { // 5
}
Protracker.prototype.effect_t0_6 = function (mod, ch) { // 6
}
Protracker.prototype.effect_t0_7 = function (mod, ch) { // 7
}
Protracker.prototype.effect_t0_8 = function (mod, ch) { // 8 unused, used for syncing
  mod.syncqueue.unshift(mod.channel[ch].data & 0x0f)
}
Protracker.prototype.effect_t0_9 = function (mod, ch) { // 9 set sample offset
  mod.channel[ch].samplepos = mod.channel[ch].data * 256
}
Protracker.prototype.effect_t0_a = function (mod, ch) { // a
}
Protracker.prototype.effect_t0_b = function (mod, ch) { // b pattern jump
  mod.breakrow = 0
  mod.patternjump = mod.channel[ch].data
  mod.flags |= 16
}
Protracker.prototype.effect_t0_c = function (mod, ch) { // c set volume
  mod.channel[ch].volume = mod.channel[ch].data
}
Protracker.prototype.effect_t0_d = function (mod, ch) { // d pattern break
  mod.breakrow = ((mod.channel[ch].data & 0xf0) >> 4) * 10 + (mod.channel[ch].data & 0x0f)
  if (!(mod.flags & 16)) mod.patternjump = mod.position + 1
  mod.flags |= 16
}
Protracker.prototype.effect_t0_e = function (mod, ch) { // e
  const i = (mod.channel[ch].data & 0xf0) >> 4
  mod.effects_t0_e[i](mod, ch)
}
Protracker.prototype.effect_t0_f = function (mod, ch) { // f set speed
  if (mod.channel[ch].data > 32) {
    mod.bpm = mod.channel[ch].data
  } else {
    if (mod.channel[ch].data) mod.speed = mod.channel[ch].data
  }
}

//
// tick 0 effect e functions
//
Protracker.prototype.effect_t0_e0 = function (mod, ch) { // e0 filter on/off
  if (mod.channels > 4) return // use only for 4ch amiga tunes
  if (mod.channel[ch].data & 0x01) {
    mod.filter = false
  } else {
    mod.filter = true
  }
}
Protracker.prototype.effect_t0_e1 = function (mod, ch) { // e1 fine slide up
  mod.channel[ch].period -= mod.channel[ch].data & 0x0f
  if (mod.channel[ch].period < 113) mod.channel[ch].period = 113
}
Protracker.prototype.effect_t0_e2 = function (mod, ch) { // e2 fine slide down
  mod.channel[ch].period += mod.channel[ch].data & 0x0f
  if (mod.channel[ch].period > 856) mod.channel[ch].period = 856
  mod.channel[ch].flags |= 1
}
Protracker.prototype.effect_t0_e3 = function (mod, ch) { // e3 set glissando
}
Protracker.prototype.effect_t0_e4 = function (mod, ch) { // e4 set vibrato waveform
  mod.channel[ch].vibratowave = mod.channel[ch].data & 0x07
}
Protracker.prototype.effect_t0_e5 = function (mod, ch) { // e5 set finetune
}
Protracker.prototype.effect_t0_e6 = function (mod, ch) { // e6 loop pattern
  if (mod.channel[ch].data & 0x0f) {
    if (mod.loopcount) {
      mod.loopcount--
    } else {
      mod.loopcount = mod.channel[ch].data & 0x0f
    }
    if (mod.loopcount) mod.flags |= 64
  } else {
    mod.looprow = mod.row
  }
}
Protracker.prototype.effect_t0_e7 = function (mod, ch) { // e7
}
Protracker.prototype.effect_t0_e8 = function (mod, ch) { // e8, use for syncing
  mod.syncqueue.unshift(mod.channel[ch].data & 0x0f)
}
Protracker.prototype.effect_t0_e9 = function (mod, ch) { // e9
}
Protracker.prototype.effect_t0_ea = function (mod, ch) { // ea fine volslide up
  mod.channel[ch].volume += mod.channel[ch].data & 0x0f
  if (mod.channel[ch].volume > 64) mod.channel[ch].volume = 64
}
Protracker.prototype.effect_t0_eb = function (mod, ch) { // eb fine volslide down
  mod.channel[ch].volume -= mod.channel[ch].data & 0x0f
  if (mod.channel[ch].volume < 0) mod.channel[ch].volume = 0
}
Protracker.prototype.effect_t0_ec = function (mod, ch) { // ec
}
Protracker.prototype.effect_t0_ed = function (mod, ch) { // ed delay sample
  if (mod.tick == (mod.channel[ch].data & 0x0f)) {
    // start note
    const p = mod.patterntable[mod.position]
    const pp = mod.row * 4 * mod.channels + ch * 4
    n = (mod.pattern[p][pp] & 0x0f) << 8 | mod.pattern[p][pp + 1]
    if (n) {
      mod.channel[ch].period = n
      mod.channel[ch].voiceperiod = mod.channel[ch].period
      mod.channel[ch].samplepos = 0
      if (mod.channel[ch].vibratowave > 3) mod.channel[ch].vibratopos = 0
      mod.channel[ch].flags |= 3 // recalc speed
      mod.channel[ch].noteon = 1
    }
    n = mod.pattern[p][pp + 0] & 0xf0 | mod.pattern[p][pp + 2] >> 4
    if (n) {
      mod.channel[ch].sample = n - 1
      mod.channel[ch].volume = mod.sample[n - 1].volume
    }
  }
}
Protracker.prototype.effect_t0_ee = function (mod, ch) { // ee delay pattern
  mod.patterndelay = mod.channel[ch].data & 0x0f
  mod.patternwait = 0
}
Protracker.prototype.effect_t0_ef = function (mod, ch) { // ef
}

//
// tick 1+ effect functions
//
Protracker.prototype.effect_t1_0 = function (mod, ch) { // 0 arpeggio
  if (mod.channel[ch].data) {
    let apn = mod.channel[ch].note
    if ((mod.tick % 3) == 1) apn += mod.channel[ch].arpeggio >> 4
    if ((mod.tick % 3) == 2) apn += mod.channel[ch].arpeggio & 0x0f
    if (apn >= 0 && apn <= mod.baseperiodtable.length) { mod.channel[ch].voiceperiod = mod.baseperiodtable[apn] }
    mod.channel[ch].flags |= 1
  }
}
Protracker.prototype.effect_t1_1 = function (mod, ch) { // 1 slide up
  mod.channel[ch].period -= mod.channel[ch].slidespeed
  if (mod.channel[ch].period < 113) mod.channel[ch].period = 113
  mod.channel[ch].flags |= 3 // recalc speed
}
Protracker.prototype.effect_t1_2 = function (mod, ch) { // 2 slide down
  mod.channel[ch].period += mod.channel[ch].slidespeed
  if (mod.channel[ch].period > 856) mod.channel[ch].period = 856
  mod.channel[ch].flags |= 3 // recalc speed
}
Protracker.prototype.effect_t1_3 = function (mod, ch) { // 3 slide to note
  if (mod.channel[ch].period < mod.channel[ch].slideto) {
    mod.channel[ch].period += mod.channel[ch].slidetospeed
    if (mod.channel[ch].period > mod.channel[ch].slideto) { mod.channel[ch].period = mod.channel[ch].slideto }
  }
  if (mod.channel[ch].period > mod.channel[ch].slideto) {
    mod.channel[ch].period -= mod.channel[ch].slidetospeed
    if (mod.channel[ch].period < mod.channel[ch].slideto) { mod.channel[ch].period = mod.channel[ch].slideto }
  }
  mod.channel[ch].flags |= 3 // recalc speed
}
Protracker.prototype.effect_t1_4 = function (mod, ch) { // 4 vibrato
  const waveform = mod.vibratotable[mod.channel[ch].vibratowave & 3][mod.channel[ch].vibratopos] / 63.0 // 127.0;

  // two different implementations for vibrato
  //  var a=(mod.channel[ch].vibratodepth/32)*mod.channel[ch].semitone*waveform; // non-linear vibrato +/- semitone
  const a = mod.channel[ch].vibratodepth * waveform // linear vibrato, depth has more effect high notes

  mod.channel[ch].voiceperiod += a
  mod.channel[ch].flags |= 1
}
Protracker.prototype.effect_t1_5 = function (mod, ch) { // 5 volslide + slide to note
  mod.effect_t1_3(mod, ch) // slide to note
  mod.effect_t1_a(mod, ch) // volslide
}
Protracker.prototype.effect_t1_6 = function (mod, ch) { // 6 volslide + vibrato
  mod.effect_t1_4(mod, ch) // vibrato
  mod.effect_t1_a(mod, ch) // volslide
}
Protracker.prototype.effect_t1_7 = function (mod, ch) { // 7
}
Protracker.prototype.effect_t1_8 = function (mod, ch) { // 8 unused
}
Protracker.prototype.effect_t1_9 = function (mod, ch) { // 9 set sample offset
}
Protracker.prototype.effect_t1_a = function (mod, ch) { // a volume slide
  if (!(mod.channel[ch].data & 0x0f)) {
    // y is zero, slide up
    mod.channel[ch].volume += (mod.channel[ch].data >> 4)
    if (mod.channel[ch].volume > 64) mod.channel[ch].volume = 64
  }
  if (!(mod.channel[ch].data & 0xf0)) {
    // x is zero, slide down
    mod.channel[ch].volume -= (mod.channel[ch].data & 0x0f)
    if (mod.channel[ch].volume < 0) mod.channel[ch].volume = 0
  }
}
Protracker.prototype.effect_t1_b = function (mod, ch) { // b pattern jump
}
Protracker.prototype.effect_t1_c = function (mod, ch) { // c set volume
}
Protracker.prototype.effect_t1_d = function (mod, ch) { // d pattern break
}
Protracker.prototype.effect_t1_e = function (mod, ch) { // e
  const i = (mod.channel[ch].data & 0xf0) >> 4
  mod.effects_t1_e[i](mod, ch)
}
Protracker.prototype.effect_t1_f = function (mod, ch) { // f
}

//
// tick 1+ effect e functions
//
Protracker.prototype.effect_t1_e0 = function (mod, ch) { // e0
}
Protracker.prototype.effect_t1_e1 = function (mod, ch) { // e1
}
Protracker.prototype.effect_t1_e2 = function (mod, ch) { // e2
}
Protracker.prototype.effect_t1_e3 = function (mod, ch) { // e3
}
Protracker.prototype.effect_t1_e4 = function (mod, ch) { // e4
}
Protracker.prototype.effect_t1_e5 = function (mod, ch) { // e5
}
Protracker.prototype.effect_t1_e6 = function (mod, ch) { // e6
}
Protracker.prototype.effect_t1_e7 = function (mod, ch) { // e7
}
Protracker.prototype.effect_t1_e8 = function (mod, ch) { // e8
}
Protracker.prototype.effect_t1_e9 = function (mod, ch) { // e9 retrig sample
  if (mod.tick % (mod.channel[ch].data & 0x0f) == 0) { mod.channel[ch].samplepos = 0 }
}
Protracker.prototype.effect_t1_ea = function (mod, ch) { // ea
}
Protracker.prototype.effect_t1_eb = function (mod, ch) { // eb
}
Protracker.prototype.effect_t1_ec = function (mod, ch) { // ec cut sample
  if (mod.tick == (mod.channel[ch].data & 0x0f)) { mod.channel[ch].volume = 0 }
}
Protracker.prototype.effect_t1_ed = function (mod, ch) { // ed delay sample
  mod.effect_t0_ed(mod, ch)
}
Protracker.prototype.effect_t1_ee = function (mod, ch) { // ee
}
Protracker.prototype.effect_t1_ef = function (mod, ch) { // ef
}

export { Modplayer, Protracker as PlayerProtracker, Screamtracker as PlayerScreamtracker, Fasttracker as PlayerFasttracker }
