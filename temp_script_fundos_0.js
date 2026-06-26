
    document.addEventListener('DOMContentLoaded', () => {
      let db = loadDb();
      let currentType = 'withdraw';
      
      const mpBalance = document.getElementById('mp-balance');
      const tabs = document.querySelectorAll('.transfer-tab');
      const form = document.getElementById('cashflow-form');
      const directionLabel = document.getElementById('form-direction');
      const fieldBookTo = document.getElementById('field-book-to');
      const inputBookFrom = document.getElementById('input-book-from');
      const inputBookTo = document.getElementById('input-book-to');
      const labelBookFrom = document.getElementById('label-book-from');
      const btnSubmit = document.getElementById('btn-submit');
      const pageTitle = document.getElementById('page-title');

      // Initialize defaults
      document.getElementById('input-date').valueAsDate = new Date();
      updateMpDisplay();

      // Mercado Pago editing
      window.editMpBalance = () => {
        const novoSaldo = prompt("Digite o novo saldo do Mercado Pago:", db.mercadoPago.toFixed(2));
        if (novoSaldo !== null) {
          const parsed = parseFloat(novoSaldo.replace(',', '.'));
          if (!isNaN(parsed)) {
            db.mercadoPago = parsed;
            saveDb(db);
            updateMpDisplay();
            updateGlobalUI();
          }
        }
      };

      function updateMpDisplay() {
        document.getElementById('mp-balance-display').textContent = formatMoney(db.mercadoPago);
      }

      function populateSelects() {
        if (!db || !Array.isArray(db.bookmakers) || db.bookmakers.length === 0) {
          inputBookFrom.innerHTML = '<option value="">Nenhuma casa cadastrada</option>';
          inputBookTo.innerHTML = '<option value="">Nenhuma casa cadastrada</option>';
          return;
        }

        const options = db.bookmakers.map(bk => {
          if (!bk) return '';
          const totalBalance = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0)) || 0;
          return `<option value="${bk.id || ''}">${bk.name || 'Desconhecida'} (R$ ${totalBalance.toFixed(2)})</option>`;
        }).join('');
        

        const prevFrom = inputBookFrom.value;
        const prevTo = inputBookTo.value;

        inputBookFrom.innerHTML = options;
        inputBookTo.innerHTML = options;

        if (prevFrom) inputBookFrom.value = prevFrom;
        if (prevTo) inputBookTo.value = prevTo;
      }

      function updateMode() {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`.transfer-tab[data-type="${currentType}"]`).classList.add('active');

        if (currentType === 'deposit') {
          directionLabel.textContent = 'Mercado Pago → Casa de Apostas';
          labelBookFrom.textContent = 'Casa de Destino';
          fieldBookTo.style.display = 'none';
          inputBookTo.removeAttribute('required');
          btnSubmit.textContent = 'Registrar Depósito';
        } else if (currentType === 'withdraw') {
          directionLabel.textContent = 'Casa de Apostas → Mercado Pago';
          labelBookFrom.textContent = 'Casa de Origem';
          fieldBookTo.style.display = 'none';
          inputBookTo.removeAttribute('required');
          btnSubmit.textContent = 'Registrar Saque';
        } else {
          directionLabel.textContent = 'Entre Casas de Aposta';
          labelBookFrom.textContent = 'Casa de Origem';
          fieldBookTo.style.display = 'block';
          inputBookTo.setAttribute('required', 'true');
          btnSubmit.textContent = 'Registrar Transferência';
        }
      }

      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          currentType = e.currentTarget.dataset.type;
          updateMode();
        });
      });

      function renderHistory() {
        const container = document.getElementById('cashflow-list');
        if (!db.cashflow || db.cashflow.length === 0) {
          container.innerHTML = '<p class="empty-state">Nenhuma movimentação</p>';
          return;
        }

        const sorted = [...db.cashflow].sort((a,b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = sorted.map(c => {
          let label, typeClass, sign, fromTo;
          const bkFrom = db.bookmakers.find(b => b.id === c.fromBook)?.name || 'Desconhecida';
          
          if (c.type === 'deposit') {
            label = 'Depósito';
            typeClass = 'transfer-item--deposit';
            sign = '+';
            fromTo = `Para ${bkFrom}`;
          } else if (c.type === 'withdraw') {
            label = 'Saque';
            typeClass = 'transfer-item--withdrawal';
            sign = '-';
            fromTo = `De ${bkFrom}`;
          } else {
            const bkTo = db.bookmakers.find(b => b.id === c.toBook)?.name || 'Desconhecida';
            label = 'Transferência';
            typeClass = 'transfer-item--transfer';
            sign = '';
            fromTo = `${bkFrom} → ${bkTo}`;
          }

          return `
            <div class="transfer-item ${typeClass}">
              <div>
                <div class="transfer-item__label">${label}</div>
                <div class="transfer-item__meta">${c.date.split('-').reverse().join('/')} • ${fromTo}</div>
                ${c.note ? `<div class="transfer-item__meta" style="color:var(--text)">${c.note}</div>` : ''}
              </div>
              <div class="transfer-item__amount">${sign}${formatMoney(c.amount)}</div>
            </div>
          `;
        }).join('');
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let amountStr = document.getElementById('input-amount').value;
        const amount = parseFloat(amountStr.replace(',', '.'));
        const bkFromId = inputBookFrom.value;
        const bkToId = inputBookTo.value;
        
        if (amount <= 0) return;

        const idxFrom = db.bookmakers.findIndex(b => b.id === bkFromId);
        const idxTo = db.bookmakers.findIndex(b => b.id === bkToId);

        if (currentType === 'deposit') {
          if (parseFloat(db.mercadoPago.toFixed(2)) < amount) {
            alert('Saldo do Mercado Pago insuficiente.');
            return;
          }
          db.mercadoPago -= amount;
          db.mercadoPago = Math.max(0, parseFloat(db.mercadoPago.toFixed(2)));
          db.bookmakers[idxFrom].balance += amount;
          db.bookmakers[idxFrom].balance = parseFloat(db.bookmakers[idxFrom].balance.toFixed(2));
        } else if (currentType === 'withdraw') {
          if (parseFloat(db.bookmakers[idxFrom].balance.toFixed(2)) < amount) {
            alert('Saldo na Casa de Apostas insuficiente.');
            return;
          }
          db.bookmakers[idxFrom].balance -= amount;
          db.bookmakers[idxFrom].balance = Math.max(0, parseFloat(db.bookmakers[idxFrom].balance.toFixed(2)));
          db.mercadoPago += amount;
          db.mercadoPago = parseFloat(db.mercadoPago.toFixed(2));
        } else if (currentType === 'transfer') {
          if (bkFromId === bkToId) {
            alert('Origem e destino devem ser diferentes.');
            return;
          }
          if (parseFloat(db.bookmakers[idxFrom].balance.toFixed(2)) < amount) {
            alert('Saldo na Casa de Origem insuficiente.');
            return;
          }
          db.bookmakers[idxFrom].balance -= amount;
          db.bookmakers[idxFrom].balance = Math.max(0, parseFloat(db.bookmakers[idxFrom].balance.toFixed(2)));
          db.bookmakers[idxTo].balance += amount;
          db.bookmakers[idxTo].balance = parseFloat(db.bookmakers[idxTo].balance.toFixed(2));
        }

        // Add history record
        db.cashflow = db.cashflow || [];
        db.cashflow.push({
          id: generateId(),
          date: document.getElementById('input-date').value,
          type: currentType,
          amount: amount,
          fromBook: bkFromId,
          toBook: currentType === 'transfer' ? bkToId : null,
          note: document.getElementById('input-note').value
        });

        saveDb(db);
        alert('Movimentação salva com sucesso!');
        form.reset();
        document.getElementById('input-date').valueAsDate = new Date();
        updateMpDisplay();
        updateGlobalUI();
        
        populateSelects();
        renderHistory();
      });

      // Init
      populateSelects();
      updateMode();
      renderHistory();
    });
  