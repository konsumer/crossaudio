import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { play, Params } from '@crossaudio/core'

export const context = createContext()

export const useCrossAudio = () => useContext(context)

export const CrossAudioProvider = ({ synth, params, ...props }) => {
  const [state, setState] = useState(params)
  const actualParams = useRef(new Params(params))

  useEffect(() => {
    play(synth, actualParams.current)
  }, [])

  const updateState = (value) => {
    Object.keys(params).forEach((k) => {
      actualParams.current[k] = value[k]
    })
    setState(value)
  }

  // I do this so I don't need to transpile JSX
  return React.createElement(context.Provider, { ...props, value: [state, updateState] })
}
