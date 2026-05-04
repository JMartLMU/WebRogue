import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import parse from "../src/parser.js"

const goodExampleFiles = [
  "hello.wr",
  "combat.wr",
  "states.wr",
  "loop.wr",
  "functions.wr",
  "tiny-dungeon.wr",
]

const syntaxChecks = [
  ["empty program", ""],
  ["typed variable declaration", "let hp: number = 10;"],
  ["inferred variable declaration", 'let name = "Mira";'],
  ["assignment", "let hp = 10; hp = hp - 1;"],
  ["print statement", 'print "hello";'],
  ["if else statement", "if true { print 1; } else { print 2; }"],
  ["while and break", "while true { break; }"],
  ["void function", "function tick() { return; }"],
  ["returning function", "function hurt(hp: number) -> number { return hp - 1; }"],
  [
    "object declaration",
    'object Hero { name: string = "Ada"; hp: number = 10; alive: boolean = true; }',
  ],
  [
    "state declaration",
    'object Hero { hp: number = 10; } state Start { title: "Start"; description: "Here"; contains: [Hero]; }',
  ],
  ["state transition", 'state Start { title: "Start"; description: "Here"; contains: []; } _jump(Start);'],
  ["operator precedence", "print 2 + 3 * 4 > 10 and not false;"],
  ["greater-than-or-equal", "print 5 >= 4;"],
  ["function calls", "function f(x: number) -> number { return x; } print f(1);"],
  ["comments", "let x = 1; // a comment\nprint x;"],
  ["escaped strings", 'print "line\\nquote: \\"";'],
  ["parenthesized expressions", "print (1 + 2) * 3;"],
  [
    "custom type annotation syntax",
    "object Hero { hp: number = 10; } let active: Hero = Hero;",
  ],
]

const syntaxErrors = [
  ["missing semicolon", "let hp = 10", /Line 1, col 12/],
  ["keyword as identifier", "let while = 10;", /Line 1, col 5/],
  ["bad expression", "print * 5;", /Line 1, col 7/],
  ["trailing comma in contains", 'state R { contains: [Hero,]; }', /Line 1, col 27/],
]

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`matches ${scenario}`, () => {
      assert.equal(parse(source).kind, "Program")
    })
  }

  for (const file of goodExampleFiles) {
    it(`matches example ${file}`, () => {
      const source = readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8")
      assert.equal(parse(source).kind, "Program")
    })
  }

  it("matches the negative type example before semantic analysis", () => {
    const source = readFileSync(new URL("../examples/errors/bad-type.wr", import.meta.url), "utf8")
    assert.equal(parse(source).kind, "Program")
  })

  for (const [scenario, source, errorPattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source), errorPattern)
    })
  }
})
