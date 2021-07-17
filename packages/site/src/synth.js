// get midi frequency from 0-127
const mtof = note => 440 * Math.pow(2, (note - 69) / 12)

// get filter Q from 0-127: 0.0001 to 1000
const mtoq = note => 0.0001 + ((note / 127) * 999.9999)

export default function synth (context, params) {
  const vco = context.createOscillator()
  vco.frequency.value = mtof(params.note)

  params.on('note', note => {
    vco.frequency.value = mtof(note)
  })

  const vcf = context.createBiquadFilter()
  vcf.type = 'lowpass'
  vcf.frequency.value = mtof(params.cutoff)
  vcf.Q.value = mtoq(params.resonance)

  params.on('cutoff', cutoff => {
    vcf.frequency.value = mtof(cutoff)
  })

  params.on('resonance', resonance => {
    vcf.Q.value = mtoq(resonance)
  })

  const vca = context.createGain()
  vca.gain.value = params.power ? 1 : 0

  params.on('power', power => {
    vca.gain.value = power ? 1 : 0
  })

  vco.connect(vcf)
  vcf.connect(vca)
  vca.connect(context.destination)
  vco.start(0)
}
