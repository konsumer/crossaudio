// this is just the stub of react-support

import React, { createContext, useContext } from 'react'

export const context = createContext()

export const useCrossAudio = () => useContext(context)

export const CrossAudioProvider = props => {
  function crossContextFunction (synthCallback) {

  }

  return <context.Provider {...props} value={crossContextFunction} />
}