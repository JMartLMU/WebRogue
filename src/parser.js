import * as fs from "node:fs"
import * as ohm from "ohm-js"
import * as core from "./core.js"

const grammar = ohm.grammar(
  fs.readFileSync(new URL("./webrogue.ohm", import.meta.url), "utf8")
)

function location(node) {
  return node.source.getLineAndColumnMessage()
}

function optional(node, fallback = null) {
  return node.children.length === 0 ? fallback : node.children[0].ast()
}

function optionalList(node) {
  return optional(node, [])
}

const astBuilder = grammar.createSemantics().addOperation("ast", {
  Program(statements) {
    return core.program(
      statements.children.map(statement => statement.ast()),
      location(this)
    )
  },

  Stmt(statement) {
    return statement.ast()
  },

  VarDecl(_let, id, typeAnnotation, _eq, exp, _semicolon) {
    return core.variableDeclaration(
      id.sourceString,
      optional(typeAnnotation),
      exp.ast(),
      location(this)
    )
  },

  TypeAnnotation(_colon, type) {
    return type.ast()
  },

  Assignment(id, _eq, exp, _semicolon) {
    return core.assignment(id.sourceString, exp.ast(), location(this))
  },

  PrintStmt(_print, exp, _semicolon) {
    return core.printStatement(exp.ast(), location(this))
  },

  IfStmt(_if, exp, block, elsePart) {
    return core.ifStatement(exp.ast(), block.ast(), optional(elsePart), location(this))
  },

  ElsePart(_else, block) {
    return block.ast()
  },

  WhileStmt(_while, exp, block) {
    return core.whileStatement(exp.ast(), block.ast(), location(this))
  },

  BreakStmt(_break, _semicolon) {
    return core.breakStatement(location(this))
  },

  ReturnStmt(_return, exp, _semicolon) {
    return core.returnStatement(optional(exp), location(this))
  },

  JumpStmt(_jump, _open, id, _close, _semicolon) {
    return core.jumpStatement(id.sourceString, location(this))
  },

  ChoiceStmt(_choice, _open, input, options, _close, _blockOpen, arms, _blockClose) {
    return core.choiceStatement(
      input.ast(),
      optional(options, []),
      arms.children.map(arm => arm.ast()),
      location(this)
    )
  },

  ChoiceInput_keyboard(_keyboard, _dot, key) {
    return core.choiceInput("keyboard", `keyboard.${key.sourceString}`, key.sourceString, location(this))
  },

  ChoiceInput_id(id) {
    const name = id.sourceString
    return core.choiceInput(name === "num" ? "num" : "custom", name, null, location(this))
  },

  ChoiceOptions(_comma, ids) {
    return ids.ast().map(id => id.name)
  },

  ChoiceArm_block(_option, id, block) {
    return core.choiceArm(id.sourceString, block.ast(), location(this))
  },

  ChoiceArm_colon(_option, id, _colon, block) {
    return core.choiceArm(id.sourceString, block.ast(), location(this))
  },

  ExpStmt(exp, _semicolon) {
    return core.expressionStatement(exp.ast(), location(this))
  },

  FunctionDecl(_function, id, _open, params, _close, returnType, block) {
    return core.functionDeclaration(
      id.sourceString,
      optionalList(params),
      optional(returnType, core.typeName(core.voidType, location(this))),
      block.ast(),
      location(this)
    )
  },

  Params(params) {
    return params.asIteration().children.map(param => param.ast())
  },

  Param(id, _colon, type) {
    return core.parameter(id.sourceString, type.ast(), location(this))
  },

  ReturnType(_arrow, type) {
    return type.ast()
  },

  ObjectDecl(_object, id, _open, fields, _close) {
    return core.objectDeclaration(
      id.sourceString,
      fields.children.map(field => field.ast()),
      location(this)
    )
  },

  ObjectField(id, _colon, type, _eq, exp, _semicolon) {
    return core.objectField(id.sourceString, type.ast(), exp.ast(), location(this))
  },

  StateDecl(_state, id, _open, fields, _close) {
    return core.stateDeclaration(
      id.sourceString,
      fields.children.map(field => field.ast()),
      location(this)
    )
  },

  StateField_title(_title, _colon, string, _semicolon) {
    return core.stateField("title", string.ast().value, location(this))
  },

  StateField_description(_description, _colon, string, _semicolon) {
    return core.stateField("description", string.ast().value, location(this))
  },

  StateField_contains(_contains, _colon, _open, ids, _close, _semicolon) {
    return core.stateField("contains", optionalList(ids), location(this))
  },

  StateField_dialogue(dialogueField) {
    return dialogueField.ast()
  },

  DialogueField(_dialogue, _open, input, _comma, strings, _close, _semicolon) {
    const [prompt, ...lines] = strings.ast()
    return core.dialogueField(input.ast(), prompt, lines, location(this))
  },

  DialogueStrings(strings) {
    return strings.asIteration().children.map(string => string.ast().value)
  },

  IdList(ids) {
    return ids.asIteration().children.map(id => ({
      name: id.sourceString,
      at: location(id),
    }))
  },

  Block(_open, statements, _close) {
    return statements.children.map(statement => statement.ast())
  },

  Type_number(_) {
    return core.typeName(core.numberType, location(this))
  },

  Type_string(_) {
    return core.typeName(core.stringType, location(this))
  },

  Type_boolean(_) {
    return core.typeName(core.booleanType, location(this))
  },

  Type_void(_) {
    return core.typeName(core.voidType, location(this))
  },

  Type_id(id) {
    return core.typeName(id.sourceString, location(this))
  },

  Exp(exp) {
    return exp.ast()
  },

  OrExp_or(left, _op, right) {
    return core.binary("or", left.ast(), right.ast(), location(this))
  },

  AndExp_and(left, _op, right) {
    return core.binary("and", left.ast(), right.ast(), location(this))
  },

  EqualityExp_eq(left, _op, right) {
    return core.binary("==", left.ast(), right.ast(), location(this))
  },

  EqualityExp_ne(left, _op, right) {
    return core.binary("!=", left.ast(), right.ast(), location(this))
  },

  RelExp_le(left, _op, right) {
    return core.binary("<=", left.ast(), right.ast(), location(this))
  },

  RelExp_lt(left, _op, right) {
    return core.binary("<", left.ast(), right.ast(), location(this))
  },

  RelExp_ge(left, _op, right) {
    return core.binary(">=", left.ast(), right.ast(), location(this))
  },

  RelExp_gt(left, _op, right) {
    return core.binary(">", left.ast(), right.ast(), location(this))
  },

  AddExp_plus(left, _op, right) {
    return core.binary("+", left.ast(), right.ast(), location(this))
  },

  AddExp_minus(left, _op, right) {
    return core.binary("-", left.ast(), right.ast(), location(this))
  },

  MulExp_times(left, _op, right) {
    return core.binary("*", left.ast(), right.ast(), location(this))
  },

  MulExp_divide(left, _op, right) {
    return core.binary("/", left.ast(), right.ast(), location(this))
  },

  MulExp_mod(left, _op, right) {
    return core.binary("%", left.ast(), right.ast(), location(this))
  },

  UnaryExp_neg(_op, operand) {
    return core.unary("-", operand.ast(), location(this))
  },

  UnaryExp_not(_op, operand) {
    return core.unary("not", operand.ast(), location(this))
  },

  CallExp_call(callee, _open, args, _close) {
    return core.call(callee.ast(), optionalList(args), location(this))
  },

  Args(args) {
    return args.asIteration().children.map(arg => arg.ast())
  },

  Primary_number(number) {
    return number.ast()
  },

  Primary_string(string) {
    return string.ast()
  },

  Primary_true(_) {
    return core.booleanLiteral(true, location(this))
  },

  Primary_false(_) {
    return core.booleanLiteral(false, location(this))
  },

  Primary_id(id) {
    return core.identifier(id.sourceString, location(this))
  },

  Primary_parens(_open, exp, _close) {
    return exp.ast()
  },

  number(_digits, _dot, _fraction) {
    return core.numberLiteral(Number(this.sourceString), location(this))
  },

  string(_open, _chars, _close) {
    return core.stringLiteral(JSON.parse(this.sourceString), location(this))
  },
})

export { grammar }

export default function parse(sourceCode) {
  const match = grammar.match(sourceCode)
  if (!match.succeeded()) throw new Error(match.message)
  return astBuilder(match).ast()
}
