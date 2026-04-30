export const numberType = "number"
export const stringType = "string"
export const booleanType = "boolean"
export const voidType = "void"

export const primitiveTypes = new Set([
  numberType,
  stringType,
  booleanType,
  voidType,
])

export function program(statements, at) {
  return { kind: "Program", statements, at }
}

export function typeName(name, at) {
  return { kind: "TypeName", name, at }
}

export function functionType(paramTypes, returnType) {
  return { kind: "FunctionType", paramTypes, returnType }
}

export function entityType(name) {
  return { kind: "EntityType", name }
}

export function roomType(name) {
  return { kind: "RoomType", name }
}

export function variable(name, type) {
  return { kind: "Variable", name, type }
}

export function fun(name, params = [], returnType = voidType, body = []) {
  return {
    kind: "Function",
    name,
    params,
    returnType,
    body,
    type: functionType(
      params.map(p => p.type),
      returnType
    ),
  }
}

export function entity(name, type = entityType(name), fields = []) {
  return { kind: "Entity", name, type, fields }
}

export function room(name, type = roomType(name), fields = []) {
  return { kind: "Room", name, type, fields }
}

export function variableDeclaration(name, typeAnnotation, initializer, at) {
  return { kind: "VariableDeclaration", name, typeAnnotation, initializer, at }
}

export function assignment(name, source, at) {
  return { kind: "Assignment", name, source, at }
}

export function printStatement(argument, at) {
  return { kind: "PrintStatement", argument, at }
}

export function ifStatement(test, consequent, alternate, at) {
  return { kind: "IfStatement", test, consequent, alternate, at }
}

export function whileStatement(test, body, at) {
  return { kind: "WhileStatement", test, body, at }
}

export function breakStatement(at) {
  return { kind: "BreakStatement", at }
}

export function returnStatement(expression, at) {
  return { kind: "ReturnStatement", expression, at }
}

export function functionDeclaration(name, params, returnType, body, at) {
  return { kind: "FunctionDeclaration", name, params, returnType, body, at }
}

export function parameter(name, typeAnnotation, at) {
  return { kind: "Parameter", name, typeAnnotation, at }
}

export function entityDeclaration(name, fields, at) {
  return { kind: "EntityDeclaration", name, fields, at }
}

export function entityField(name, typeAnnotation, initializer, at) {
  return { kind: "EntityField", name, typeAnnotation, initializer, at }
}

export function roomDeclaration(name, fields, at) {
  return { kind: "RoomDeclaration", name, fields, at }
}

export function roomField(name, value, at) {
  return { kind: "RoomField", name, value, at }
}

export function expressionStatement(expression, at) {
  return { kind: "ExpressionStatement", expression, at }
}

export function identifier(name, at) {
  return { kind: "IdentifierExpression", name, at }
}

export function call(callee, args, at) {
  return { kind: "CallExpression", callee, args, at }
}

export function binary(op, left, right, at) {
  return { kind: "BinaryExpression", op, left, right, at }
}

export function unary(op, operand, at) {
  return { kind: "UnaryExpression", op, operand, at }
}

export function numberLiteral(value, at) {
  return { kind: "NumberLiteral", value, type: numberType, at }
}

export function stringLiteral(value, at) {
  return { kind: "StringLiteral", value, type: stringType, at }
}

export function booleanLiteral(value, at) {
  return { kind: "BooleanLiteral", value, type: booleanType, at }
}

export function equivalent(t1, t2) {
  if (t1 === t2) return true
  if (t1?.kind !== t2?.kind) return false
  if (t1?.kind === "FunctionType") {
    return (
      t1.paramTypes.length === t2.paramTypes.length &&
      t1.paramTypes.every((type, i) => equivalent(type, t2.paramTypes[i])) &&
      equivalent(t1.returnType, t2.returnType)
    )
  }
  if (t1?.kind === "EntityType" || t1?.kind === "RoomType") {
    return t1.name === t2.name
  }
  return false
}

export function typeDescription(type) {
  if (typeof type === "string") return type
  if (type?.kind === "FunctionType") {
    const params = type.paramTypes.map(typeDescription).join(", ")
    return `(${params}) -> ${typeDescription(type.returnType)}`
  }
  if (type?.kind === "EntityType") return `entity ${type.name}`
  if (type?.kind === "RoomType") return `room ${type.name}`
  return String(type)
}
