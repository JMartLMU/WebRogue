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

  const targetName = (mapping => declaration => {
    if (!mapping.has(declaration)) {
      const base = declaration.name.replace(/[^\p{L}\p{N}_$]/gu, "_")
      mapping.set(declaration, reservedWords.has(base) ? `_${base}` : base)
    }
    return mapping.get(declaration)
  })(new Map())

  let choiceCount = 0
  let usesDialogueRuntime = false

  function hasChoice(node) {
    if (Array.isArray(node)) return node.some(hasChoice)
    if (node?.kind === "ChoiceStatement") return true
    if (node?.kind === "IfStatement") return hasChoice(node.consequent) || hasChoice(node.alternate)
    if (node?.kind === "WhileStatement" || node?.kind === "FunctionDeclaration") return hasChoice(node.body)
    return false
  }

  function hasDialogue(node) {
    if (Array.isArray(node)) return node.some(hasDialogue)
    if (node?.kind === "StateDeclaration") return node.fields.some(field => field.name === "dialogue")
    if (node?.kind === "IfStatement") return hasDialogue(node.consequent) || hasDialogue(node.alternate)
    if (node?.kind === "WhileStatement" || node?.kind === "FunctionDeclaration") return hasDialogue(node.body)
    if (node?.kind === "ChoiceStatement") return node.arms.some(arm => hasDialogue(arm.body))
    return false
  }

  function emitReadLineRuntime() {
    emit("let __webrogueInput = null;")
    emit("let __webroguePipedInputLines = null;")
    emit("async function __webrogueReadLine(prompt) {")
    indent += 1
    emit("if (globalThis.__webrogueReadLineHost) return globalThis.__webrogueReadLineHost(prompt);")
    emit('const { stdin, stdout } = await import("node:process");')
    emit("if (!stdin.isTTY) {")
    indent += 1
    emit("stdout.write(prompt);")
    emit("if (!__webroguePipedInputLines) {")
    indent += 1
    emit("const chunks = [];")
    emit("for await (const chunk of stdin) chunks.push(chunk);")
    emit("__webroguePipedInputLines = Buffer.concat(chunks).toString().split(/\\r?\\n/);")
    indent -= 1
    emit("}")
    emit('return __webroguePipedInputLines.shift() ?? "";')
    indent -= 1
    emit("}")
    emit("if (!__webrogueInput) {")
    indent += 1
    emit('const { createInterface } = await import("node:readline/promises");')
    emit("__webrogueInput = createInterface({ input: stdin, output: stdout });")
    indent -= 1
    emit("}")
    emit("return await __webrogueInput.question(prompt);")
    indent -= 1
    emit("}")
    emit("function __webrogueCloseReadLine() {")
    indent += 1
    emit("if (__webrogueInput) {")
    indent += 1
    emit("__webrogueInput.close();")
    emit("__webrogueInput = null;")
    indent -= 1
    emit("}")
    emit("__webroguePipedInputLines = null;")
    indent -= 1
    emit("}")
  }

  function emitChoiceRuntime() {
    emit("async function __webrogueChoice(inputType, options) {")
    indent += 1
    emit('if (typeof inputType === "function") {')
    indent += 1
    emit("const picked = await inputType();")
    emit('return typeof picked === "number" ? options[picked - 1] ?? "" : String(picked);')
    indent -= 1
    emit("}")
    emit('if (inputType === "num") {')
    indent += 1
    emit('options.forEach((option, index) => console.log(`${index + 1}. ${option}`));')
    emit('const answer = await __webrogueReadLine("> ");')
    emit('return options[Number(answer) - 1] ?? "";')
    indent -= 1
    emit("}")
    emit('if (typeof inputType === "string" && inputType.startsWith("keyboard.")) {')
    indent += 1
    emit('const key = inputType.slice("keyboard.".length);')
    emit('const answer = await __webrogueReadLine(`[${key}] `);')
    emit('return answer === key ? options[0] ?? key : "";')
    indent -= 1
    emit("}")
    emit('return await __webrogueReadLine("> ");')
    indent -= 1
    emit("}")
  }

  function emitDialogueRuntime() {
    emit("function __webrogueMatchesKeyboard(answer, key) {")
    indent += 1
    emit('if (key === "space") return answer === "" || answer === " " || answer === "space";')
    emit("return answer === key;")
    indent -= 1
    emit("}")
    emit("async function __webrogueWaitForDialogue(inputType, prompt) {")
    indent += 1
    emit('if (typeof inputType === "function") {')
    indent += 1
    emit("await inputType();")
    emit("return;")
    indent -= 1
    emit("}")
    emit('if (typeof inputType === "string" && inputType.startsWith("keyboard.")) {')
    indent += 1
    emit('const key = inputType.slice("keyboard.".length);')
    emit("while (true) {")
    indent += 1
    emit("const answer = await __webrogueReadLine(`${prompt} `);")
    emit("if (__webrogueMatchesKeyboard(answer, key)) return;")
    indent -= 1
    emit("}")
    indent -= 1
    emit("}")
    emit("await __webrogueReadLine(`${prompt} `);")
    indent -= 1
    emit("}")
    emit("async function __webrogueRunDialogue(state) {")
    indent += 1
    emit("if (!state?.dialogue) return;")
    emit("for await (const _line of state.dialogue()) {}")
    indent -= 1
    emit("}")
  }

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
      const usesChoiceRuntime = hasChoice(p.statements)
      usesDialogueRuntime = hasDialogue(p.statements)
      if (usesChoiceRuntime || usesDialogueRuntime) {
        emitReadLineRuntime()
      }
      if (usesChoiceRuntime) {
        emitChoiceRuntime()
      }
      if (usesDialogueRuntime) {
        emitDialogueRuntime()
      }
      if (p.defaultStateName) {
        emit(`let __webrogueCurrentState = ${JSON.stringify(p.defaultStateName)};`)
        if (usesDialogueRuntime) {
          emit("const __webrogueStates = new Map();")
          emit("async function _jump(targetState) {")
          indent += 1
          emit("__webrogueCurrentState = targetState;")
          emit("await __webrogueRunDialogue(__webrogueStates.get(targetState));")
          emit("return __webrogueCurrentState;")
          indent -= 1
          emit("}")
        } else {
          emit("function _jump(targetState) {")
          indent += 1
          emit("__webrogueCurrentState = targetState;")
          emit("return __webrogueCurrentState;")
          indent -= 1
          emit("}")
        }
      }
      p.statements.forEach(gen)
      if (usesChoiceRuntime || usesDialogueRuntime) {
        emit("__webrogueCloseReadLine();")
      }
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

    JumpStatement(s) {
      emit(`${usesDialogueRuntime ? "await " : ""}_jump(${JSON.stringify(s.targetName)});`)
    },

    ChoiceStatement(s) {
      const selection = `__webrogueChoice_${++choiceCount}`
      emit(`const ${selection} = await __webrogueChoice(${gen(s.input)}, ${JSON.stringify(s.optionNames)});`)
      s.arms.forEach((arm, index) => {
        emit(`${index === 0 ? "if" : "} else if"} (${selection} === ${JSON.stringify(arm.name)}) {`)
        genBlock(arm.body)
      })
      emit("}")
    },

    FunctionDeclaration(d) {
      const name = targetName(d.fun)
      const params = d.params.map(param => targetName(param.variable)).join(", ")
      emit(`function ${name}(${params}) {`)
      genBlock(d.body)
      emit("}")
    },

    ObjectDeclaration(d) {
      emit(`const ${targetName(d.object)} = {`)
      indent += 1
      for (const field of d.fields) {
        emit(`${field.name}: ${gen(field.initializer)},`)
      }
      indent -= 1
      emit("};")
    },

    StateDeclaration(d) {
      const field = name => d.fields.find(f => f.name === name)
      const title = field("title").value
      const description = field("description").value
      const contains = field("contains").objects
      const dialogue = field("dialogue")
      emit(`const ${targetName(d.state)} = {`)
      indent += 1
      emit(`title: ${JSON.stringify(title)},`)
      emit(`description: ${JSON.stringify(description)},`)
      emit(`contains: [${contains.map(targetName).join(", ")}],`)
      if (dialogue) {
        emit("dialogue: async function* () {")
        indent += 1
        emit(`const lines = ${JSON.stringify(dialogue.lines)};`)
        emit("for (let index = 0; index < lines.length; index += 1) {")
        indent += 1
        emit("console.log(lines[index]);")
        emit("yield lines[index];")
        emit("if (index < lines.length - 1) {")
        indent += 1
        emit(`await __webrogueWaitForDialogue(${gen(dialogue.input)}, ${JSON.stringify(dialogue.prompt)});`)
        indent -= 1
        emit("}")
        indent -= 1
        emit("}")
        indent -= 1
        emit("},")
      }
      indent -= 1
      emit("};")
      if (usesDialogueRuntime) {
        emit(`__webrogueStates.set(${JSON.stringify(d.state.name)}, ${targetName(d.state)});`)
      }
    },

    ExpressionStatement(s) {
      emit(`${gen(s.expression)};`)
    },

    ChoiceInput(input) {
      if (input.mode === "custom") return targetName(input.declaration)
      return JSON.stringify(input.name)
    },

    IdentifierExpression(e) {
      return targetName(e.declaration)
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
