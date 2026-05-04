import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"

const goodExampleFiles = [
  "hello.wr",
  "combat.wr",
  "states.wr",
  "loop.wr",
  "functions.wr",
  "tiny-dungeon.wr",
  "choice.wr",
  "dialogue.wr",
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
    "objects and states",
    'object Hero { hp: number = 10; alive: boolean = true; } state Start { title: "Start"; description: "Here"; contains: [Hero]; }',
  ],
  ["string comparison", 'let first = "a"; let second = "b"; print first < second;'],
  ["string concatenation", 'let label: string = "web" + "rogue";'],
  ["object-valued variable", "object Hero { hp: number = 10; } let active: Hero = Hero;"],
  [
    "state-valued variable",
    'object Hero { hp: number = 10; } state Start { title: "Start"; description: "Here"; contains: [Hero]; } let current: Start = Start;',
  ],
  [
    "state jump to a later declaration",
    '_jump(End); object Hero { hp: number = 10; } state Start { title: "Start"; description: "Here"; contains: [Hero]; } state End { title: "End"; description: "There"; contains: [Hero]; }',
  ],
  [
    "numbered choice",
    "let enemyHp = 6; choice(num, Attack, Heal) { option Attack { enemyHp = enemyHp - 2; } option Heal { enemyHp = enemyHp + 1; } }",
  ],
  [
    "choice with inferred options",
    "choice(num) { option Attack { print 1; } option Heal { print 2; } }",
  ],
  [
    "keyboard choice",
    "choice(keyboard.a, Attack) { option Attack: { print 1; } }",
  ],
  [
    "custom choice input function",
    'function pick() -> string { return "Attack"; } choice(pick, Attack) { option Attack { print "ok"; } }',
  ],
  [
    "state dialogue",
    'state Example { title: "Example"; description: "Here"; contains: []; dialogue(keyboard.space, "Press space", "first", "last"); }',
  ],
  [
    "state dialogue with custom input",
    'function nextLine() -> string { return "space"; } state Example { title: "Example"; description: "Here"; contains: []; dialogue(nextLine, "Press space", "first"); }',
  ],
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
    "object variable type mismatch",
    "object Hero { hp: number = 10; } object Slime { hp: number = 6; } let active: Hero = Slime;",
    /Cannot assign object Slime to object Hero/,
  ],
  [
    "state variable type mismatch",
    'object Hero { hp: number = 10; } state Start { title: "Start"; description: "Here"; contains: [Hero]; } state End { title: "End"; description: "There"; contains: [Hero]; } let current: Start = End;',
    /Cannot assign state End to state Start/,
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
    "duplicate object field",
    "object Hero { hp: number = 10; hp: number = 11; }",
    /Field hp already declared/,
  ],
  [
    "duplicate state field",
    'object Hero { hp: number = 10; } state Start { title: "Start"; title: "Again"; description: "Here"; contains: [Hero]; }',
    /State field title already declared/,
  ],
  [
    "duplicate state contains entry",
    'object Hero { hp: number = 10; } state Start { title: "Start"; description: "Here"; contains: [Hero, Hero]; }',
    /Object Hero appears more than once/,
  ],
  [
    "incomplete state",
    'object Hero { hp: number = 10; } state Start { title: "Start"; contains: [Hero]; }',
    /State Start is missing description/,
  ],
  [
    "duplicate game definition",
    'object Hero { hp: number = 10; } state Hero { title: "Hero"; description: "Here"; contains: []; }',
    /Game definition Hero already declared/,
  ],
  ["unknown state object", 'state Start { title: "Start"; description: "Here"; contains: [Hero]; }', /Identifier Hero not declared/],
  [
    "state contains non-object",
    'let Hero = 1; state Start { title: "Start"; description: "Here"; contains: [Hero]; }',
    /Hero is not an object/,
  ],
  ["unknown jump state", "_jump(Missing);", /State Missing not declared/],
  [
    "choice arm not listed",
    "choice(num, Attack) { option Heal { print 1; } }",
    /Option block Heal is not listed/,
  ],
  [
    "choice option missing block",
    "choice(num, Attack, Heal) { option Attack { print 1; } }",
    /Choice option Heal has no option block/,
  ],
  [
    "duplicate choice option",
    "choice(num, Attack, Attack) { option Attack { print 1; } }",
    /Duplicate choice option Attack/,
  ],
  [
    "duplicate option block",
    "choice(num) { option Attack { print 1; } option Attack { print 2; } }",
    /Duplicate option block Attack/,
  ],
  [
    "choice inside function",
    "function f() { choice(num, Attack) { option Attack { print 1; } } return; }",
    /Choice cannot appear inside a function/,
  ],
  [
    "unknown custom choice input",
    "choice(pick, Attack) { option Attack { print 1; } }",
    /Identifier pick not declared/,
  ],
  [
    "non-function custom choice input",
    "let pick = 1; choice(pick, Attack) { option Attack { print 1; } }",
    /pick is not a choice input function/,
  ],
  [
    "custom choice input with arguments",
    "function pick(x: number) -> string { return \"Attack\"; } choice(pick, Attack) { option Attack { print 1; } }",
    /Choice input function pick must not require arguments/,
  ],
  [
    "custom choice input wrong return type",
    "function pick() -> boolean { return true; } choice(pick, Attack) { option Attack { print 1; } }",
    /Choice input function pick must return string or number/,
  ],
  [
    "empty state dialogue",
    'state Example { title: "Example"; description: "Here"; contains: []; dialogue(keyboard.space, "Press space"); }',
    /Dialogue must include at least one line/,
  ],
  [
    "state dialogue custom input with arguments",
    'function nextLine(x: number) -> string { return "space"; } state Example { title: "Example"; description: "Here"; contains: []; dialogue(nextLine, "Press space", "first"); }',
    /Dialogue input function nextLine must not require arguments/,
  ],
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
