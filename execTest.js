const fs = require('fs');
const idx = fs.readFileSync('index.html', 'utf8');
const parseFuncCode = idx.substring(idx.indexOf('function parseBetText'), idx.indexOf('// --- CLIPBOARD PASTE LOGIC ---'));

const testCode = parseFuncCode
.replace(/bkSelect.*?;/g, '')
.replace(/oddInput\.value/g, 'global.oddVal')
.replace(/stakeInput\.value/g, 'global.stakeVal')
.replace('updateFeedback();', '');

const script = `
global.oddVal = 0;
global.stakeVal = 0;
${testCode.replace('function parseBetText(text) {', 'function parseBetText(text) {\nconst document = { getElementById: (id) => { if(id==="bet-event") return global.betEvent = {value:""}; if(id==="bet-freebet") return global.betFreebet = {checked:false}; return {value: ""}; } };')}
parseBetText(\`Betano
Simples R$10,00 3.00
Criar Aposta 3.00
San Antonio Spurs - Oklahoma
City Thunder Esta noite 21:30
14+
Victor Wembanyama Total de Rebotes
29+
Shai Gilgeous-Alexander Total de pontos
9+
Shai Gilgeous-Alexander Total de Rebotes e
Assistências
APOSTA GRÁTIS R$10,00
Ganhos Potenciais R$20,00\`);

console.log("Odd: ", global.oddVal);
console.log("Stake: ", global.stakeVal);
console.log("Event: ", global.betEvent ? global.betEvent.value : "not set");
console.log("Freebet: ", global.betFreebet ? global.betFreebet.checked : false);
`;
fs.writeFileSync('execTest2.js', script);
