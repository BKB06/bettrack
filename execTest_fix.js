const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const parseBetTextMatch = html.match(/function parseBetText\(text\) \{([\s\S]*?)\n\s*\}\n\s*function isEquivalent/);
let body = parseBetTextMatch[1];
// replace DOM calls and mock oddInput, stakeInput etc
const script = `
  let oddInput = {value: ''};
  let stakeInput = {value: ''};
  let eventInput = {value: ''};
  let multipleCheckbox = {checked: false};
  ${body}
  return { oddInput, stakeInput, eventInput, multipleCheckbox };
`;
const parseBetText = new Function('text', script);

const testText = "Criar Aposta\n3.10\n1 Athletico-PR\nAmanhã 16:00\n[shield]\nmirasso\nOdd: 2,1\nReutilizar";
const res = parseBetText(testText);
console.log(res.oddInput.value, res.eventInput.value);
