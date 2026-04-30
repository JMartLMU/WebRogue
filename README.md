# WebRogue

<img width="256" height="256" alt="WebRogue" src="https://github.com/user-attachments/assets/b9509762-0420-4896-b52a-5e9ea39d46c0" />

WebRogue is a small statically checked language for scripting browser-based roguelike games. It gives game authors compact declarations for entities and rooms, plus enough ordinary programming features to write turn logic without dropping directly into JavaScript.

## Features

- Primitive types: `number`, `string`, `boolean`, and `void` for function returns
- `let` declarations with optional type annotations
- Assignment, `print`, `if`, `while`, `break`, and `return`
- Functions with typed parameters and optional return types
- Entity declarations for game objects
- Room declarations with `title`, `description`, and `contains`
- Arithmetic, comparison, equality, boolean operators, unary negation, and `not`
- Function calls and expression statements
- Arrays are not implemented yet, except the room `contains: [EntityName]` list syntax

## Static Checks

- Identifiers must be declared before use
- Duplicate declarations are rejected in the same scope
- Assignments and initializers must match declared types
- `if` and `while` conditions must be boolean
- Return statements must match the enclosing function return type
- Function calls must use the correct number and types of arguments
- `break` can only appear inside loops
- Entity and room names must be unique
- Room `contains` entries must refer to declared entities

## Example

```wr
entity Hero {
  name: string = "Ada";
  hp: number = 10;
  alive: boolean = true;
}

room Start {
  title: "Start";
  description: "A stone room with one cautious lantern.";
  contains: [Hero];
}

function greet(name: string) -> string {
  return "Hello, " + name;
}

let turns: number = 0;
print greet("delver");
while turns < 2 {
  print turns;
  turns = turns + 1;
}
```

Compiles to JavaScript similar to:

```js
const Hero_1 = Object.freeze({
  type: "entity",
  name: "Hero",
  fields: Object.freeze({
    name: "Ada",
    hp: 10,
    alive: true,
  }),
});
```

## Commands

```sh
npm install
npm test
npm run compile -- examples/hello.wr
npm run compile -- examples/tiny-dungeon.wr js
npm run compile -- examples/hello.wr analyzed
```

## Project Layout

- `src/webrogue.ohm` defines the grammar
- `src/parser.js` parses source to an AST
- `src/analyzer.js` performs semantic analysis and annotates the AST
- `src/optimizer.js` performs small AST optimizations
- `src/generator.js` emits JavaScript
- `src/compiler.js` connects parse, analyze, optimize, and generate
- `src/webrogue.js` is the command-line entry point

Solo project: Jacob Martinez.
