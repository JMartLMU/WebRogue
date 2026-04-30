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
      entity Hero {
        hp: number = 3;
        name: string = "Mira";
        alive: boolean = true;
      }
      room Start {
        title: "Start";
        description: "First room";
        contains: [Hero];
      }
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
const Hero_1 = Object.freeze({
  type: "entity",
  name: "Hero",
  fields: Object.freeze({
    hp: 3,
    name: "Mira",
    alive: true,
  }),
});
const Start_2 = Object.freeze({
  type: "room",
  name: "Start",
  title: "Start",
  description: "First room",
  contains: [Hero_1],
});
let turns_3 = 0;
function inc_4(x_5) {
  return (x_5 + 1);
}
turns_3 = inc_4(turns_3);
console.log(turns_3);
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
let hp_1 = 2;
while ((hp_1 > 0)) {
  if ((hp_1 === 1)) {
    break;
  }
  hp_1 = (hp_1 - 1);
}
`
    )
  })
})
