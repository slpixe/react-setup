#!/usr/bin/env node

import { run } from '../src/cli.js'

run().catch((error) => {
  console.error(`react-setup: ${error.message}`)
  process.exitCode = 1
})
