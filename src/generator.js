export default function generate(program) {
  const output = []
  let indent = 0

  const reservedWords = new Set([
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
  ])

  const targetName = (mapping => entity => {
    if (!mapping.has(entity)) {
      const base = entity.name.replace(/[^\p{L}\p{N}_$]/gu, "_")
      mapping.set(entity, reservedWords.has(base) ? `_${base}` : base)
    }
    return mapping.get(entity)
  })(new Map())

  function emit(line = "") {
    output.push(`${"  ".repeat(indent)}${line}`)
  }

  function gen(node) {
    return generators[node?.kind]?.(node) ?? node
  }

  function genBlock(statements) {
    indent += 1
    statements.forEach(gen)
    indent -= 1
  }

  const generators = {
    Program(p) {
      p.statements.forEach(gen)
    },

    VariableDeclaration(d) {
      emit(`let ${targetName(d.variable)} = ${gen(d.initializer)};`)
    },

    Assignment(s) {
      emit(`${targetName(s.target)} = ${gen(s.source)};`)
    },

    PrintStatement(s) {
      emit(`console.log(${gen(s.argument)});`)
    },

    IfStatement(s) {
      emit(`if (${gen(s.test)}) {`)
      genBlock(s.consequent)
      if (s.alternate) {
        emit("} else {")
        genBlock(s.alternate)
      }
      emit("}")
    },

    WhileStatement(s) {
      emit(`while (${gen(s.test)}) {`)
      genBlock(s.body)
      emit("}")
    },

    BreakStatement() {
      emit("break;")
    },

    ReturnStatement(s) {
      emit(s.expression ? `return ${gen(s.expression)};` : "return;")
    },

    FunctionDeclaration(d) {
      const name = targetName(d.fun)
      const params = d.params.map(param => targetName(param.variable)).join(", ")
      emit(`function ${name}(${params}) {`)
      genBlock(d.body)
      emit("}")
    },

    EntityDeclaration(d) {
      emit(`const ${targetName(d.entity)} = {`)
      indent += 1
      for (const field of d.fields) {
        emit(`${field.name}: ${gen(field.initializer)},`)
      }
      indent -= 1
      emit("};")
    },

    RoomDeclaration(d) {
      const field = name => d.fields.find(f => f.name === name)
      const title = field("title").value
      const description = field("description").value
      const contains = field("contains").entities
      emit(`const ${targetName(d.room)} = {`)
      indent += 1
      emit(`title: ${JSON.stringify(title)},`)
      emit(`description: ${JSON.stringify(description)},`)
      emit(`contains: [${contains.map(targetName).join(", ")}],`)
      indent -= 1
      emit("};")
    },

    ExpressionStatement(s) {
      emit(`${gen(s.expression)};`)
    },

    IdentifierExpression(e) {
      return targetName(e.entity)
    },

    CallExpression(e) {
      return `${gen(e.callee)}(${e.args.map(gen).join(", ")})`
    },

    BinaryExpression(e) {
      const op = { and: "&&", or: "||", "==": "===", "!=": "!==" }[e.op] ?? e.op
      return `(${gen(e.left)} ${op} ${gen(e.right)})`
    },

    UnaryExpression(e) {
      const op = e.op === "not" ? "!" : "-"
      return `(${op}${gen(e.operand)})`
    },

    NumberLiteral(e) {
      return String(e.value)
    },

    StringLiteral(e) {
      return JSON.stringify(e.value)
    },

    BooleanLiteral(e) {
      return String(e.value)
    },
  }

  gen(program)
  return output.join("\n")
}
