function cleanTrailing(desc) {
  // 1. "Esta noite", "hoje", etc. e tudo que vier depois
  desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha).*/i, '');
  
  // 2. Horários bem formados " 21:00", " 21h30" e lixo depois
  desc = desc.replace(/\s+\d{2}[:h]\d{2}.*$/i, '');
  
  // 3. Palavras curtas do OCR no fim ("ço 2130", "co 519,")
  desc = desc.replace(/\s+(?:cio|ço|co|es|as|os|do|de)\s*[\d:.,\s]*$/i, '');
  
  // 4. Apenas números de 3, 4 dígitos no final
  desc = desc.replace(/\s+\d{3,4}[.,\s]*$/i, '');

  return desc;
}

const orig1 = "Cleveland Cavaliers -NewYork co 519,";
console.log(`Original: "${orig1}" -> Cleaned: "${cleanTrailing(orig1)}"`);

