import * as core from "./core.js"

export default function optimize(node) {
  if (Array.isArray(node)) return node.flatMap(optimize)
  return optimizers[node?.kind]?.(node) ?? node
}

function literalValue(node) {
  if (
    node?.kind === "NumberLiteral" ||
    node?.kind === "StringLiteral" ||
    node?.kind === "BooleanLiteral"
  ) {
    return node.value
  }
}

function literalFrom(value, at) {
  if (typeof value === "number") return core.numberLiteral(value, at)
  if (typeof value === "string") return core.stringLiteral(value, at)
  if (typeof value === "boolean") return core.booleanLiteral(value, at)
  return value
}

const optimizers = {
  Program(p) {
    p.statements = optimize(p.statements)
    return p
  },

  VariableDeclaration(d) {
    d.initializer = optimize(d.initializer)
    return d
  },

  Assignment(s) {
    s.source = optimize(s.source)
    return s
  },

  PrintStatement(s) {
    s.argument = optimize(s.argument)
    return s
  },

  IfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = optimize(s.consequent)
    s.alternate = s.alternate ? optimize(s.alternate) : null
    if (s.test.kind === "BooleanLiteral") return s.test.value ? s.consequent : s.alternate ?? []
    return s
  },

  WhileStatement(s) {
    s.test = optimize(s.test)
    if (s.test.kind === "BooleanLiteral" && !s.test.value) return []
    s.body = optimize(s.body)
    return s
  },

  ReturnStatement(s) {
    if (s.expression) s.expression = optimize(s.expression)
    return s
  },

  FunctionDeclaration(d) {
    d.body = optimize(d.body)
    if (d.fun) d.fun.body = d.body
    return d
  },

  EntityDeclaration(d) {
    d.fields = d.fields.map(optimize)
    if (d.entity) d.entity.fields = d.fields
    return d
  },

  EntityField(f) {
    f.initializer = optimize(f.initializer)
    return f
  },

  RoomDeclaration(d) {
    return d
  },

  ExpressionStatement(s) {
    s.expression = optimize(s.expression)
    return s
  },

  CallExpression(e) {
    e.callee = optimize(e.callee)
    e.args = e.args.map(optimize)
    return e
  },

  UnaryExpression(e) {
    e.operand = optimize(e.operand)
    const operand = literalValue(e.operand)
    if (operand !== undefined) {
      if (e.op === "-") return core.numberLiteral(-operand, e.at)
      if (e.op === "not") return core.booleanLiteral(!operand, e.at)
    }
    return e
  },

  BinaryExpression(e) {
    e.left = optimize(e.left)
    e.right = optimize(e.right)
    const [left, right] = [literalValue(e.left), literalValue(e.right)]
    if (left !== undefined && right !== undefined) {
      const folded = {
        "+": () => left + right,
        "-": () => left - right,
        "*": () => left * right,
        "/": () => left / right,
        "%": () => left % right,
        "<": () => left < right,
        "<=": () => left <= right,
        ">": () => left > right,
        ">=": () => left >= right,
        "==": () => left === right,
        "!=": () => left !== right,
        and: () => left && right,
        or: () => left || right,
      }[e.op]?.()
      if (folded !== undefined) return literalFrom(folded, e.at)
    }
    if (e.op === "or") {
      if (left === false) return e.right
      if (right === false) return e.left
    }
    if (e.op === "and") {
      if (left === true) return e.right
      if (right === true) return e.left
    }
    if (e.op === "+" && right === 0) return e.left
    if (e.op === "+" && left === 0) return e.right
    if (e.op === "-" && right === 0) return e.left
    if (e.op === "*" && right === 1) return e.left
    if (e.op === "*" && left === 1) return e.right
    return e
  },
}
