import React, { createContext, useContext, useState, useEffect } from 'react'
import { play, Params } from '@crossaudio/core'

export const context = createContext()

export const useCrossAudio = () => useContext(context)

export const CrossAudioProvider = ({ synth, params, ...props }) => {
  const [state, setState] = useState(params)
  const actualParams = new Params(params)

  const updateState = (value) => {
    setState(value)
    Object.keys(params).forEach((k) => {
      if (actualParams[k] !== value[k]) {
        actualParams[k] = value[k]
      }
    })
  }

  useEffect(() => {
    play(synth, actualParams)
  }, [])

  return <context.Provider {...props} value={[state, updateState]} />
}
