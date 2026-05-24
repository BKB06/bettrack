function parseBetText(text) {
  let cleanText = text.replace(/[\r\n]+/g, '\n').trim();
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  const isInvalid = (l) => {
    const lw = l.toLowerCase();
    return lw.includes('playoff') || lw.includes('aposta') || 
           lw.includes('odds') || lw.includes('ganhos') || 
           lw.includes('retornos') || lw.includes('superbet') ||
           lw.includes('betano') || lw.includes('bet365') || 
           lw.includes('informações sobre') ||
           lw.includes('simples') || lw.includes('múltipla') || lw.includes('dupla') ||
           lw.match(/^[\d.,\s$r+]+$/i) ||
           lw.match(/^(es|rs|r\$)\s*[\d.,\s]+$/i); // Ignora coisas como ES 260, RS 5,00
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
    // Melhorar fallback: pegar a primeira linha legível que pareça texto de verdade
    const betterLines = validLines.filter(l => l.length > 6 && l.match(/[a-zA-Z]{4,}/) && !l.match(/^\d/));
    if (betterLines.length > 0) desc = betterLines[0];
    if (betterLines.length > 1 && betterLines[1].match(/\s+(x|vs)\s+/i)) {
       desc += " - " + betterLines[1];
    }
  }
  
  // Limpezas
  desc = desc.replace(/^.*?(?:simples|múltipla|dupla)[\s\S]*?\d+[,.]\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])/i, '');
  desc = desc.replace(/\s+\d+[,.]\d{2}(?:\s+.*)?$/, '');
  desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha|cio|ço)*\s*\d{2}[:h]?\d{2}.*$/i, '');
  desc = desc.replace(/^[\s\W_]+/, '').replace(/^(?:e|a|q|o|bd)\b\s*/i, '').replace(/^[\s\W_]+/, '').trim();
  
  console.log("Valid Lines:", validLines);
  console.log("Result Desc:", desc);
}

parseBetText(`Betano\nES 260\n3.60\nCriar Aposta\nCleveland Cavaliers New York\nEsta noite 21:00\nKnicks`);
