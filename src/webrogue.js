#! /usr/bin/env node

import * as fs from "node:fs/promises"
import * as vm from "node:vm"
import { stdin, stdout } from "node:process"
import { createInterface } from "node:readline/promises"
import { pathToFileURL } from "node:url"
import compile from "./compiler.js"

const outputTypes = new Set(["parsed", "analyzed", "optimized", "js", "run"])

export const help = `WebRogue compiler

Syntax: webrogue <filename> [outputType]

outputType may be parsed, analyzed, optimized, js, or run.
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

let terminalInput = null
let pipedInputLines = null

async function readLineFromTerminal(prompt) {
  if (!stdin.isTTY) {
    stdout.write(prompt)
    if (!pipedInputLines) {
      const chunks = []
      for await (const chunk of stdin) chunks.push(chunk)
      pipedInputLines = Buffer.concat(chunks).toString().split(/\r?\n/)
    }
    return pipedInputLines.shift() ?? ""
  }
  /* c8 ignore start */
  terminalInput ??= createInterface({ input: stdin, output: stdout })
  return terminalInput.question(prompt)
  /* c8 ignore stop */
}

function closeTerminalInput() {
  /* c8 ignore start */
  if (terminalInput) {
    terminalInput.close()
    terminalInput = null
  }
  /* c8 ignore stop */
  pipedInputLines = null
}

export async function runJavaScript(code, io = console, readLine = readLineFromTerminal) {
  try {
    await vm.runInNewContext(
      `(async () => {\n${code}\n})()`,
      {
        console: {
          log: (...values) => io.log(values.map(String).join(" ")),
        },
        __webrogueReadLineHost: readLine,
      },
      { timeout: 1000 }
    )
  } finally {
    if (readLine === readLineFromTerminal) closeTerminalInput()
  }
}

export async function compileFromFile(filename, outputType = "js", io = console) {
  try {
    const source = await fs.readFile(filename, "utf8")
    if (outputType === "run") {
      await runJavaScript(compile(source, "js"), io)
    } else {
      io.log(stringify(compile(source, outputType)))
    }
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
