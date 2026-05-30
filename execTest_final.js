const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Quick syntax check for index.html parseBetText
const parseBetTextMatch = html.match(/function parseBetText\(text\) \{([\s\S]*?)\n\s*\}\n\s*function isEquivalent/);
if (!parseBetTextMatch) {
    console.log("Failed to match parseBetText!");
    process.exit(1);
}
let body = parseBetTextMatch[1];
try {
    const script = `
      let oddInput = {value: ''};
      let stakeInput = {value: ''};
      let eventInput = {value: ''};
      let multipleCheckbox = {checked: false};
      ${body}
      return { oddInput, stakeInput, eventInput, multipleCheckbox };
    `;
    const parseBetText = new Function('text', script);
    console.log("Syntax OK.");
} catch (e) {
    console.error("Syntax Error in parseBetText:", e);
}
