// Copies the node icon next to the compiled node (tsc does not copy non-TS assets).
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'nodes', 'Selenium', 'selenium.svg');
const target = path.join(__dirname, '..', 'dist', 'nodes', 'Selenium', 'selenium.svg');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log('icon copied ->', target);
