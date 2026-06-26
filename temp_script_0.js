
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const db = loadDb();
        const bkSelect = document.getElementById('bet-bookmaker');
        const oddInput = document.getElementById('bet-odd');
        const stakeInput = document.getElementById('bet-stake');
        const feedbackContainer = document.getElementById('feedback-container');
        const btnSubmit = document.getElementById('btn-submit');
        const form = document.getElementById('new-bet-form');

        // Set today's date
        const today = new Date();
        const localToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        document.getElementById('bet-date').value = localToday;

        // Populate bookmakers
        if (!db || !Array.isArray(db.bookmakers) || db.bookmakers.length === 0) {
          bkSelect.innerHTML = '<option value="">Nenhuma casa cadastrada</option>';
        } else {
          db.bookmakers.forEach(bk => {
            if (!bk) return; // Skip if null
            const opt = document.createElement('option');
            opt.value = bk.id || '';
            const totalBalance = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0)) || 0;
            opt.textContent = `${bk.name || 'Desconhecida'} (Saldo: R$ ${totalBalance.toFixed(2)})`;
            bkSelect.appendChild(opt);
          });
        }

        function updateFeedback() {
          const odd = parseFloat(oddInput.value.replace(',', '.')) || 0;
          const stake = parseFloat(stakeInput.value.replace(',', '.')) || 0;
          const bkId = bkSelect.value;
          const bk = db.bookmakers.find(b => b.id === bkId);
          const isFreebet = document.getElementById('bet-freebet').checked;

          if (!bk || stake <= 0) {
            feedbackContainer.innerHTML = '';
            btnSubmit.disabled = false;
            return;
          }

          const balance = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0)) || 0;
          
          // Use epsilon para evitar erro de precisão de ponto flutuante
          if (!isFreebet && stake > balance + 0.0001) {
            feedbackContainer.innerHTML = `
              <div class="feedback-box feedback-box--error">
                <div class="feedback-row">
                  <span class="feedback-row__label">Saldo Insuficiente</span>
                  <span class="feedback-row__value">Em ${bk.name}</span>
                </div>
                <div class="feedback-row">
                  <span class="feedback-row__label">Saldo disponível:</span>
                  <span class="feedback-row__value" style="color:var(--red);">R$ ${balance.toFixed(2)}</span>
                </div>
              </div>
            `;
            btnSubmit.disabled = true;
          } else {
            feedbackContainer.innerHTML = '';
            btnSubmit.disabled = false;
          }
        }

        if(bkSelect) bkSelect.addEventListener('change', updateFeedback);
        if(oddInput) oddInput.addEventListener('input', updateFeedback);
        if(stakeInput) stakeInput.addEventListener('input', updateFeedback);
        const fbCheck = document.getElementById('bet-freebet');
        if (fbCheck) fbCheck.addEventListener('change', updateFeedback);

        if(form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const bkId = bkSelect.value;
            const bkRef = db.bookmakers.find(b => b.id === bkId);
            const isFreebet = fbCheck ? fbCheck.checked : false;
            const stakeVal = parseFloat(stakeInput.value.replace(',', '.')) || 0;
            const oddVal = parseFloat(oddInput.value.replace(',', '.')) || 0;
            const category = document.getElementById('bet-category').value;

            if (!bkRef) {
              alert('Por favor selecione uma casa de apostas válida.');
              return;
            }

            const currentBal = Number(bkRef.balance !== undefined ? bkRef.balance : (bkRef.sportsBalance || 0)) || 0;
            if (!isFreebet && stakeVal > currentBal + 0.0001) {
              alert('Saldo insuficiente na casa de apostas selecionada! Atualize seu banco/fundos primeiro ou altere o valor da aposta.');
              return;
            }

            db.bets.push({
              id: generateId(),
              bookmakerId: bkId,
              stake: stakeVal,
              odd: oddVal,
              category: category,
              date: document.getElementById('bet-date').value,
              status: 'pending',
              profit: 0,
              isFreebet: isFreebet
            });

            if (!isFreebet) {
              bkRef.balance = currentBal - stakeVal;
              bkRef.balance = Math.max(0, Number(bkRef.balance).toFixed(2));
            }

            saveDb(db);
            alert('Aposta Registrada com Sucesso!');
            
            const nowLocal = new Date();
            document.getElementById('bet-date').value = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth()+1).padStart(2,'0')}-${String(nowLocal.getDate()).padStart(2,'0')}`;
            stakeInput.value = '';
            oddInput.value = '';
            if (fbCheck) fbCheck.checked = false;
            updateFeedback();

            // Refresh bk options to show new balance
            bkSelect.innerHTML = '';
            db.bookmakers.forEach(bk => {
              if (!bk) return;
              const opt = document.createElement('option');
              opt.value = bk.id || '';
              const tb = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0)) || 0;
              opt.textContent = `${bk.name || 'Desconhecida'} (Saldo: R$ ${tb.toFixed(2)})`;
              bkSelect.appendChild(opt);
            });
            bkSelect.value = bkId;
          });
        }

      // --- OCR LOGIC ---
      const btnOcr = document.getElementById('btn-import-ocr');
      const inputOcr = document.getElementById('ocr-upload');

      if (btnOcr && inputOcr) {
        btnOcr.addEventListener('click', () => {
          inputOcr.click();
        });

        inputOcr.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const originalText = btnOcr.textContent;
          btnOcr.textContent = 'Lendo...';
          btnOcr.disabled = true;

          try {
            const result = await Tesseract.recognize(file, 'por', {
              logger: m => console.log(m)
            });
            const text = result.data.text;
            console.log("OCR Text:", text);
            parseBetText(text);

          } catch (error) {
            console.error('OCR Error:', error);
            alert('Erro ao ler o cupom. Tente uma imagem mais nítida.');
          } finally {
            btnOcr.textContent = originalText;
            btnOcr.disabled = false;
            inputOcr.value = '';
          }
        });
      }

      // --- TEXT PARSER ---
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
        
        // Betano as vezes coloca a odd solta na frente do Simples ou Criar Aposta
        const topBarMatch = cleanText.match(/(?:simples|múltipla|dupla).*?r\$[\s\S]{0,40}?\d+[,.]\d{2}\s*([1-9][0-9]*[,.][0-9]{2})/i);
        const criarApostaMatch = cleanText.match(/(?:(?:criar aposta)|(?:bet builder))[\s\S]{0,40}?([1-9][0-9]*[,.][0-9]{2})/i);

        const oddXMatch = cleanText.match(/\b([1-9][0-9]*[,.][0-9]{2})\s*[xX*×]/i);

        // 4. Parsing Freebet
        let isFreebet = false;
        const betFreebet = document.getElementById('bet-freebet');
        if (betFreebet) {
            isFreebet = !!cleanText.match(/\b(grátis|freebet|créditos? de aposta|bônus|aposta grátis)\b/i);
            betFreebet.checked = isFreebet;
        }

        if (matchOdd) {
          odd = parseFloat(matchOdd[1].replace(',', '.'));
        } else if (oddXMatch) {
          odd = parseFloat(oddXMatch[1].replace(',', '.'));
        } else if (topBarMatch) {
          odd = parseFloat(topBarMatch[1].replace(',', '.'));
        } else if (criarApostaMatch) {
          odd = parseFloat(criarApostaMatch[1].replace(',', '.'));
        } else if (stake > 0 && retornos > 0) {
          // Calcula ODD real com base no retorno, considerando se é Freebet (lucro líquido) ou não (bruto)
          odd = Math.round(((retornos / stake) + (isFreebet ? 1 : 0)) * 100) / 100;
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

          // 5. Parsing Evento / Descrição
          const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          
          const isInvalid = (l) => {
            const lw = l.toLowerCase();
            return lw.includes('playoff') || lw.includes('aposta') || 
                     lw.includes('odds') || lw.includes('odd:') || lw.includes('odd ') || lw.includes('ganhos') || 
                     lw.includes('retornos') || lw.includes('superbet') ||
                     lw.includes('betano') || lw.includes('bet365') || lw.includes('pitaco') ||
                     lw.includes('informações sobre') ||
                     lw.includes('simples') || lw.includes('dupla') || lw.includes('múltipla') ||
                     lw.includes('em aberto') || lw.includes('finalizadas') || lw.includes('pendentes') || lw.includes('ao vivo') || lw.includes('em revisão') ||
                     lw.includes('reutilizar') ||
                     lw.includes('amanhã') || lw.includes('amanha') || lw.includes('hoje') || lw.includes('esta noite') ||
                     /^[\d.,\s$r+hx]+$/i.test(lw) ||
                     /^(?:\W|es|rs|r\$)*[\d.,\s]+x?$/i.test(lw);
          };

          let validLines = lines.filter(l => !isInvalid(l));
          
          let desc = "";
          let eventIdx = validLines.findIndex(l => l.match(/\s+(x|vs)\s+/i));
          if (eventIdx === -1) {
              eventIdx = validLines.findIndex(l => l.match(/\s+(—|-|–)\s+/i) && !l.match(/mais de|menos de|abaixo|acima|handicap|resultado|jogador/i));
          }

          if (eventIdx !== -1) {
            desc = validLines[eventIdx];
            // Anexa a linha anterior se ela não parecer só um monte de números
            if (eventIdx > 0 && !validLines[eventIdx - 1].match(/\d{2,}/)) {
               desc = validLines[eventIdx - 1] + ' - ' + desc;
            }
          } else {
            const betterLines = validLines.filter(l => l.length >= 3 && l.match(/[a-zA-Z]{3,}/) && !l.match(/menos de|mais de|abaixo|acima|handicap|chutes|marcar|jogador|escanteios/i));
            if (betterLines.length > 0) desc = betterLines[0];
            if (betterLines.length > 1 && !desc.match(/\s+(x|vs|-|–)\s+/i)) {
               if (betterLines[1].length < 35 && !betterLines[1].match(/menos de|mais de|abaixo|acima|chutes|marcar|jogador|escanteios/i)) {
                   desc += " - " + betterLines[1];
               }
            }
          }
          
          // Remove a sujeira inicial de Simples, Multipla, e etc que possa ter passado
          desc = desc.replace(/^.*?(?:simples|múltipla|dupla)[\s\S]*?\d+[,.]\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])/i, '');
          
          // Remove odds da Betano "soltas" no meio do texto e menções a odd
          desc = desc.replace(/\s*(?:\b(?:odd|odds)\b|@).*$/i, '');
          desc = desc.replace(/\s+\d+[,.]\d{2}[\s\W_]*$/i, '');
          desc = desc.replace(/\s+\d+[,.]\d{2}\s+(?=-|x|vs)/i, ' '); // remove odds que estão entre os nomes

          // Remove horários (ex: 21:30, 2130) e textos de data/hora (Esta noite, Hoje) do final do evento
          desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha)\b/ig, '');
          desc = desc.replace(/\s+\d{2}[:h]\d{2}\b/ig, '');
          
          // Remove resquícios de OCR confusos no final (ex: "co 519,", "ço 2130")
          desc = desc.replace(/\s+(?:cio|ço|co|es|as|os|do|de)\s*[\d:.,\s]*$/i, '');
          desc = desc.replace(/\s+\d{3,4}[.,\s]*$/i, '');

          // Remove "Reutilizar" (comum no OCR da Betano)
          desc = desc.replace(/^(?:[\s\W_]|[a-zA-Z]{1,3}\b)*reutiliz[a-z]*[\s\W_]*/i, '');
          desc = desc.replace(/\breutiliz[a-z]*\b/i, '');

          // Limpa artefatos residuais e caracteres sozinhos
          // Apenas remove uma letra solta no começo (como "o ", "e ") para não comer times como "PSG" ou "San "
          desc = desc.replace(/^([a-zA-ZÀ-ÿ]{1}\b[\s\W\d]*)*(?=[a-zA-ZÀ-ÿ])/i, '');
          // Remove número isolado no começo que costuma ser ícone de OCR (ex: "1 Athletico-PR")
          desc = desc.replace(/^[0-9O]\s+(?=[a-zA-ZÀ-ÿ]{3,})/i, '');
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

      // --- CLIPBOARD PASTE LOGIC ---
      document.addEventListener('paste', async (e) => {
        // Se colar imagem
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.type.indexOf('image') === 0) {
            // Tem uma imagem no clipboard! Vamos jogar direto no OCR se o tesseract estiver lá.
            e.preventDefault();
            const blob = item.getAsFile();
            if(!blob) continue;

            if (btnOcr) {
              const originalText = btnOcr.textContent;
              btnOcr.textContent = 'Lendo Área de Transferência...';
              btnOcr.disabled = true;

              try {
                const result = await Tesseract.recognize(blob, 'por');
                console.log("OCR Paste:", result.data.text);
                parseBetText(result.data.text);
              } catch(err) {
                console.error(err);
                alert("Erro OCR no colar: " + err.message);
              } finally {
                btnOcr.textContent = originalText;
                btnOcr.disabled = false;
              }
            }
            return;
          } else if (item.type === 'text/plain') {
            // Pode ser texto colado do site
            item.getAsString(text => {
               // Se o texto parecer um bilhete (tem R$, tem Odds, etc), usar o parseBetText
               // Só preenche se o usuário não tiver focado dentro de um campo de texto e digitando
               const activeEl = document.activeElement;
               if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.id !== 'bet-event') {
                 // Se o usuário está digitando especificamente na ODD ou Valor, deixa passar normalmente.
               } else if (text.toLowerCase().includes('aposta') || text.includes('R$') || text.toLowerCase().includes('odd') || text.match(/\b\d+[,.]\d{2}\b/)) {
                 e.preventDefault();
                 parseBetText(text);
               }
            });
          }
        }
      });
      
      } catch (e) {
        const bkSelect = document.getElementById('bet-bookmaker');
        if (bkSelect) {
          bkSelect.innerHTML = `<option value="">ERRO: ${e.message}</option>`;
        }
        console.error("BetTracker Error:", e);
      }
    });
  