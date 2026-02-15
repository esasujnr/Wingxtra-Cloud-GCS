#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'js', 'js_main.js');
const content = fs.readFileSync(targetFile, 'utf8');

const declarationRegex = /^\s*export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
const declarations = new Map();

let match;
while ((match = declarationRegex.exec(content)) !== null) {
  const fnName = match[1];
  const line = content.slice(0, match.index).split('\n').length;

  if (!declarations.has(fnName)) {
    declarations.set(fnName, []);
  }

  declarations.get(fnName).push(line);
}

const duplicates = [...declarations.entries()].filter(([, lines]) => lines.length > 1);

if (duplicates.length > 0) {
  console.error('Duplicate exported function declarations found in src/js/js_main.js:');
  duplicates.forEach(([name, lines]) => {
    console.error(`- ${name} declared at lines: ${lines.join(', ')}`);
  });
  process.exit(1);
}

console.log('No duplicate exported function declarations found in src/js/js_main.js');
