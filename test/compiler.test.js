import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import compile from "../src/compiler.js"
import * as core from "../src/core.js"
import { compileFromFile, help, main, runJavaScript, stringify } from "../src/webrogue.js"

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
    assert.equal(compile(source), 'let name = "Mira";\nconsole.log(name);')
  })

  it("runs generated JavaScript through the CLI runner", () => {
    const lines = []
    runJavaScript('console.log("ok", 7);', { log: line => lines.push(line) })
    assert.deepEqual(lines, ["ok 7"])
  })

  it("stringifies analyzed output without circular references or source locations", () => {
    const value = compile(source, "analyzed")
    const text = stringify(value)
    assert.match(text, /"kind": "Program"/)
    assert.doesNotMatch(text, /"at":/)
    const circular = { kind: "Circle" }
    circular.self = circular
    assert.match(stringify(circular), /\[Circular Circle\]/)
    const plainCircular = {}
    plainCircular.self = plainCircular
    assert.match(stringify(plainCircular), /\[Circular Object\]/)
  })

  it("describes core types for diagnostics", () => {
    const numericFunction = core.functionType([core.numberType], core.stringType)
    assert.equal(core.typeDescription(numericFunction), "(number) -> string")
    assert.equal(core.typeDescription(core.objectType("Hero")), "object Hero")
    assert.equal(core.typeDescription(core.stateType("Start")), "state Start")
    assert.equal(core.typeDescription({ kind: "Mystery" }), "[object Object]")
    assert(core.equivalent(numericFunction, core.functionType([core.numberType], core.stringType)))
    assert(!core.equivalent(numericFunction, core.functionType([core.stringType], core.stringType)))
    assert(!core.equivalent(undefined, core.numberType))
    assert(!core.equivalent(core.objectType("Hero"), core.stateType("Start")))
  })

  it("runs the CLI compiler helper successfully", async () => {
    const directory = await mkdtemp(join(tmpdir(), "webrogue-"))
    const file = join(directory, "program.wr")
    const lines = []
    try {
      await writeFile(file, source)
      const code = await compileFromFile(file, "js", {
        log: text => lines.push(text),
        error: text => lines.push(text),
      })
      assert.equal(code, 0)
      assert.equal(lines.join("\n"), 'let name = "Mira";\nconsole.log(name);')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("runs a source file and prints the program output", async () => {
    const directory = await mkdtemp(join(tmpdir(), "webrogue-"))
    const file = join(directory, "program.wr")
    const lines = []
    try {
      await writeFile(file, source)
      const code = await compileFromFile(file, "run", {
        log: text => lines.push(text),
        error: text => lines.push(text),
      })
      assert.equal(code, 0)
      assert.deepEqual(lines, ["Mira"])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("reports CLI compiler helper errors cleanly", async () => {
    const lines = []
    const code = await compileFromFile("missing-file.wr", "js", {
      log: text => lines.push(text),
      error: text => lines.push(text),
    })
    assert.equal(code, 1)
    assert.match(lines[0], /\u001b\[31m/)
  })

  it("prints help for invalid CLI usage", async () => {
    const lines = []
    const code = await main([], {
      log: text => lines.push(text),
      error: text => lines.push(text),
    })
    assert.equal(code, 2)
    assert.equal(lines[0], help)
  })

  it("prints help for invalid CLI output type", async () => {
    const lines = []
    const code = await main(["program.wr", "wat"], {
      log: text => lines.push(text),
      error: text => lines.push(text),
    })
    assert.equal(code, 2)
    assert.equal(lines[0], help)
  })

  it("runs the main helper for a valid CLI request", async () => {
    const directory = await mkdtemp(join(tmpdir(), "webrogue-"))
    const file = join(directory, "program.wr")
    const lines = []
    try {
      await writeFile(file, source)
      const code = await main([file, "js"], {
        log: text => lines.push(text),
        error: text => lines.push(text),
      })
      assert.equal(code, 0)
      assert.equal(lines.join("\n"), 'let name = "Mira";\nconsole.log(name);')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("runs the command-line entry point", async () => {
    const directory = await mkdtemp(join(tmpdir(), "webrogue-"))
    const file = join(directory, "program.wr")
    try {
      await writeFile(file, source)
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL("../src/webrogue.js", import.meta.url)), file, "js"],
        { encoding: "utf8" }
      )
      assert.equal(result.status, 0)
      assert.equal(result.stdout.trim(), 'let name = "Mira";\nconsole.log(name);')
      assert.equal(result.stderr, "")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
