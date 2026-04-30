import { describe, it } from "node:test"
import assert from "node:assert/strict"
import compile from "../src/compiler.js"

const source = 'let name = "Mira"; print name;'

describe("The compiler", () => {
  it("rejects unknown output types", () => {
    assert.throws(() => compile(source, "wat"), /Unknown output type/)
  })

  it("produces a parsed AST", () => {
    assert.equal(compile(source, "parsed").kind, "Program")
  })

  it("produces an analyzed AST", () => {
    const analyzed = compile(source, "analyzed")
    assert.equal(analyzed.statements[0].type, "string")
  })

  it("produces an optimized AST", () => {
    assert.equal(compile("print 1 + 2;", "optimized").statements[0].argument.value, 3)
  })

  it("generates JavaScript by default", () => {
    assert.equal(compile(source), 'let name_1 = "Mira";\nconsole.log(name_1);')
  })
})
