import fs from 'node:fs';
const file = new URL('../scene.js', import.meta.url);
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/[ \t]+$/gm, '').replace(/^ +\t/gm, '\t'));
