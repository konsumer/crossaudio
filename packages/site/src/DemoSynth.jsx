import React from 'react'
import { useCrossAudio, CrossAudioProvider } from '@crossaudio/react'
import { mtof } from './utils'

function synth (context, params) {
  // make a sawtooth oscillator that is controlled by "note" message
  const vco = context.createOscillator()
  vco.frequency.value = mtof(params.note)
  vco.type = 'sawtooth'
  vco.start(0)

  params.on('note', note => { vco.frequency.value = mtof(note) })

  // make a lowpass filter that responds to "cutoff" and "resonance"
  const vcf = context.createBiquadFilter()
  vcf.type = 'lowpass'
  vcf.frequency.value = mtof(params.cutoff)
  vcf.Q.value = params.resonance

  params.on('cutoff', cutoff => { vcf.frequency.value = mtof(cutoff) })
  params.on('resonance', resonance => { vcf.Q.value = resonance })

  // make an amp that responds to "power" to turn it off/on (true/false)
  const vca = context.createGain()
  vca.gain.value = params.power ? 1 : 0

  params.on('power', power => { vca.gain.value = power ? 1 : 0 })

  // vco -> vcf -> vca -> OUT
  vco.connect(vcf)
  vcf.connect(vca)
  vca.connect(context.destination)
}

const DemoSynthUI = () => {
  const [params, setParams] = useCrossAudio()
  const handleChange = name => e => setParams({ ...params, [name]: parseInt(e.target.value) })
  const handlePower = e => setParams({ ...params, power: e.target.checked })
  return (
    <div className='synth'>
      <div>
        <label>power:</label>
        <input type='checkbox' onChange={handlePower} checked={params.power} />
      </div>
      <div>
        <label>note:</label>
        <input type='range' value={params.note} onChange={handleChange('note')} min={0} max={127} />
        <div className='value'>{params.note}</div>
      </div>
      <div>
        <label>cutoff:</label>
        <input type='range' value={params.cutoff} onChange={handleChange('cutoff')} min={0} max={127} />
        <div className='value'>{params.cutoff}</div>
      </div>
      <div>
        <label>resonance:</label>
        <input type='range' value={params.resonance} onChange={handleChange('resonance')} min={0} max={127} />
        <div className='value'>{params.resonance}</div>
      </div>
    </div>
  )
}

const DemoSynth = () => (
  <CrossAudioProvider synth={synth} params={{ cutoff: 48, resonance: 2, power: false, note: 48 }}>
    <DemoSynthUI />
  </CrossAudioProvider>
)

export default DemoSynth
