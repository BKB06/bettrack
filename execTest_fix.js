const regex = /\s*\b(?:odd|odds|@)\b.*$/i;
console.log("Independiente del Valle (Vitória Mandante) odd 2,32".replace(regex, ''));
console.log("Team A @ 1,50".replace(regex, ''));
