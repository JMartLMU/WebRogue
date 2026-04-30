#! /usr/bin/env node

import * as fs from "node:fs/promises"
import compile from "./compiler.js"

const outputTypes = new Set(["parsed", "analyzed", "optimized", "js"])

const help = `WebRogue compiler

Syntax: webrogue <filename> [outputType]

outputType may be parsed, analyzed, optimized, or js.
The default outputType is js.
`

function stringify(value) {
  if (typeof value === "string") return value
  const seen = new WeakSet()
  return JSON.stringify(
    value,
    (key, innerValue) => {
      if (key === "at") return undefined
      if (typeof innerValue === "object" && innerValue !== null) {
        if (seen.has(innerValue)) return `[Circular ${innerValue.kind ?? "Object"}]`
        seen.add(innerValue)
      }
      return innerValue
    },
    2
  )
}

async function compileFromFile(filename, outputType) {
  try {
    const source = await fs.readFile(filename, "utf8")
    console.log(stringify(compile(source, outputType)))
  } catch (error) {
    console.error(`\u001b[31m${error.message}\u001b[39m`)
    process.exitCode = 1
  }
}

const [, , filename, requestedOutputType = "js"] = process.argv

if (filename && outputTypes.has(requestedOutputType)) {
  await compileFromFile(filename, requestedOutputType)
} else {
  console.log(help)
  process.exitCode = 2
}
