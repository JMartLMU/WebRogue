import * as core from "./core.js"

class Context {
  constructor({ parent = null, locals = new Map(), inLoop = false, function: f = null } = {}) {
    Object.assign(this, { parent, locals, inLoop, function: f })
  }

  add(name, declaration) {
    this.locals.set(name, declaration)
  }

  lookup(name) {
    return this.locals.get(name) ?? this.parent?.lookup(name)
  }

  newChildContext(props = {}) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() })
  }
}

function messageAt(node) {
  return node.at
}

function must(condition, message, node) {
  if (!condition) throw new Error(`${messageAt(node)}${message}`)
}

function assignable(sourceType, targetType) {
  return core.equivalent(sourceType, targetType)
}

function isNumber(e) {
  return e.type === core.numberType
}

function isString(e) {
  return e.type === core.stringType
}

function isVoid(type) {
  return type === core.voidType
}

export default function analyze(program) {
  let context = new Context()
  const gameDefinitionNames = new Set()
  const knownStateDeclarations = new Map()

  function withChildContext(props, work) {
    const parent = context
    context = context.newChildContext(props)
    const result = work()
    context = parent
    return result
  }

  function mustNotAlreadyBeDeclaredHere(name, node) {
    must(!context.locals.has(name), `Identifier ${name} already declared`, node)
  }

  function declare(name, declaration, node) {
    mustNotAlreadyBeDeclaredHere(name, node)
    context.add(name, declaration)
    return declaration
  }

  function lookup(name, node) {
    const declaration = context.lookup(name)
    must(declaration, `Identifier ${name} not declared`, node)
    return declaration
  }

  function collectStateDeclarations(statements) {
    for (const statement of statements) {
      if (statement.kind === "StateDeclaration") {
        must(
          !knownStateDeclarations.has(statement.name),
          `Game definition ${statement.name} already declared`,
          statement
        )
        knownStateDeclarations.set(statement.name, statement)
      } else if (statement.kind === "IfStatement") {
        collectStateDeclarations(statement.consequent)
        if (statement.alternate) collectStateDeclarations(statement.alternate)
      } else if (statement.kind === "WhileStatement" || statement.kind === "FunctionDeclaration") {
        collectStateDeclarations(statement.body)
      } else if (statement.kind === "ChoiceStatement") {
        for (const arm of statement.arms) collectStateDeclarations(arm.body)
      }
    }
  }

  function resolveType(typeNode, { allowVoid = false } = {}) {
    let type
    if (core.primitiveTypes.has(typeNode.name)) {
      type = typeNode.name
    } else {
      const declaration = lookup(typeNode.name, typeNode)
      must(
        declaration.kind === "Object" || declaration.kind === "State",
        `${typeNode.name} is not a type`,
        typeNode
      )
      type = declaration.type
    }
    must(allowVoid || !isVoid(type), "Void is only valid as a function return type", typeNode)
    return type
  }

  function mustBeAssignable(expression, targetType, node) {
    const sourceDescription = core.typeDescription(expression.type)
    const targetDescription = core.typeDescription(targetType)
    must(
      assignable(expression.type, targetType),
      `Cannot assign ${sourceDescription} to ${targetDescription}`,
      node
    )
  }

  function mustHaveType(expression, type, node) {
    must(
      core.equivalent(expression.type, type),
      `Expected ${core.typeDescription(type)}`,
      node
    )
  }

  function mustHaveSameType(left, right, node) {
    must(core.equivalent(left.type, right.type), "Operands must have the same type", node)
  }

  function mustHaveNoDuplicates(names, description, node) {
    const seen = new Set()
    for (const name of names) {
      must(!seen.has(name), `Duplicate ${description} ${name}`, node)
      seen.add(name)
    }
  }

  function analyzeInteractiveInput(input, description) {
    if (input.mode === "num" || input.mode === "keyboard") return input
    const picker = lookup(input.name, input)
    must(picker.kind === "Function", `${input.name} is not a ${description} input function`, input)
    must(
      picker.params.length === 0,
      `${description[0].toUpperCase()}${description.slice(1)} input function ${input.name} must not require arguments`,
      input
    )
    must(
      picker.returnType === core.stringType || picker.returnType === core.numberType,
      `${description[0].toUpperCase()}${description.slice(1)} input function ${input.name} must return string or number`,
      input
    )
    input.declaration = picker
    return input
  }

  function analyzeChoiceInput(input) {
    return analyzeInteractiveInput(input, "choice")
  }

  function analyzeDialogueInput(input) {
    return analyzeInteractiveInput(input, "dialogue")
  }

  function analyzeStatements(statements) {
    return statements.map(statement => analyzeStatement(statement))
  }

  function blockReturnsOnEveryPath(statements) {
    return statements.some(statementReturnsOnEveryPath)
  }

  function statementReturnsOnEveryPath(statement) {
    if (statement.kind === "ReturnStatement") return true
    if (statement.kind === "IfStatement") {
      return (
        statement.alternate &&
        blockReturnsOnEveryPath(statement.consequent) &&
        blockReturnsOnEveryPath(statement.alternate)
      )
    }
    return false
  }

  function analyzeStatement(statement) {
    return statementAnalyzers[statement.kind](statement)
  }

  function analyzeExpression(expression) {
    return expressionAnalyzers[expression.kind](expression)
  }

  const statementAnalyzers = {
    Program(p) {
      collectStateDeclarations(p.statements)
      p.statements = analyzeStatements(p.statements)
      p.defaultStateName =
        knownStateDeclarations.get("Start")?.name ??
        knownStateDeclarations.values().next().value?.name ??
        null
      return p
    },

    VariableDeclaration(d) {
      mustNotAlreadyBeDeclaredHere(d.name, d)
      d.initializer = analyzeExpression(d.initializer)
      const type = d.typeAnnotation
        ? resolveType(d.typeAnnotation)
        : d.initializer.type
      must(!isVoid(type), "Variables cannot have void type", d)
      mustBeAssignable(d.initializer, type, d)
      d.variable = declare(d.name, core.variable(d.name, type), d)
      d.type = type
      return d
    },

    Assignment(s) {
      const target = lookup(s.name, s)
      must(target.kind === "Variable", `Cannot assign to ${s.name}`, s)
      s.source = analyzeExpression(s.source)
      mustBeAssignable(s.source, target.type, s)
      s.target = target
      return s
    },

    PrintStatement(s) {
      s.argument = analyzeExpression(s.argument)
      must(!isVoid(s.argument.type), "Cannot print a void value", s)
      return s
    },

    IfStatement(s) {
      s.test = analyzeExpression(s.test)
      mustHaveType(s.test, core.booleanType, s.test)
      s.consequent = withChildContext({}, () => analyzeStatements(s.consequent))
      if (s.alternate) {
        s.alternate = withChildContext({}, () => analyzeStatements(s.alternate))
      }
      return s
    },

    WhileStatement(s) {
      s.test = analyzeExpression(s.test)
      mustHaveType(s.test, core.booleanType, s.test)
      s.body = withChildContext({ inLoop: true }, () => analyzeStatements(s.body))
      return s
    },

    BreakStatement(s) {
      must(context.inLoop, "Break can only appear inside a loop", s)
      return s
    },

    ReturnStatement(s) {
      must(context.function, "Return can only appear inside a function", s)
      const expectedType = context.function.returnType
      if (s.expression) {
        must(!isVoid(expectedType), "Cannot return a value from a void function", s)
        s.expression = analyzeExpression(s.expression)
        mustBeAssignable(s.expression, expectedType, s)
      } else {
        must(isVoid(expectedType), "Return statement must return a value", s)
      }
      return s
    },

    JumpStatement(s) {
      must(knownStateDeclarations.has(s.targetName), `State ${s.targetName} not declared`, s)
      return s
    },

    ChoiceStatement(s) {
      must(!context.function, "Choice cannot appear inside a function", s)
      s.input = analyzeChoiceInput(s.input)
      must(s.arms.length > 0, "Choice must have at least one option block", s)
      const armNames = s.arms.map(arm => arm.name)
      const optionNames = s.options.length > 0 ? s.options : armNames
      mustHaveNoDuplicates(armNames, "option block", s)
      mustHaveNoDuplicates(optionNames, "choice option", s)
      const options = new Set(optionNames)
      const arms = new Set(armNames)
      for (const name of armNames) {
        must(options.has(name), `Option block ${name} is not listed in the choice`, s)
      }
      for (const name of optionNames) {
        must(arms.has(name), `Choice option ${name} has no option block`, s)
      }
      s.optionNames = optionNames
      s.arms = s.arms.map(arm => ({
        ...arm,
        body: withChildContext({}, () => analyzeStatements(arm.body)),
      }))
      return s
    },

    FunctionDeclaration(d) {
      mustNotAlreadyBeDeclaredHere(d.name, d)
      const params = d.params.map(param => ({
        ...param,
        type: resolveType(param.typeAnnotation),
      }))
      const returnType = resolveType(d.returnType, { allowVoid: true })
      const fun = core.fun(
        d.name,
        params.map(param => core.variable(param.name, param.type)),
        returnType
      )
      declare(d.name, fun, d)
      d.fun = fun
      d.params = params.map((param, i) => ({ ...param, variable: fun.params[i] }))
      d.returnType = returnType
      d.body = withChildContext({ function: fun, inLoop: false }, () => {
        for (const param of d.params) {
          declare(param.name, param.variable, param)
        }
        return analyzeStatements(d.body)
      })
      must(
        isVoid(returnType) || blockReturnsOnEveryPath(d.body),
        `Function ${d.name} must return a value on every path`,
        d
      )
      fun.body = d.body
      return d
    },

    ObjectDeclaration(d) {
      must(!gameDefinitionNames.has(d.name), `Game definition ${d.name} already declared`, d)
      gameDefinitionNames.add(d.name)
      const symbol = core.object(d.name)
      declare(d.name, symbol, d)
      const fieldNames = new Set()
      d.fields = d.fields.map(field => {
        must(!fieldNames.has(field.name), `Field ${field.name} already declared`, field)
        fieldNames.add(field.name)
        field.type = resolveType(field.typeAnnotation)
        field.initializer = analyzeExpression(field.initializer)
        mustBeAssignable(field.initializer, field.type, field)
        return field
      })
      symbol.fields = d.fields
      d.object = symbol
      d.type = symbol.type
      return d
    },

    StateDeclaration(d) {
      must(!gameDefinitionNames.has(d.name), `Game definition ${d.name} already declared`, d)
      gameDefinitionNames.add(d.name)
      const symbol = core.state(d.name)
      declare(d.name, symbol, d)
      const fieldNames = new Set()
      for (const field of d.fields) {
        must(!fieldNames.has(field.name), `State field ${field.name} already declared`, field)
        fieldNames.add(field.name)
        if (field.name === "contains") {
          const containedNames = new Set()
          field.objects = field.value.map(id => {
            must(!containedNames.has(id.name), `Object ${id.name} appears more than once`, field)
            containedNames.add(id.name)
            const object = lookup(id.name, id)
            must(object.kind === "Object", `${id.name} is not an object`, id)
            return object
          })
        } else if (field.name === "dialogue") {
          field.input = analyzeDialogueInput(field.input)
          must(field.lines.length > 0, "Dialogue must include at least one line", field)
        }
      }
      for (const requiredField of ["title", "description", "contains"]) {
        must(fieldNames.has(requiredField), `State ${d.name} is missing ${requiredField}`, d)
      }
      d.state = symbol
      symbol.fields = d.fields
      d.type = symbol.type
      return d
    },

    ExpressionStatement(s) {
      s.expression = analyzeExpression(s.expression)
      return s
    },
  }

  const expressionAnalyzers = {
    NumberLiteral(e) {
      return e
    },

    StringLiteral(e) {
      return e
    },

    BooleanLiteral(e) {
      return e
    },

    IdentifierExpression(e) {
      e.declaration = lookup(e.name, e)
      e.type = e.declaration.type
      return e
    },

    CallExpression(e) {
      e.callee = analyzeExpression(e.callee)
      must(e.callee.type?.kind === "FunctionType", "Call of non-function", e)
      const parameterTypes = e.callee.type.paramTypes
      must(
        e.args.length === parameterTypes.length,
        `${parameterTypes.length} argument(s) required but ${e.args.length} passed`,
        e
      )
      e.args = e.args.map((arg, i) => {
        const analyzedArg = analyzeExpression(arg)
        mustBeAssignable(analyzedArg, parameterTypes[i], arg)
        return analyzedArg
      })
      e.type = e.callee.type.returnType
      return e
    },

    UnaryExpression(e) {
      e.operand = analyzeExpression(e.operand)
      if (e.op === "-") {
        mustHaveType(e.operand, core.numberType, e)
        e.type = core.numberType
      } else {
        mustHaveType(e.operand, core.booleanType, e)
        e.type = core.booleanType
      }
      return e
    },

    BinaryExpression(e) {
      e.left = analyzeExpression(e.left)
      e.right = analyzeExpression(e.right)
      if (e.op === "and" || e.op === "or") {
        mustHaveType(e.left, core.booleanType, e.left)
        mustHaveType(e.right, core.booleanType, e.right)
        e.type = core.booleanType
      } else if (e.op === "==" || e.op === "!=") {
        mustHaveSameType(e.left, e.right, e)
        e.type = core.booleanType
      } else if (["<", "<=", ">", ">="].includes(e.op)) {
        const comparable =
          (isNumber(e.left) && isNumber(e.right)) ||
          (isString(e.left) && isString(e.right))
        must(comparable, "Expected two numbers or two strings", e)
        e.type = core.booleanType
      } else if (e.op === "+") {
        const addable =
          (isNumber(e.left) && isNumber(e.right)) ||
          (isString(e.left) && isString(e.right))
        must(addable, "Expected two numbers or two strings", e)
        e.type = e.left.type
      } else {
        mustHaveType(e.left, core.numberType, e.left)
        mustHaveType(e.right, core.numberType, e.right)
        e.type = core.numberType
      }
      return e
    },
  }

  return statementAnalyzers.Program(program)
}
