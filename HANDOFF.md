# WebRogue Handoff

## What Changed

- Migrated the language vocabulary from `entity` / `room` to `object` / `state`.
- Added `_jump(StateName);` as a built-in checked state transition statement.
- Updated `src/webrogue.ohm`, `src/parser.js`, `src/core.js`, `src/analyzer.js`, `src/optimizer.js`, and `src/generator.js`.
- Updated parser, analyzer, generator, compiler, and optimizer tests.
- Replaced `examples/rooms.wr` with `examples/states.wr`.
- Updated `examples/combat.wr` and `examples/tiny-dungeon.wr` for the new object/state design.
- Updated `README.md` and the `docs/` companion page to match the implemented language.

## Working Compiler Phases

- Parse: `src/parser.js` uses `src/webrogue.ohm` to build the core AST-like representation.
- Analyze: `src/analyzer.js` resolves declarations, scopes, types, functions, objects, states, and jumps.
- Optimize: `src/optimizer.js` rewrites the analyzed representation.
- Generate: `src/generator.js` emits readable JavaScript.
- Compile: `src/compiler.js` connects the four phases.
- CLI: `src/webrogue.js` supports `parsed`, `analyzed`, `optimized`, and `js`.

## Implemented Language Features

- Primitive types: `number`, `string`, `boolean`, and `void`.
- `let` declarations with optional annotations.
- Assignment, print, if/else, while, break, return, and expression statements.
- Functions with typed parameters and returns.
- Function calls.
- `object` declarations with typed fields.
- `state` declarations with `title`, `description`, and `contains`.
- `_jump(StateName);` transitions between states.
- Arithmetic, comparison, equality, boolean, unary negation, and `not`.
- Line comments.

## Implemented Static Checks

- Declaration before use for ordinary identifiers.
- Duplicate declaration rejection in the same lexical scope.
- Static scoping and shadowing in nested scopes.
- Type checking for declarations, assignments, expressions, returns, and calls.
- Boolean-only conditions for `if` and `while`.
- `break` only inside loops.
- `return` only inside functions.
- Function arity and argument type checking.
- Calls to non-functions are rejected.
- Non-void functions must return on every straightforward static path.
- Object and state name consistency.
- Duplicate object fields and duplicate state fields are rejected.
- State declarations must include `title`, `description`, and `contains`.
- State `contains` entries must refer to declared objects and cannot repeat an object.
- `_jump` targets must be declared states. Forward jumps to later state declarations are allowed.

## Implemented Optimizations

- Constant folding for numeric, string, boolean, relational, equality, and unary expressions.
- Algebraic simplification for `+ 0`, `0 +`, `- 0`, `* 1`, `1 *`, and pure `* 0`.
- Boolean simplification for static `and` / `or` cases.
- Dead branch elimination for `if true`, `if false`, and `while false`.
- Removal of unreachable statements after `return` or `break` inside the same block.
- Removal of unreachable statements after an `if` whose two branches both terminate.

## Examples Expected To Pass

- `examples/hello.wr`
- `examples/combat.wr`
- `examples/states.wr`
- `examples/loop.wr`
- `examples/functions.wr`
- `examples/tiny-dungeon.wr`

`examples/errors/bad-type.wr` is expected to parse but fail analysis with a type error.

## Tests

The test suite is organized by compiler phase:

- `test/parser.test.js`
- `test/analyzer.test.js`
- `test/optimizer.test.js`
- `test/generator.test.js`
- `test/compiler.test.js`

Run everything with coverage:

```sh
npm test
```

Current status after the object/state migration: 118 tests pass with 100% statement, branch, function, and line coverage across `src/`.

## Known Limitations

- No general arrays. The only bracketed list syntax is state `contains`.
- No field access, object literals, imports, or modules.
- No browser runtime or game engine runtime is emitted.
- Object references and normal function calls must be declared before use.
- `_jump` can target states declared later, but it only updates a generated current-state name.
- State execution is intentionally lightweight; there is no full Ren'Py-style interpreter loop.
- Return-path analysis is intentionally simple and does not prove loop termination.
- Expressions can call functions, so optimizer rewrites avoid removing side-effecting calls in the most obvious algebraic cases.

## Recommended Next Tasks

- Decide whether states should hold executable blocks in addition to metadata fields.
- Add field access, such as `Player.hp`, if the language needs richer game logic.
- Add a tiny browser runtime only after the compiler language is stable.
- Add GitHub Pages deployment for `docs/`.
- Add a short presentation deck in `docs/` if the final talk needs slides.
- Consider explicit purity rules if more aggressive optimization is desired.

## Removed Or Replaced

- `entity` syntax was replaced with `object` syntax.
- `room` syntax was replaced with `state` syntax.
- `examples/rooms.wr` was replaced by `examples/states.wr`.
- The generated JavaScript now includes a tiny `_jump` helper and `__webrogueCurrentState` when states are present.
- No compiler phase was thrown away wholesale. The existing architecture was migrated and extended in place.

## Professor-Facing Summary

WebRogue is a small statically checked DSL for browser roguelike scripting. It gives authors a compact way to declare game objects and state pages while also writing ordinary turn logic with variables, functions, loops, conditionals, and print statements. The language compiles to readable JavaScript objects and control flow, with a small generated state-transition helper inspired by Ren'Py's jump model.

The compiler follows the Carlos-style architecture used in the course: an Ohm grammar parses source into a core representation, the analyzer resolves names and checks static semantics, the optimizer performs safe AST rewrites, and the generator emits JavaScript. The command-line interface exposes each stage as `parsed`, `analyzed`, `optimized`, or `js`.

The static analysis is non-trivial because WebRogue combines ordinary typed programming checks with game-specific consistency checks. It enforces lexical scoping, declaration-before-use, duplicate declaration rules, assignment and expression typing, function arity and return typing, contextual validity of `break` and `return`, required state fields, unique object and state definitions, validation that state contents refer to declared objects, and validation that `_jump` targets are real states.
