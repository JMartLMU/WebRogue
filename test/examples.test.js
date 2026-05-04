import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import compile from "../src/compiler.js"
import { runJavaScript } from "../src/webrogue.js"

const examples = [
  [
    "hello.wr",
    [
      "Welcome to WebRogue!",
      "Mira",
      "enters the dungeon.",
    ],
  ],
  [
    "combat.wr",
    [
      "Damage resolved.",
      "6",
      "Critical hit!",
    ],
  ],
  [
    "states.wr",
    [
      "Start state is ready.",
      "Jumped to Hall.",
      "Two states are ready.",
    ],
  ],
  [
    "loop.wr",
    [
      "A turn passes.",
      "A turn passes.",
      "A turn passes.",
      "Combat ended.",
    ],
  ],
  ["functions.wr", ["Mira"]],
  ["tiny-dungeon.wr", ["ready", "entered Entry", "10"]],
]

function outputFrom(source) {
  const lines = []
  runJavaScript(compile(source, "js"), {
    log: line => lines.push(line),
  })
  return lines
}

describe("The examples", () => {
  for (const [file, expectedOutput] of examples) {
    it(`prints expected output for ${file}`, () => {
      const source = readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8")
      assert.deepEqual(outputFrom(source), expectedOutput)
    })
  }
})
