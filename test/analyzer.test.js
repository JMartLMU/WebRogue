import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"

const goodExampleFiles = [
  "hello.wr",
  "combat.wr",
  "rooms.wr",
  "loop.wr",
  "functions.wr",
  "tiny-dungeon.wr",
]

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
  ["string comparison", 'let first = "a"; let second = "b"; print first < second;'],
  ["string concatenation", 'let label: string = "web" + "rogue";'],
  ["entity-valued variable", "entity Hero { hp: number = 10; } let active: Hero = Hero;"],
  [
    "nonvoid if else return",
    "function label(ok: boolean) -> string { if ok { return \"yes\"; } else { return \"no\"; } }",
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
  ["non-function call", "let x = 1; x();", /Call of non-function/],
  ["duplicate parameter", "function f(x: number, x: number) { return; }", /Identifier x already declared/],
  ["unknown type", "let x: Missing = 1;", /Identifier Missing not declared/],
  ["non-type annotation", "function f() { return; } let x: f = 1;", /f is not a type/],
  ["void parameter", "function f(x: void) { return; }", /Void is only valid/],
  [
    "function variable type mismatch",
    'function f() -> number { return 1; } function g() -> string { return "x"; } let h = f; h = g;',
    /Cannot assign \(\) -> string to \(\) -> number/,
  ],
  [
    "entity variable type mismatch",
    "entity Hero { hp: number = 10; } entity Slime { hp: number = 6; } let active: Hero = Slime;",
    /Cannot assign entity Slime to entity Hero/,
  ],
  [
    "room variable type mismatch",
    'entity Hero { hp: number = 10; } room Start { title: "Start"; description: "Here"; contains: [Hero]; } room End { title: "End"; description: "There"; contains: [Hero]; } let current: Start = End;',
    /Cannot assign room End to room Start/,
  ],
  ["return value from void function", "function f() { return 1; }", /Cannot return a value from a void function/],
  ["empty return from nonvoid function", "function f() -> number { return; }", /must return a value/],
  ["missing nonvoid return", "function f() -> number { print 1; }", /must return a value on every path/],
  [
    "partial nonvoid return",
    "function f(ok: boolean) -> number { if ok { return 1; } print 0; }",
    /must return a value on every path/,
  ],
  [
    "duplicate entity field",
    "entity Hero { hp: number = 10; hp: number = 11; }",
    /Field hp already declared/,
  ],
  [
    "duplicate room field",
    'entity Hero { hp: number = 10; } room Start { title: "Start"; title: "Again"; description: "Here"; contains: [Hero]; }',
    /Room field title already declared/,
  ],
  [
    "duplicate room contains entry",
    'entity Hero { hp: number = 10; } room Start { title: "Start"; description: "Here"; contains: [Hero, Hero]; }',
    /Entity Hero appears more than once/,
  ],
  [
    "incomplete room",
    'entity Hero { hp: number = 10; } room Start { title: "Start"; contains: [Hero]; }',
    /Room Start is missing description/,
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

  for (const file of goodExampleFiles) {
    it(`accepts example ${file}`, () => {
      const source = readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8")
      assert.equal(analyze(parse(source)).kind, "Program")
    })
  }

  it("rejects the negative type example", () => {
    const source = readFileSync(new URL("../examples/errors/bad-type.wr", import.meta.url), "utf8")
    assert.throws(() => analyze(parse(source)), /Cannot assign string to number/)
  })

  for (const [scenario, source, errorPattern] of badPrograms) {
    it(`rejects ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorPattern)
    })
  }
})
