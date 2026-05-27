const cleanText = "Independiente del Valle (Vitória Mandante) odd 2,32";
let matchOdd = cleanText.match(/(?:odds totais|odd|@)\s*([0-9]+[,.][0-9]{2})/i);
console.log(matchOdd);
