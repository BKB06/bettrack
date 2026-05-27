const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const parseBlock = html.match(/(function parseBetText\(text\) \{[\s\S]*?\n\s*\}\s*\n)\s*\/\/ --- CLIPBOARD PASTE LOGIC ---/)[1];

const testCode = `
let bkSelect = { options: [], value: ''};
let stakeInput = { value: '' };
let oddInput = { value: '' };
let betFreebet = { checked: false };
let betEventInput = { value: '' };
let mockDocument = {getElementById: (id) => {
    if (id === 'bet-event') return betEventInput;
    if (id === 'bet-odd') return oddInput;
    if (id === 'bet-stake') return stakeInput;
    if (id === 'bet-freebet') return betFreebet;
    return null;
}};
const document = mockDocument;
function updateFeedback() {}
${parseBlock}
parseBetText('Independiente del Valle (Vitória Mandante) odd 2,32');
console.log('ODD:', oddInput.value);
console.log('DESC:', betEventInput.value);

// Also test the OCR paste rule simulation:
const text = 'Independiente del Valle (Vitória Mandante) odd 2,32';
const condition = text.toLowerCase().includes('aposta') || text.includes('R$') || text.toLowerCase().includes('odd') || text.match(/\b\d+[,.]\d{2}\b/);
console.log('Condition met:', !!condition);
`;
fs.writeFileSync('execTest_real.js', testCode);
