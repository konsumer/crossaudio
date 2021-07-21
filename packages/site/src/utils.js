// get midi frequency from 0-127
export const mtof = note => 440 * Math.pow(2, (note - 69) / 12)
