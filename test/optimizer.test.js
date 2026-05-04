import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"

function optimized(source) {
  return optimize(analyze(parse(source)))
}

function printedExpression(source) {
  return optimized(`let x = 7; ${source}`).statements.at(-1).argument
}

describe("The optimizer", () => {
  it("folds numeric constants", () => {
    assert.equal(printedExpression("print 2 + 3 * 4;").value, 14)
    assert.equal(printedExpression("print 10 / 2 - 3;").value, 2)
    assert.equal(printedExpression("print 10 % 4;").value, 2)
    assert.equal(printedExpression("print 9 - 4;").value, 5)
  })

  it("folds relational, equality, and unary constants", () => {
    assert.equal(printedExpression("print 3 < 4;").value, true)
    assert.equal(printedExpression("print 3 <= 4;").value, true)
    assert.equal(printedExpression("print 5 > 4;").value, true)
    assert.equal(printedExpression("print 5 >= 4;").value, true)
    assert.equal(printedExpression("print 5 == 5;").value, true)
    assert.equal(printedExpression('print "a" != "b";').value, true)
    assert.equal(printedExpression('print "web" + "rogue";').value, "webrogue")
    assert.equal(printedExpression("print true and false;").value, false)
    assert.equal(printedExpression("print true or false;").value, true)
    assert.equal(printedExpression("print false or false;").value, false)
    assert.equal(printedExpression("print not false;").value, true)
    assert.equal(printedExpression("print -5;").value, -5)
  })

  it("keeps nonconstant unary expressions", () => {
    assert.equal(printedExpression("print -x;").kind, "UnaryExpression")
    assert.equal(printedExpression("print not (x > 0);").kind, "UnaryExpression")
  })

  it("simplifies arithmetic identities", () => {
    assert.equal(printedExpression("print x + 0;").name, "x")
    assert.equal(printedExpression("print 0 + x;").name, "x")
    assert.equal(printedExpression("print x - 0;").name, "x")
    assert.equal(printedExpression("print x * 1;").name, "x")
    assert.equal(printedExpression("print 1 * x;").name, "x")
  })

  it("simplifies multiplication by zero for pure expressions", () => {
    assert.equal(printedExpression("print x * 0;").value, 0)
    assert.equal(printedExpression("print 0 * x;").value, 0)
    assert.equal(printedExpression("print (-x) * 0;").value, 0)
  })

  it("keeps side-effecting calls when multiplication by zero appears", () => {
    const program = optimized(`
      function noisy() -> number {
        print "called";
        return 1;
      }
      print noisy() * 0;
    `)
    assert.equal(program.statements[1].argument.kind, "BinaryExpression")
  })

  it("keeps side-effecting binary expressions when multiplication by zero appears", () => {
    const program = optimized(`
      function noisy() -> number {
        print "called";
        return 1;
      }
      print (noisy() + 1) * 0;
    `)
    assert.equal(program.statements[1].argument.kind, "BinaryExpression")
  })

  it("keeps side-effecting unary expressions when multiplication by zero appears", () => {
    const program = optimized(`
      function noisy() -> number {
        print "called";
        return 1;
      }
      print (-noisy()) * 0;
    `)
    assert.equal(program.statements[1].argument.kind, "BinaryExpression")
  })

  it("simplifies boolean identities", () => {
    assert.equal(printedExpression("print true and x > 0;").kind, "BinaryExpression")
    assert.equal(printedExpression("print false and x > 0;").value, false)
    assert.equal(printedExpression("print true or x > 0;").value, true)
    assert.equal(printedExpression("print false or x > 0;").kind, "BinaryExpression")
    assert.equal(printedExpression("print x > 0 and true;").kind, "BinaryExpression")
    assert.equal(printedExpression("print x > 0 and false;").value, false)
    assert.equal(printedExpression("print x > 0 or false;").kind, "BinaryExpression")
    assert.equal(printedExpression("print x > 0 or true;").value, true)
  })

  it("keeps side-effecting boolean operands when required", () => {
    const program = optimized(`
      function noisy() -> boolean {
        print "called";
        return true;
      }
      print noisy() and false;
    `)
    assert.equal(program.statements[1].argument.kind, "BinaryExpression")
  })

  it("eliminates dead if branches", () => {
    assert.equal(optimized("if true { print 1; } else { print 2; }").statements[0].argument.value, 1)
    assert.equal(optimized("if false { print 1; } else { print 2; }").statements[0].argument.value, 2)
    assert.deepEqual(optimized("if false { print 1; }").statements, [])
  })

  it("eliminates while false", () => {
    assert.deepEqual(optimized("while false { print 1; }").statements, [])
  })

  it("removes unreachable statements after return", () => {
    const program = optimized(`
      function answer() -> number {
        return 42;
        print 0;
      }
      print answer();
    `)
    assert.equal(program.statements[0].body.length, 1)
  })

  it("removes unreachable statements after break", () => {
    const program = optimized(`
      while true {
        break;
        print 0;
      }
      print 1;
    `)
    assert.equal(program.statements[0].body.length, 1)
    assert.equal(program.statements[1].argument.value, 1)
  })

  it("optimizes expression statements", () => {
    const program = optimized(`
      function tick() {
        return;
      }
      tick();
    `)
    assert.equal(program.statements[1].expression.kind, "CallExpression")
  })

  it("treats if statements with terminal branches as terminal", () => {
    const program = optimized(`
      function choose(ok: boolean) -> number {
        if ok {
          return 1;
        } else {
          return 2;
        }
        print 0;
      }
    `)
    assert.equal(program.statements[0].body.length, 1)
  })
})
