/* global AnalyserNode */

export class Oscilloscope extends AnalyserNode {
  constructor (audioContext, canvas, foregroundColor = 'black', backgroundColor = 'transparent', maxDecibels = -25, minDecibels = -60, smoothingTimeConstant = 0.5, fftSize = 2048) {
    super(audioContext, { maxDecibels, minDecibels, smoothingTimeConstant, fftSize })
    this.canvas = canvas
    this.canvasContext = canvas.getContext('2d')
    this.backgroundColor = backgroundColor
    this.foregroundColor = foregroundColor

    // set this to false to stop the loop
    this.drawing = true
  }

  start () {
    // setup a per-animation-frame loop to keep it updated
    this.data = new Uint8Array(this.frequencyBinCount)

    const draw = () => {
      if (this.drawing) {
        window.requestAnimationFrame(draw)
      }
      this.getByteTimeDomainData(this.data)

      if (this.backgroundColor) {
        this.canvasContext.beginPath()
        this.canvasContext.fillStyle = this.backgroundColor
        this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height)
      }

      this.canvasContext.strokeStyle = this.foregroundColor
      this.canvasContext.beginPath()

      const sliceWidth = this.canvas.width * 1.0 / this.frequencyBinCount
      let first = true
      let x = 0
      for (const d of this.data) {
        const v = d / 128.0
        const y = v * this.canvas.height / 2
        if (first) {
          first = false
          this.canvasContext.moveTo(x, y)
        } else {
          this.canvasContext.lineTo(x, y)
        }
        x += sliceWidth
      }

      this.canvasContext.lineTo(this.canvas.width, this.canvas.height / 2)
      this.canvasContext.stroke()
    }
    draw()
  }

  stop () {
    this.drawing = false
  }
}
