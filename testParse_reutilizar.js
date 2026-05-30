const fs = require('fs');
const testFun = `
function parseBetText(text) {
  let cleanText = text.replace(/[\\r\\n]+/g, '\\n').trim();
  const lines = cleanText.split('\\n').map(l => l.trim()).filter(l => l.length > 2);
  const isInvalid = (l) => {
    const lw = l.toLowerCase();
    return lw.includes('playoff') || lw.includes('aposta') || 
           lw.includes('odds') || lw.includes('ganhos') || 
           lw.includes('retornos') || lw.includes('superbet') ||
           lw.includes('betano') || lw.includes('bet365') || lw.includes('pitaco') ||
           lw.includes('informações sobre') ||
           lw.includes('simples') || lw.includes('dupla') || lw.includes('múltipla') ||
           lw.includes('em aberto') || lw.includes('finalizadas') || lw.includes('pendentes') || lw.includes('ao vivo') || lw.includes('em revisão') ||
           /^[\\d.,\\s$r+hx]+$/i.test(lw) ||
           /^(?:\\W|es|rs|r\\$)*[\\d.,\\s]+x?$/i.test(lw);
  };
  let validLines = lines.filter(l => !isInvalid(l));
  let desc = "";
  const eventIdx = validLines.findIndex(l => l.match(/\\s+(x|vs|—|-|–)\\s+/i));
  if (eventIdx !== -1) {
    desc = validLines[eventIdx];
    if (eventIdx > 0 && !validLines[eventIdx - 1].match(/\\d{2,}/)) {
       desc = validLines[eventIdx - 1] + ' - ' + desc;
    }
  } else {
    const betterLines = validLines.filter(l => l.length > 6 && l.match(/[a-zA-Z]{4,}/) && !l.match(/^\\d/));
    if (betterLines.length > 0) desc = betterLines[0];
    if (betterLines.length > 1 && betterLines[1].match(/\\s+(x|vs)\\s+/i)) {
       desc += " - " + betterLines[1];
    }
  }
  desc = desc.replace(/^.*?(?:simples|múltipla|dupla)[\\s\\S]*?\\d+[,.]\\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])/i, '');
  desc = desc.replace(/\\s*(?:\\b(?:odd|odds)\\b|@).*$/i, '');
  desc = desc.replace(/\\s+\\d+[,.]\\d{2}(?:\\s+.*)?$/, '');
  desc = desc.replace(/\\s*(?:esta noite|hoje|amanhã|amanha).*/i, '');
  desc = desc.replace(/\\s+\\d{2}[:h]\\d{2}.*$/i, '');
  desc = desc.replace(/\\s+(?:cio|ço|co|es|as|os|do|de)\\s*[\\d:.,\\s]*$/i, '');
  desc = desc.replace(/\\s+\\d{3,4}[.,\\s]*$/i, '');
  desc = desc.replace(/^([a-zA-ZÀ-ÿ]{1,3}\\b[\\s\\W\\d]*)*(?=[a-zA-ZÀ-ÿ])/i, '');
  desc = desc.replace(/[^\\w\\)]+([a-zA-ZÀ-ÿ]{1,3}\\b[^\\w\\)]*)*$/i, '');
  
  // Custom cleaner for 'Reutilizar' and anything weird starting like 'Q Reutiliz'
  desc = desc.replace(/^(?:\\W|[a-zA-Z]{1,2}\\s+)?Reutiliz[a-z]*\\W*/i, '');

  desc = desc.replace(/^[\\s\\W_]+/, '').replace(/[^\\w\\)]+$/, '').trim();
  if (!desc || desc.length <= 2) {
     const validTextLines = validLines.filter(l => l.length > 5 && l.match(/[a-zA-Z]/));
     if (validTextLines.length > 0) desc = validTextLines[0];
  }
  return desc;
}
console.log(parseBetText("Q Reutilizar aposta\\nKhvicha Kvaratskhelia - Mais de 0.5\\nPSG - Arsenal"));
`;
console.log(eval(testFun));
