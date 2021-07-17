// this will run your synth with MIDI

import { play, Params } from '@crossaudio/core'
import easymidi from 'easymidi'
import synth from './synth.js'

const params = new Params({ note: undefined })

// setup input on first MIDI input
const input = new easymidi.Input(easymidi.getInputs()[0])

// when a noteon comes in from 1st midi device, trigger note message
input.on('noteon', (m) => {
  const { _type, ...msg } = m
  msg.type = _type
  params.note = msg
})

// when a noteoff comes in from 1st midi device, trigger note message
input.on('noteoff', (m) => {
  const { _type, ...msg } = m
  msg.type = _type
  params.note = msg
})

play(synth, params)
