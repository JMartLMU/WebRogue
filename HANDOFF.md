# WebRogue Handoff

## What Changed

- Standardized project metadata in `package.json` and refreshed `package-lock.json`.
- Added `.prettierrc.json`.
- Repaired and tightened `src/analyzer.js`, `src/optimizer.js`, `src/generator.js`, and `src/webrogue.js`.
- Preserved the existing parser, grammar, core model, compiler pipeline, and most AST shapes.
- Added `test/optimizer.test.js` and expanded parser, analyzer, generator, and compiler tests.
- Replaced `examples/hello.wr` with the requested hello example.
- Added `examples/combat.wr`, `examples/rooms.wr`, `examples/loop.wr`, `examples/functions.wr`, and `examples/errors/bad-type.wr`.
- Added `docs/index.html`, `docs/styles.css`, and `docs/logo.svg`.
- Rewrote `README.md` to match the implemented language and compiler.

## Working Compiler Phases

- Parse: `src/parser.js` uses `src/webrogue.ohm` to build the core AST-like representation.
- Analyze: `src/analyzer.js` resolves declarations, scopes, types, functions, entities, and rooms.
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
- Entity declarations with typed fields.
- Room declarations with `title`, `description`, and `contains`.
- Arithmetic, comparison, equality, boolean, unary negation, and `not`.
- Line comments.

## Implemented Static Checks

- Declaration before use.
- Duplicate declaration rejection in the same lexical scope.
- Static scoping and shadowing in nested scopes.
- Type checking for declarations, assignments, expressions, returns, and calls.
- Boolean-only conditions for `if` and `while`.
- `break` only inside loops.
- `return` only inside functions.
- Function arity and argument type checking.
- Calls to non-functions are rejected.
- Non-void functions must return on every straightforward static path.
- Entity and room name consistency.
- Duplicate entity fields and duplicate room fields are rejected.
- Room declarations must include `title`, `description`, and `contains`.
- Room `contains` entries must refer to declared entities and cannot repeat an entity.

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
- `examples/rooms.wr`
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

Current status: 112 tests pass with 100% statement, branch, function, and line coverage across `src/`.

## Known Limitations

- No general arrays. The only bracketed list syntax is room `contains`.
- No field access, object literals, imports, or modules.
- No browser runtime or game engine runtime is emitted.
- Function and game declarations must be declared before use.
- Return-path analysis is intentionally simple and does not prove loop termination.
- Expressions can call functions, so optimizer rewrites avoid removing side-effecting calls in the most obvious algebraic cases.

## Recommended Next Tasks

- Add field access, such as `Player.hp`, if the language needs richer game logic.
- Add a tiny browser runtime only after the compiler language is stable.
- Add GitHub Pages deployment for `docs/`.
- Add a short presentation deck in `docs/` if the final talk needs slides.
- Consider explicit purity rules if more aggressive optimization is desired.

## Removed Or Replaced

- The old README was replaced because it no longer described the stricter analyzer, expanded tests, examples, or package metadata.
- The old `examples/hello.wr` was replaced with the requested introductory example.
- The generated JavaScript format was changed from auto-suffixed names and frozen metadata wrappers to source-like names and plain objects, which better matches the project brief.
- No compiler phase was thrown away wholesale. The existing architecture was repaired and extended in place.

## Professor-Facing Summary

WebRogue is a small statically checked DSL for browser roguelike scripting. It gives authors a compact way to declare game entities and rooms while also writing ordinary turn logic with variables, functions, loops, conditionals, and print statements. The language compiles to readable JavaScript objects and control flow, so its output is easy to inspect.

The compiler follows the Carlos-style architecture used in the course: an Ohm grammar parses source into a core representation, the analyzer resolves names and checks static semantics, the optimizer performs safe AST rewrites, and the generator emits JavaScript. The command-line interface exposes each stage as `parsed`, `analyzed`, `optimized`, or `js`.

The static analysis is non-trivial because WebRogue combines ordinary typed programming checks with game-specific consistency checks. It enforces lexical scoping, declaration-before-use, duplicate declaration rules, assignment and expression typing, function arity and return typing, contextual validity of `break` and `return`, required room fields, unique entity and room definitions, and validation that room contents refer to declared entities.
