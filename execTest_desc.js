const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const parseBlock = html.match(/function parseBetText\(text\) \{([\s\S]*?)updateFeedback\(\);\s*\}/)[1];
const testCode = `
let cleanText = 'Independiente del Valle (Vitória Mandante) odd 2,32';
let stake = 0; let retornos = 0;
let bkSelect = { options: [], value: ''};
let stakeInput = { value: '' };
let oddInput = { value: '' };
let betFreebet = { checked: false };
let mockDocument = {getElementById: (id) => {
    if (id === 'bet-event') return betEventInput;
    return null;
}};
let betEventInput = { value: '' };
function updateFeedback() {}
const document = mockDocument;

${parseBlock}

console.log('ODD:', oddInput.value);
console.log('DESC:', betEventInput.value);
`;

fs.writeFileSync('execTest_test.js', testCode);
