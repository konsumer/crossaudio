#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as crossaudio from '@crossaudio/core'
import easymidi from 'easymidi'
import path from 'path'

const { $0, _: [scriptfile], ...params } = yargs(hideBin(process.argv))
  .usage('Usage: $0 <synthfile.js> [options]')
  .demand(1)
  .example('$0 file.js --cutoff=74 --resonance=71', 'Setup midi CC to control synth params "cutoff" and "resonance".')
  .example('$0 file.js --gate=gate --note=note', 'Send midi-message for note on/off to gate param, and note number to note param.')
  .argv

async function main () {
  const synth = await import(path.resolve(process.cwd(), scriptfile))

  // TODO: need to figure this part out
  function updateParam (name, value, msg) {
    console.log(name, value)
  }

  if (Object.keys(params).length) {
    const devices = easymidi.getInputs().map(device => {
      const i = new easymidi.Input(device)

      const noteParams = Object.keys(params).filter(k => params[k] === 'note')
      const gateParams = Object.keys(params).filter(k => params[k] === 'gate')

      const ccLookup = Object.keys(params)
        .filter(k => params[k] !== 'note' && params[k] !== 'gate')
        .reduce((a, k) => {
          return { ...a, [params[k]]: k }
        }, {})

      if (noteParams.length) {
        i.on('noteon', msg => {
          // console.log('on', { ...msg, device })
          noteParams.forEach(name => {
            updateParam(name, msg.note, { ...msg, device })
          })
          gateParams.forEach(name => {
            updateParam(name, msg.velocity, { ...msg, device })
          })
        })

        i.on('noteoff', msg => {
          // console.log('on', { ...msg, device })
          noteParams.forEach(name => {
            updateParam(name, msg.note, { ...msg, device })
          })
          gateParams.forEach(name => {
            updateParam(name, 0, { ...msg, device })
          })
        })
      }

      i.on('cc', msg => {
        // console.log('cc', { ...msg, device })
        if (ccLookup[msg.controller]) {
          updateParam(ccLookup[msg.controller], msg.value, { ...msg, device })
        }
      })

      return i
    })
  }
}
main()
