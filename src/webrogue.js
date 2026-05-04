#! /usr/bin/env node

import * as fs from "node:fs/promises"
import { pathToFileURL } from "node:url"
import compile from "./compiler.js"

const outputTypes = new Set(["parsed", "analyzed", "optimized", "js"])

export const help = `WebRogue compiler

Syntax: webrogue <filename> [outputType]

outputType may be parsed, analyzed, optimized, or js.
The default outputType is js.
`

export function stringify(value) {
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

export async function compileFromFile(filename, outputType = "js", io = console) {
  try {
    const source = await fs.readFile(filename, "utf8")
    io.log(stringify(compile(source, outputType)))
    return 0
  } catch (error) {
    io.error(`\u001b[31m${error.message}\u001b[39m`)
    return 1
  }
}

export async function main(args = process.argv.slice(2), io = console) {
  const [filename, requestedOutputType = "js"] = args

  if (filename && outputTypes.has(requestedOutputType)) {
    return compileFromFile(filename, requestedOutputType, io)
  }
  io.log(help)
  return 2
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main()
}
