import * as fs from "node:fs/promises"
import * as path from "node:path"

const srcDir = "src"
const docsDir = "docs"
const filesToCopy = ["core.js", "compiler.js", "optimizer.js", "analyzer.js"]
const filesToTransform = ["parser.js", "generator.js"]
const filesToCopyAsIs = ["webrogue.ohm"]

// Ensure docs directory exists
await fs.mkdir(docsDir, { recursive: true })

// Copy files without transformation
for (const file of [...filesToCopy, ...filesToCopyAsIs]) {
  const srcPath = path.join(srcDir, file)
  const destPath = path.join(docsDir, file)
  await fs.copyFile(srcPath, destPath)
  console.log(`Copied ${file}`)
}

// Transform parser.js: Change ohm-js import to CDN
let parserContent = await fs.readFile(path.join(srcDir, "parser.js"), "utf8")
parserContent = parserContent.replace(
  'import * as ohm from "ohm-js"',
  'import * as ohm from "https://unpkg.com/ohm-js@17.1.0?module"'
)
parserContent = parserContent.replace(
  'import * as fs from "node:fs"',
  '// Browser: no fs module needed'
)
parserContent = parserContent.replace(
  `const grammar = ohm.grammar(
  fs.readFileSync(new URL("./webrogue.ohm", import.meta.url), "utf8")
)`,
  `const grammarText = await fetch(new URL("./webrogue.ohm", import.meta.url)).then(r => r.text())
const grammar = ohm.grammar(grammarText)`
)
await fs.writeFile(path.join(docsDir, "parser.js"), parserContent)
console.log("Transformed parser.js")

// Transform generator.js: Remove Node.js runtime code
let generatorContent = await fs.readFile(path.join(srcDir, "generator.js"), "utf8")
// Simple replacements for Node.js specific code
generatorContent = generatorContent.replace(
  'emit(\'const { stdin, stdout } = await import("node:process");\')',
  '// Browser: no stdin/stdout'
)
generatorContent = generatorContent.replace(
  'emit(\'const { createInterface } = await import("node:readline/promises");\')',
  '// Browser: no readline'
)
await fs.writeFile(path.join(docsDir, "generator.js"), generatorContent)
console.log("Transformed generator.js")

console.log("Build complete!")