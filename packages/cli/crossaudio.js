#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { play, Params } from '@crossaudio/core'
import easymidi from 'easymidi'
import path from 'path'

const {
  $0,
  _: [scriptfile],
  ...params
} = yargs(hideBin(process.argv))
  .usage('Usage: $0 <synthfile.js> [options]')
  .demand(1)
  .example(
    '$0 file.js --cutoff=74 --resonance=71',
    'Setup midi CC to control synth params "cutoff" and "resonance".'
  )
  .example('$0 file.js --note=note', 'Send midi-message for note on/off').argv

async function main() {
  const synth = (await import(path.resolve(process.cwd(), scriptfile))).default

  // set intiial values to 0
  const synthParams = new Params(
    Object.keys(params).reduce((a, v) => {
      return { ...a, [v]: 0 }
    }, {})
  )

  function updateParam(name, value, msg) {
    synthParams[name] = value
  }

  if (Object.keys(params).length) {
    const noteParams = Object.keys(params).filter((k) => params[k] === 'note')

    const ccLookup = Object.keys(params)
      .filter((k) => params[k] !== 'note' && params[k] !== 'gate')
      .reduce((a, k) => {
        return { ...a, [params[k]]: k }
      }, {})

    const devices = easymidi.getInputs().map((device) => {
      const i = new easymidi.Input(device)

      if (noteParams.length) {
        i.on('noteon', (m) => {
          const { _type, ...msg } = m
          msg.device = device
          msg.type = _type
          noteParams.forEach((name) => {
            updateParam(name, { ...msg })
          })
        })

        i.on('noteoff', (m) => {
          const { _type, ...msg } = m
          msg.device = device
          msg.type = _type
          noteParams.forEach((name) => {
            updateParam(name, { ...msg })
          })
        })
      }

      i.on('cc', (msg) => {
        // console.log('cc', { ...msg, device })
        if (ccLookup[msg.controller]) {
          updateParam(ccLookup[msg.controller], msg.value, { ...msg, device })
        }
      })

      return i
    })
  }

  play(synth, synthParams)
}
main()
