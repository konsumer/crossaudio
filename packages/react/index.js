import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { play, Params } from '@crossaudio/core'

export const context = createContext()

export const useCrossAudio = () => useContext(context)

// I am using React.createElement to avoid JSX compilation

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

  return React.createElement(context.Provider, { ...props, value: [state, updateState] })
}

export const Canvas = ({ name = 'canvas', ...props }) => {
  const ref = useRef()
  const [params, setParams] = useCrossAudio()

  useEffect(() => {
    if (ref.current) {
      setParams({ ...params, [name]: ref.current })
    }
  }, [ref.current])

  return React.createElement('canvas', { ...props, ref })
}
