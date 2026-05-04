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
      "Adventurer",
      "enters the dungeon. Hello Adventurer!",
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
  [
    "choice.wr",
    [
      "Choose an action:",
      "1. Attack",
      "2. Heal",
      "Attacked.",
      "4",
    ],
    ["1"],
  ],
  [
    "dialogue.wr",
    ["first line", "middle line", "last line", "dialogue complete"],
    ["space", "space"],
  ],  ["tiny-dungeon.wr", ["ready", "entered Entry", "10"]],
]

async function outputFrom(source, input = []) {
  const lines = []
  let index = 0
  await runJavaScript(
    compile(source, "js"),
    {
      log: line => lines.push(line),
    },
    async () => input[index++] ?? ""
  )
  return lines
}

describe("The examples", () => {
  for (const [file, expectedOutput, input] of examples) {
    it(`prints expected output for ${file}`, async () => {
      const source = readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8")
      assert.deepEqual(await outputFrom(source, input), expectedOutput)
    })
  }
})
