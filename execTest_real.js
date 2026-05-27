
let bkSelect = { options: [], value: ''};
let stakeInput = { value: '' };
let oddInput = { value: '' };
let betFreebet = { checked: false };
let betEventInput = { value: '' };
let mockDocument = {getElementById: (id) => {
    if (id === 'bet-event') return betEventInput;
    if (id === 'bet-odd') return oddInput;
    if (id === 'bet-stake') return stakeInput;
    if (id === 'bet-freebet') return betFreebet;
    return null;
}};
const document = mockDocument;
function updateFeedback() {}
function parseBetText(text) {
        const textLower = text.toLowerCase();
        
        // Limpa possíveis artefatos visuais e espaços excessivos
        let cleanText = text.replace(/[\r\n]+/g, '\n').trim();

        // 1. Parsing Casa
          const bks = Array.from(bkSelect.options);
          let matchCasa = null;
          for (let opt of bks) {
            if (!opt.value) continue;
            const nameLower = opt.textContent.split(' (')[0].trim().toLowerCase();
            if (nameLower && textLower.includes(nameLower)) {
              matchCasa = opt.value;
              break;
            }
          }
          if (!matchCasa && (textLower.includes('resumir aposta') || textLower.includes('em aberto finalizadas'))) {
             const pitacoOpt = bks.find(opt => opt.textContent.toLowerCase().includes('pitaco'));
             if (pitacoOpt) matchCasa = pitacoOpt.value;
          }
          if (matchCasa) {
            bkSelect.value = matchCasa;
          }

        // 2. Parsing Valor (Stake) e Ganhos Potenciais
        let stake = 0;
        let retornos = 0;

        // Betano "Simples R$ XX,XX" ou "Aposta R$ XX,XX"
          const stakePattern1 = cleanText.match(/(?:simples|múltipla|dupla|aposta|stake)\s*(?:r\$|brl|eur)?\s*(\d+[,.]\d{2})(?!\s*[xX])/i);
          const stakePattern2 = cleanText.match(/valor(?: da aposta)?[\s\S]{0,15}?(?:r\$|brl|eur)?\s*(\d+[,.]\d{2})(?!\s*[xX])/i);

          if (stakePattern1) {
            stake = parseFloat(stakePattern1[1].replace(',', '.'));
          } else if (stakePattern2) {
            stake = parseFloat(stakePattern2[1].replace(',', '.'));
          }

        // Tenta extrair Ganhos Potenciais/Retorno (Útil pra inferir a Odd)
        const retornosMatch = cleanText.match(/(?:ganhos potenciais|retornos?|potencial|pagamento)[\s\S]{0,20}?(?:r\$|brl|eur)?\s*(\d+[,.]\d{2})/i);
        if (retornosMatch) {
          retornos = parseFloat(retornosMatch[1].replace(',', '.'));
        }

        // Se stake ainda é 0, tenta achar o primeiro valor em dinheiro que NÃO seja o retorno
        if (stake === 0) {
           const fallbackStake = cleanText.match(/(?:r\$|brl)\s*(\d+[,.]\d{2})/i);
           if (fallbackStake) {
              const val = parseFloat(fallbackStake[1].replace(',', '.'));
              if (val !== retornos) stake = val;
           }
        }

        if (stake > 0) {
          stakeInput.value = stake;
        }

        // 3. Parsing Odd
        let odd = 0;
        let matchOdd = cleanText.match(/(?:odds totais|odd|@)\s*([0-9]+[,.][0-9]{2})/i);
        
        // Betano as vezes coloca a odd solta na frente do Simples (Ex: "Simples R$12,17  2.00")
        const topBarMatch = cleanText.match(/(?:simples|múltipla|dupla).*?r\$[\s\S]{0,10}?\d+[,.]\d{2}\s*([1-9][0-9]*[,.][0-9]{2})/i);

                  const oddXMatch = cleanText.match(/\b([1-9][0-9]*[,.][0-9]{2})\s*[xX*×]/i);

          if (matchOdd) {
            odd = parseFloat(matchOdd[1].replace(',', '.'));
          } else if (oddXMatch) {
            odd = parseFloat(oddXMatch[1].replace(',', '.'));
          } else if (topBarMatch) {
          odd = parseFloat(topBarMatch[1].replace(',', '.'));
        } else if (stake > 0 && retornos > 0) {
          // Calcula ODD real com base no retorno
          odd = Math.round((retornos / stake) * 100) / 100;
        } else {
          // Último caso: Encontrar a primeira Odd típica solta no texto (Ignorando Valores Financeiros rastreados)
          const decimals = [...cleanText.matchAll(/\b([1-9][0-9]*[,.][0-9]{2})\b/g)].map(m => parseFloat(m[1].replace(',', '.')));
          const cand = decimals.find(v => v !== stake && v !== retornos && v >= 1.01 && v <= 100.0);
          if (cand) odd = cand;
        }

        if (odd >= 1.01) {
          oddInput.value = odd;
        } else {
          oddInput.value = 1.0; // Evitar que fique vazio/zero se falhar
        }

// 4. Parsing Freebet
          const betFreebet = document.getElementById('bet-freebet');
          if (betFreebet) {
             betFreebet.checked = !!cleanText.match(/\b(grátis|freebet|créditos? de aposta|bônus|aposta grátis)\b/i);
          }

          // 5. Parsing Evento / Descrição
          const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          
          const isInvalid = (l) => {
            const lw = l.toLowerCase();
            return lw.includes('playoff') || lw.includes('aposta') || 
                     lw.includes('odds') || lw.includes('ganhos') || 
                     lw.includes('retornos') || lw.includes('superbet') ||
                     lw.includes('betano') || lw.includes('bet365') || lw.includes('pitaco') ||
                     lw.includes('informações sobre') ||
                     lw.includes('simples') || lw.includes('dupla') || lw.includes('múltipla') ||
                     lw.includes('em aberto') || lw.includes('finalizadas') || lw.includes('pendentes') || lw.includes('ao vivo') || lw.includes('em revisão') ||
                     /^[\d.,\s$r+hx]+$/i.test(lw) ||
                     /^(?:\W|es|rs|r\$)*[\d.,\s]+x?$/i.test(lw);
          };

          let validLines = lines.filter(l => !isInvalid(l));
          
          let desc = "";
          const eventIdx = validLines.findIndex(l => l.match(/\s+(x|vs|—|-|–)\s+/i));

          if (eventIdx !== -1) {
            desc = validLines[eventIdx];
            // Anexa a linha anterior se ela não parecer só um monte de números
            if (eventIdx > 0 && !validLines[eventIdx - 1].match(/\d{2,}/)) {
               desc = validLines[eventIdx - 1] + ' - ' + desc;
            }
          } else {
            const betterLines = validLines.filter(l => l.length > 6 && l.match(/[a-zA-Z]{4,}/) && !l.match(/^\d/));
            if (betterLines.length > 0) desc = betterLines[0];
            if (betterLines.length > 1 && betterLines[1].match(/\s+(x|vs)\s+/i)) {
               desc += " - " + betterLines[1];
            }
          }
          
          // Remove a sujeira inicial de Simples, Multipla, e etc que possa ter passado
          desc = desc.replace(/^.*?(?:simples|múltipla|dupla)[\s\S]*?\d+[,.]\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])/i, '');
          
          // Remove odds da Betano "soltas" no meio do texto e menções a odd
          desc = desc.replace(/\s*(?:\b(?:odd|odds)\b|@).*$/i, '');
          desc = desc.replace(/\s+\d+[,.]\d{2}(?:\s+.*)?$/, '');
          
          // Remove horários (ex: 21:30, 2130) e textos de data/hora (Esta noite, Hoje) do final do evento
          desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha).*/i, '');
          desc = desc.replace(/\s+\d{2}[:h]\d{2}.*$/i, '');
          
          // Remove resquícios de OCR confusos no final (ex: "co 519,", "ço 2130")
          desc = desc.replace(/\s+(?:cio|ço|co|es|as|os|do|de)\s*[\d:.,\s]*$/i, '');
          desc = desc.replace(/\s+\d{3,4}[.,\s]*$/i, '');

          // Limpa artefatos residuais e caracteres sozinhos
          desc = desc.replace(/^([a-zA-ZÀ-ÿ]{1,3}\b[\s\W\d]*)*(?=[a-zA-ZÀ-ÿ])/i, '');
          desc = desc.replace(/[^\w\)]+([a-zA-ZÀ-ÿ]{1,3}\b[^\w\)]*)*$/i, '');
          desc = desc.replace(/^[\s\W_]+/, '').replace(/[^\w\)]+$/, '').trim();
          
          // Fallback se a descrição for vazia ou for um lixo de 1 letra
          if (!desc || desc.length <= 2) {
             // Tenta pegar a maior linha de texto válida, assumindo que é o confronto
             const validTextLines = validLines.filter(l => l.length > 5 && l.match(/[a-zA-Z]/));
             if (validTextLines.length > 0) {
                 desc = validTextLines[0];
             }
          }
        
        if (desc) {
          document.getElementById('bet-event').value = desc;
        }

        updateFeedback();
      }


parseBetText('Independiente del Valle (Vitória Mandante) odd 2,32');
console.log('ODD:', oddInput.value);
console.log('DESC:', betEventInput.value);

// Also test the OCR paste rule simulation:
const text = 'Independiente del Valle (Vitória Mandante) odd 2,32';
const condition = text.toLowerCase().includes('aposta') || text.includes('R$') || text.toLowerCase().includes('odd') || text.match(/d+[,.]d{2}/);
console.log('Condition met:', !!condition);
