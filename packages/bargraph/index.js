/* global AnalyserNode */

import interpolate from 'color-interpolate'

// "jet" from https://www.npmjs.com/package/colormap
const defaultPallette = ['#000083', '#000787', '#000d8c', '#001490', '#001b94', '#002199', '#00289d', '#002fa1', '#0035a6', '#003caa', '#0047af', '#0152b3', '#015db8', '#0167bd', '#0172c2', '#027dc6', '#0288cb', '#0293d0', '#039ed5', '#03a8d9', '#03b3de', '#03bee3', '#04c9e7', '#04d4ec', '#04dff1', '#04e9f6', '#05f4fa', '#05ffff', '#14fff0', '#22ffe1', '#31ffd2', '#40ffc3', '#4fffb4', '#5dffa5', '#6cff96', '#7bff87', '#89ff78', '#98ff69', '#a7ff5a', '#b5ff4b', '#c4ff3c', '#d3ff2d', '#e2ff1e', '#f0ff0f', '#ffff00', '#fff100', '#fee300', '#fed500', '#fec600', '#feb800', '#fdaa00', '#fd9c00', '#fd8e00', '#fd8000', '#fc7100', '#fc6300', '#fc5500', '#fb4700', '#fb3900', '#fb2a00', '#fb1c00', '#fa0e00', '#fa0000', '#ec0000', '#df0000', '#d10000', '#c40000', '#b60000', '#a90000', '#9b0000', '#8e0000', '#800000']

export class Bargraph extends AnalyserNode {
  constructor (audioContext, canvas, fftSize = 256, palette = defaultPallette, backgroundColor = 'black', maxDecibels = -25, minDecibels = -60, smoothingTimeConstant = 0.5) {
    super(audioContext, { maxDecibels, minDecibels, smoothingTimeConstant, fftSize })
    this.canvas = canvas
    this.canvasContext = canvas.getContext('2d')
    this.palette = palette || defaultPallette
    this.backgroundColor = backgroundColor

    // set this to false to stop the loop
    this.drawing = true
  }

  start () {
    // setup a per-animation-frame loop to keep it updated
    this.data = new Uint8Array(this.frequencyBinCount)
    this.colormap = interpolate(this.palette)

    const draw = () => {
      if (this.drawing) {
        window.requestAnimationFrame(draw)
      }
      this.getByteFrequencyData(this.data)

      this.canvasContext.fillStyle = this.backgroundColor
      this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height)

      const barWidth = (this.canvas.width / this.frequencyBinCount) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < this.frequencyBinCount; i++) {
        const d = parseFloat(this.data[i]) / 255.0
        barHeight = d * this.canvas.height
        const color = this.colormap(d)
        this.canvasContext.fillStyle = color
        this.canvasContext.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
    }
    draw()
  }

  stop () {
    this.drawing = false
  }
}
