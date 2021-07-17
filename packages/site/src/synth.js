// get midi frequency from 0-127
const mtof = note => 440 * Math.pow(2, (note - 69) / 12)

// get filter Q from 0-127: 0.0001 to 1000
const mtoq = note => 0.0001 + ((note / 127) * 999.9999)

export default function synth (context, params) {
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
  vcf.Q.value = mtoq(params.resonance)

  params.on('cutoff', cutoff => { vcf.frequency.value = mtof(cutoff) })
  params.on('resonance', resonance => { vcf.Q.value = mtoq(resonance) })

  // make an amp that responds to "power" to turn it off/on (true/false)
  const vca = context.createGain()
  vca.gain.value = params.power ? 1 : 0

  params.on('power', power => { vca.gain.value = power ? 1 : 0 })

  // vco -> vcf -> vca -> OUT
  vco.connect(vcf)
  vcf.connect(vca)
  vca.connect(context.destination)
}
