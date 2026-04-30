import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"

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
    "entity declaration",
    'entity Hero { name: string = "Ada"; hp: number = 10; alive: boolean = true; }',
  ],
  [
    "room declaration",
    'entity Hero { hp: number = 10; } room Start { title: "Start"; description: "Here"; contains: [Hero]; }',
  ],
  ["operator precedence", "print 2 + 3 * 4 > 10 and not false;"],
  ["function calls", "function f(x: number) -> number { return x; } print f(1);"],
  ["comments", "let x = 1; // a comment\nprint x;"],
]

const syntaxErrors = [
  ["missing semicolon", "let hp = 10", /Line 1, col 12/],
  ["keyword as identifier", "let while = 10;", /Line 1, col 5/],
  ["bad expression", "print * 5;", /Line 1, col 7/],
  ["trailing comma in contains", 'room R { contains: [Hero,]; }', /Line 1, col 26/],
]

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`matches ${scenario}`, () => {
      assert.equal(parse(source).kind, "Program")
    })
  }

  for (const [scenario, source, errorPattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source), errorPattern)
    })
  }
})
