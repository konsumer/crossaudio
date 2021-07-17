import React from 'react'
import { useCrossAudio } from '@crossaudio/react'

const DemoSynth = () => {
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

export default DemoSynth
