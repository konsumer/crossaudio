#!/usr/bin/env node

'use strict'

var currentNodeVersion = process.versions.node
var semver = currentNodeVersion.split('.')
var major = semver[0]

if (major < 16) {
  console.error(
    'You are running Node ' +
      currentNodeVersion +
      '.\n' +
      'Crossaudio works best with version 16.0.0 or above. \n' +
      'Please update your version of Node.'
  )
  process.exit(1)
}

const { init } = require('./createCrossaudioCli')
init()
