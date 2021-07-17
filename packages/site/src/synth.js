const mtof = note => 440 * Math.pow(2, (note - 69) / 12)

export default function synth (context, params) {
  const vco = context.createOscillator()
  vco.frequency.value = mtof(params.note)

  const vca = context.createGain()
  vca.gain.value = params.power ? 1 : 0

  params.on('power', power => {
    vca.gain.value = power ? 1 : 0
  })

  params.on('note', note => {
    vco.frequency.value = mtof(note)
  })

  vco.connect(vca)
  vca.connect(context.destination)
  vco.start(0)
}
