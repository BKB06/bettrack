const cleanText = `Betano
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
Ganhos Potenciais R$20,00`;

const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
const isInvalid = (l) => {
  const lw = l.toLowerCase();
  return lw.includes('playoff') || lw.includes('aposta') || 
         lw.includes('odds') || lw.includes('ganhos') || 
         lw.includes('retornos') || lw.includes('superbet') ||
         lw.includes('betano') || lw.includes('bet365') || 
         lw.includes('informações sobre') ||
         lw.includes('simples r$') || lw.includes('múltipla') ||
         lw.match(/^[\d.,\s$r+]+$/i);
};

let validLines = lines.filter(l => !isInvalid(l));

let desc = "";
const eventIdx = validLines.findIndex(l => l.match(/\s+(x|vs|—|-|–)\s+/i));

if (eventIdx !== -1) {
  desc = validLines[eventIdx];
  if (eventIdx > 0 && !validLines[eventIdx - 1].match(/\d{2,}/)) {
     desc = validLines[eventIdx - 1] + ' - ' + desc;
  }
} else {
  if (validLines.length > 0) desc = validLines[0];
  if (validLines.length > 1 && validLines[1].match(/\s+(x|vs)\s+/i)) {
     desc += " - " + validLines[1];
  }
}

// Remove texto de horario comum e datas do final/meio da string do evento
desc = desc.replace(/(?:esta noite|hoje|amanhã|amanha)\s*\d{1,2}:\d{2}/i, '');
desc = desc.replace(/\b\d{1,2}[\/]\d{1,2}(?:[\/]\d{2,4})?\b/g, ''); // datas
desc = desc.replace(/\b\d{1,2}:\d{2}\b/g, ''); // horarios
desc = desc.replace(/cio$/, '').trim(); // Remove "cio" perdido (City Thunder truncado?)

// Remove a sujeira inicial
desc = desc.replace(/^.*?(?:simples|múltipla|dupla)[\s\S]*?\d+[,.]\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])/i, '');
desc = desc.replace(/\s+\d+[,.]\d{2}(?:\s+.*)?$/, '');
desc = desc.replace(/^[\s\W_]+/, '').replace(/^(?:e|a|q|o|bd)\b\s*/i, '').replace(/^[\s\W_]+/, '').trim();

if (!desc || desc.length <= 2) {
   const validTextLines = validLines.filter(l => l.length > 5 && l.match(/[a-zA-Z]/));
   if (validTextLines.length > 0) {
       desc = validTextLines[0];
   }
}

console.log("validLines", validLines);
console.log("eventIdx", eventIdx);
console.log("DESC: ", desc);
