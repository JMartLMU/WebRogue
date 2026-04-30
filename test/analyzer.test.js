import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"

const goodPrograms = [
  ["basic declarations", 'let hp: number = 10; let name: string = "Mira"; let ok = true;'],
  ["assignment", "let hp = 10; hp = hp - 1;"],
  ["nested scope shadowing", "let x = 1; if true { let x = 2; print x; } print x;"],
  [
    "functions and calls",
    'function shout(text: string) { print text; return; } shout("hi");',
  ],
  [
    "typed return",
    "function damage(hp: number, amount: number) -> number { return hp - amount; } let hp = damage(10, 2);",
  ],
  ["while break", "let running = true; while running { running = false; break; }"],
  [
    "entities and rooms",
    'entity Hero { hp: number = 10; alive: boolean = true; } room Start { title: "Start"; description: "Here"; contains: [Hero]; }',
  ],
]

const badPrograms = [
  ["undeclared identifier", "print missing;", /Identifier missing not declared/],
  ["duplicate declaration", "let x = 1; let x = 2;", /Identifier x already declared/],
  ["assignment type mismatch", "let hp: number = 10; hp = true;", /Cannot assign boolean to number/],
  ["initializer type mismatch", 'let hp: number = "full";', /Cannot assign string to number/],
  ["nonboolean if", "if 1 { print 1; }", /Expected boolean/],
  ["nonboolean while", "while 1 { print 1; }", /Expected boolean/],
  [
    "return type mismatch",
    'function f() -> number { return "nope"; }',
    /Cannot assign string to number/,
  ],
  ["return outside function", "return;", /Return can only appear inside a function/],
  ["break outside loop", "break;", /Break can only appear inside a loop/],
  [
    "wrong argument count",
    "function f(x: number) { return; } f(1, 2);",
    /1 argument\(s\) required but 2 passed/,
  ],
  [
    "wrong argument type",
    'function f(x: number) { return; } f("one");',
    /Cannot assign string to number/,
  ],
  [
    "duplicate game definition",
    "entity Hero { hp: number = 10; } room Hero { contains: []; }",
    /Game definition Hero already declared/,
  ],
  ["unknown room entity", 'room Start { contains: [Hero]; }', /Identifier Hero not declared/],
  ["void variable", "let nope: void = 1;", /Void is only valid/],
]

describe("The analyzer", () => {
  for (const [scenario, source] of goodPrograms) {
    it(`accepts ${scenario}`, () => {
      assert.equal(analyze(parse(source)).kind, "Program")
    })
  }

  for (const [scenario, source, errorPattern] of badPrograms) {
    it(`rejects ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorPattern)
    })
  }
})
