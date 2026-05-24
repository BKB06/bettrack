function cleanTrailing(desc) {
  // 1. "Esta noite", "hoje", etc. e tudo que vier depois
  desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha).*/i, '');
  
  // 2. Horários bem formados " 21:00", " 21h30" e lixo depois
  desc = desc.replace(/\s+\d{2}[:h]\d{2}.*$/i, '');
  
  // 3. Palavras curtas (erros de OCR comuns do fim da data, tipo "ço 2130", "co 519,", "es 21:00") e números no fim
  desc = desc.replace(/\s+(?:cio|ço|co|es|as|os|do)\s*[\d:.,\s]*$/i, '');
  
  // 4. Apenas números soltos de 3, 4 dígitos no final (ex: " 2130", " 519,")
  desc = desc.replace(/\s+\d{3,4}[.,\s]*$/i, '');

  return desc;
}

console.log("76ers:", cleanTrailing("Philadelphia 76ers"));
console.log("co 519,:", cleanTrailing("Cleveland Cavaliers -NewYork co 519,"));
console.log("2130:", cleanTrailing("San Antonio Spurs - Oklahoma cio 2130"));
console.log("21:00:", cleanTrailing("Cleveland Esta noite 21:00 Knicks"));
console.log("Knicks:", cleanTrailing("Cleveland - New York Knicks"));
