import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import generate from "../src/generator.js"

function compileToJs(source) {
  return generate(optimize(analyze(parse(source))))
}

function dedent(strings) {
  return strings
    .toString()
    .split("\n")
    .map(line => line.trimEnd())
    .filter((line, index, lines) => line.length > 0 || (index > 0 && index < lines.length - 1))
    .join("\n")
    .trim()
}

describe("The generator", () => {
  it("generates JavaScript for game declarations and functions", () => {
    const source = `
      object Hero {
        hp: number = 3;
        name: string = "Mira";
        alive: boolean = true;
      }
      state Start {
        title: "Start";
        description: "First state";
        contains: [Hero];
      }
      _jump(Start);
      let turns: number = 0;
      function inc(x: number) -> number {
        return x + 1;
      }
      turns = inc(turns);
      print turns;
    `
    assert.equal(
      compileToJs(source),
      dedent`
let __webrogueCurrentState = "Start";
function _jump(targetState) {
  __webrogueCurrentState = targetState;
  return __webrogueCurrentState;
}
const Hero = {
  hp: 3,
  name: "Mira",
  alive: true,
};
const Start = {
  title: "Start",
  description: "First state",
  contains: [Hero],
};
_jump("Start");
let turns = 0;
function inc(x) {
  return (x + 1);
}
turns = inc(turns);
console.log(turns);
`
    )
  })

  it("uses the first declared state when Start is absent", () => {
    assert.equal(
      compileToJs('state Entry { title: "Entry"; description: "Here"; contains: []; }'),
      dedent`
let __webrogueCurrentState = "Entry";
function _jump(targetState) {
  __webrogueCurrentState = targetState;
  return __webrogueCurrentState;
}
const Entry = {
  title: "Entry",
  description: "Here",
  contains: [],
};
`
    )
  })

  it("generates JavaScript for control flow", () => {
    const source = `
      let hp = 2;
      while hp > 0 {
        if hp == 1 {
          break;
        }
        hp = hp - 1;
      }
    `
    assert.equal(
      compileToJs(source),
      dedent`
let hp = 2;
while ((hp > 0)) {
  if ((hp === 1)) {
    break;
  }
  hp = (hp - 1);
}
`
    )
  })

  it("generates JavaScript similar to the hello example", () => {
    const source = `
      print "Welcome to WebRogue!";
      let heroName: string = "Mira";
      let hp: number = 12;
      let alive: boolean = true;
      if alive {
        print heroName;
        print "enters the dungeon.";
      }
    `
    assert.equal(
      compileToJs(source),
      dedent`
console.log("Welcome to WebRogue!");
let heroName = "Mira";
let hp = 12;
let alive = true;
if (alive) {
  console.log(heroName);
  console.log("enters the dungeon.");
}
`
    )
  })

  it("generates JavaScript for else branches", () => {
    assert.equal(
      compileToJs('let alive = true; if alive { print "up"; } else { print "down"; }'),
      dedent`
let alive = true;
if (alive) {
  console.log("up");
} else {
  console.log("down");
}
`
    )
  })

  it("generates JavaScript for expression statements and unary expressions", () => {
    assert.equal(
      compileToJs(`
        function tick() {
          return;
        }
        tick();
        let hp = 1;
        print -hp;
        let alive = true;
        print not alive;
      `),
      dedent`
function tick() {
  return;
}
tick();
let hp = 1;
console.log((-hp));
let alive = true;
console.log((!alive));
`
    )
  })

  it("keeps JavaScript reserved words safe", () => {
    assert.equal(compileToJs("let class = 1; print class;"), "let _class = 1;\nconsole.log(_class);")
  })
})
