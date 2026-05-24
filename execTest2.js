
global.oddVal = 0;
global.stakeVal = 0;
function parseBetText(text) {
const document = { getElementById: (id) => { if(id==="bet-event") return global.betEvent = {value:""}; if(id==="bet-freebet") return global.betFreebet = {checked:false}; return {value: ""}; } };
        const textLower = text.toLowerCase();
        
        // Limpa possíveis artefatos visuais e espaços excessivos
        let cleanText = text.replace(/[\r\n]+/g, '\n').trim();

        // 1. Parsing Casa
        const bks = Array.from(
        for (let opt of bks) {
          if (!opt.value) continue;
          const nameLower = opt.textContent.split(' (')[0].toLowerCase();
          if (nameLower && textLower.includes(nameLower)) {
            
            break;
          }
        }

        // 2. Parsing Valor (Stake) e Ganhos Potenciais
        let stake = 0;
        let retornos = 0;

        // Betano "Simples R$ XX,XX" ou "Aposta R$ XX,XX"
        const stakePattern1 = cleanText.match(/(?:simples|múltipla|dupla|aposta|stake)\s*(?:r\$|brl|eur)?\s*(\d+[,.]\d{2})/i);
        const stakePattern2 = cleanText.match(/valor(?: da aposta)?[\s\S]{0,15}?(?:r\$|brl|eur)?\s*(\d+[,.]\d{2})/i);
        
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
          global.stakeVal = stake;
        }

        // 3. Parsing Odd
        let odd = 0;
        let matchOdd = cleanText.match(/(?:odds totais|odd|@)\s*([0-9]+[,.][0-9]{2})/i);
        
        // Betano as vezes coloca a odd solta na frente do Simples (Ex: "Simples R$12,17  2.00")
        const topBarMatch = cleanText.match(/(?:simples|múltipla|dupla).*?r\$[\s\S]{0,10}?\d+[,.]\d{2}\s*([1-9][0-9]*[,.][0-9]{2})/i);

        if (matchOdd) {
          odd = parseFloat(matchOdd[1].replace(',', '.'));
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
          global.oddVal = odd;
        } else {
          global.oddVal = 1.0; // Evitar que fique vazio/zero se falhar
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
                   lw.includes('betano') || lw.includes('bet365') || 
                   lw.includes('informações sobre') ||
                   lw.includes('simples r$') || lw.includes('múltipla') ||
                   lw.match(/^[\d.,\s$r+]+$/i); // Ignora linhas apenas com números, valores e sinais de +
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
            if (validLines.length > 0) desc = validLines[0];
            if (validLines.length > 1 && validLines[1].match(/\s+(x|vs)\s+/i)) {
               desc += " - " + validLines[1];
            }
          }
          
          // Remove a sujeira inicial de Simples, Multipla, e etc que possa ter passado
          desc = desc.replace(/^.*?(?:simples|múltipla|dupla)[\s\S]*?\d+[,.]\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])/i, '');
          
          // Remove odds da Betano "soltas" no meio do texto
          desc = desc.replace(/\s+\d+[,.]\d{2}(?:\s+.*)?$/, '');

          // Limpa artefatos residuais e caracteres sozinhos
          desc = desc.replace(/^[\s\W_]+/, '')
                     .replace(/^(?:e|a|q|o|bd)\b\s*/i, '') // \b garante que não corte 'o' de 'oklahoma' erroneamente
                     .replace(/^[\s\W_]+/, '')
                     .trim();
          
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

        
      }

      
parseBetText(`Betano
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
Ganhos Potenciais R$20,00`);

console.log("Odd: ", global.oddVal);
console.log("Stake: ", global.stakeVal);
console.log("Event: ", global.betEvent ? global.betEvent.value : "not set");
console.log("Freebet: ", global.betFreebet ? global.betFreebet.checked : false);
