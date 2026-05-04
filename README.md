# WebRogue

<img src="docs/logo.svg" width="180" height="180" alt="WebRogue torchlit doorway logo">

WebRogue is a small statically checked language for scripting browser roguelike games. It lets a game author describe dungeon entities and rooms beside ordinary turn logic, then compiles that script to readable JavaScript. The language is intentionally compact: enough static structure to be interesting for a compiler course, but not so large that the compiler hides the important ideas.

## Why WebRogue Exists

Browser games often start as loose JavaScript objects and event handlers. WebRogue asks what that workflow might look like if the game script had a compiler watching for common mistakes first: misspelled entity names, bad health types, broken return values, impossible room contents, and control-flow errors. The result is a toy language with a real compile-time safety story.

## Features

- Primitive types: `number`, `string`, `boolean`, and `void`
- `let` declarations with optional type inference from initializers
- Assignment, `print`, `if` / `else`, `while`, `break`, and `return`
- Functions with typed parameters and typed return types
- Function calls and expression statements
- Entity declarations for game objects
- Room declarations with `title`, `description`, and `contains`
- Arithmetic, comparison, equality, boolean, and unary expressions
- Line comments beginning with `//`
- JavaScript generation for runnable scripts and plain JS game objects

## Static Checks

The analyzer performs these checks before optimization or code generation:

- Identifiers must be declared before use.
- Duplicate declarations are rejected in the same lexical scope.
- Variables cannot have type `void`.
- Initializers and assignments must match the declared or inferred variable type.
- `if` and `while` tests must be boolean.
- `break` can appear only inside a loop.
- `return` can appear only inside a function.
- Return values must match the function return type.
- Non-void functions must return a value on every straightforward static path.
- Function calls must use the correct number and types of arguments.
- Calls to non-functions are rejected.
- Entity and room names must be unique in the active scope.
- Entity fields must be unique and their initializers must match field types.
- Rooms must include `title`, `description`, and `contains`.
- Room `contains` entries must reference declared entities and cannot repeat an entity.

## Not Implemented

WebRogue is not a game engine. It does not implement general arrays, object literals, field access, imports, browser DOM helpers, sprites, maps, or runtime movement APIs. The only list syntax is the checked `contains: [EntityName, ...]` room field. Function declarations are checked in declaration order, so calls must refer to functions declared earlier in the reachable lexical scope.

The return-path checker is intentionally modest. It handles direct `return` statements and `if` / `else` statements whose branches both return. It does not try to prove that a `while true` loop always returns.

## Examples

### Hello

```wr
print "Welcome to WebRogue!";

let heroName: string = "Mira";
let hp: number = 12;
let alive: boolean = true;

if alive {
  print heroName;
  print "enters the dungeon.";
}
```

### Combat

```wr
entity Player {
  name: string = "Mira";
  hp: number = 12;
  attack: number = 4;
}

entity Slime {
  name: string = "Slime";
  hp: number = 6;
  attack: number = 2;
}

function damage(base: number, bonus: number) -> number {
  return base + bonus;
}

let hit: number = damage(4, 2);

if hit > 5 {
  print "Critical hit!";
} else {
  print "Normal hit.";
}
```

### Generated JavaScript

```js
const Player = {
  name: "Mira",
  hp: 12,
  attack: 4,
};

const Slime = {
  name: "Slime",
  hp: 6,
  attack: 2,
};

function damage(base, bonus) {
  return (base + bonus);
}

let hit = damage(4, 2);

if ((hit > 5)) {
  console.log("Critical hit!");
} else {
  console.log("Normal hit.");
}
```

More complete examples live in `examples/`:

- `examples/hello.wr`
- `examples/combat.wr`
- `examples/rooms.wr`
- `examples/loop.wr`
- `examples/functions.wr`
- `examples/tiny-dungeon.wr`
- `examples/errors/bad-type.wr` is intentionally invalid and should fail analysis.

## Install And Test

Use Node.js 20 or newer.

```sh
npm install
npm test
```

`npm test` runs the Node test runner through `c8`, so the test output includes coverage reporting.

## Run The Compiler

```sh
node src/webrogue.js <filename> <outputType>
```

`outputType` may be omitted. The default is `js`.

```sh
node src/webrogue.js examples/hello.wr parsed
node src/webrogue.js examples/combat.wr analyzed
node src/webrogue.js examples/loop.wr optimized
node src/webrogue.js examples/rooms.wr js
```

You can also use the npm script:

```sh
npm run compile -- examples/functions.wr js
```

## Compiler Pipeline

- `parsed`: parses source with the Ohm grammar and prints the AST-like representation.
- `analyzed`: resolves names, checks types and context rules, and annotates the representation.
- `optimized`: applies conservative AST optimizations such as constant folding and dead-code removal.
- `js`: emits readable JavaScript.

The implementation follows the course's Carlos-style flow:

```text
parse -> analyze -> optimize -> generate
```

## Project Structure

```text
.
├── docs/
├── examples/
├── src/
│   ├── webrogue.js
│   ├── webrogue.ohm
│   ├── compiler.js
│   ├── parser.js
│   ├── core.js
│   ├── analyzer.js
│   ├── optimizer.js
│   └── generator.js
├── test/
│   ├── compiler.test.js
│   ├── parser.test.js
│   ├── analyzer.test.js
│   ├── optimizer.test.js
│   └── generator.test.js
├── HANDOFF.md
├── package.json
└── README.md
```

The companion site source is in `docs/index.html`, with `docs/logo.svg` as the project logo.

## Handoff

See `HANDOFF.md` for a concise implementation summary, known limitations, and a professor-facing project description.

Solo project: Jacob Martinez.
