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
  desc = desc.replace(/^.*?(?:simples|múltipla|dupla)[\s\S]*?\d+[,.]\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])/i, '');
  desc = desc.replace(/\s+\d+[,.]\d{2}(?:\s+.*)?$/, '');
  desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha|cio|ço)*\s*\d{2}[:h]?\d{2}.*$/i, '');
  desc = desc.replace(/^[\s\W_]+/, '').replace(/^(?:e|a|q|o|bd)\b\s*/i, '').replace(/^[\s\W_]+/, '').trim();
  if (!desc || desc.length <= 2) {
     const validTextLines = validLines.filter(l => l.length > 5 && l.match(/[a-zA-Z]/));
     if (validTextLines.length > 0) desc = validTextLines[0];
  }
  console.log("Lines:", lines);
  console.log("Valid Lines:", validLines);
  console.log("eventIdx:", eventIdx);
  console.log("Result Desc:", desc);
}
parseBetText(`Betano\nES 260\n3.60\nCriar Aposta\nCleveland Cavaliers \nEsta noite 21:00\nKnicks`);
