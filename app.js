/**
 * BetTracker - Data Layer & App Logic
 * Uses localStorage for persistence.
 */

const DB_KEY = 'bettracker_db';

const defaultDb = {
  mercadoPago: 90.21,
  bookmakers: [
    { id: '1', name: 'Betano', color: '#ff3c3c', balance: 0.21 },
    { id: '2', name: 'Bet365', color: '#00e87a', balance: 0 }
  ],
  bets: [],
  cashflow: [],
  dailyLogins: { date: '', logins: {} }
};

// ─── DB FUNCTIONS ──────────────────────────────────────────────

async function loadDb() {
  await window.authStateReady;
  if (!window.currentUser) {
    return { ...defaultDb };
  }

  const userId = window.currentUser.uid;
  const docRef = fDb.collection('users').doc(userId);
  
  try {
    const docSnap = await docRef.get();
    let parsed = {};
    
    if (docSnap.exists) {
      parsed = docSnap.data();
    } else {
      // Automatic Migration from localStorage
      const localData = localStorage.getItem('bettracker_db');
      if (localData) {
        try {
          parsed = JSON.parse(localData);
          console.log("Migrated data from localStorage to Firestore!");
        } catch(e) {
          parsed = { ...defaultDb };
        }
      } else {
        parsed = { ...defaultDb };
      }
      await docRef.set(parsed);
    }


    let db = { ...defaultDb, ...parsed };
    db.mercadoPago = Number(db.mercadoPago) || 0;
    
    if (!db.dailyLogins) db.dailyLogins = { date: '', logins: {} };
    
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if (db.dailyLogins.date !== localToday) {
      db.dailyLogins = { date: localToday, logins: {} };
    }

    if (!Array.isArray(db.bookmakers)) db.bookmakers = [];
    db.bookmakers = db.bookmakers.filter(bk => bk !== null && bk !== undefined);
    
    if (!Array.isArray(db.bets)) db.bets = [];
    db.bets = db.bets.filter(b => b !== null && b !== undefined);
    
    if (!Array.isArray(db.cashflow)) db.cashflow = [];
    db.cashflow = db.cashflow.filter(c => c !== null && c !== undefined);

    if (db.bookmakers.length > 0) {
      db.bookmakers.forEach(bk => {
        if (bk.sportsBalance !== undefined || bk.casinoBalance !== undefined) {
          bk.balance = (Number(bk.sportsBalance) || 0) + (Number(bk.casinoBalance) || 0);
          delete bk.sportsBalance;
          delete bk.casinoBalance;
        }
        if (bk.balance !== undefined) {
          bk.balance = Number(bk.balance) || 0;
        } else {
          bk.balance = 0;
        }
      });
    }

    if (db.bets) {
      db.bets.forEach(b => {
        if (b.date && b.date.includes('/')) {
          const parts = b.date.split('/');
          if (parts.length === 3) {
            b.date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      });
    }
    
    // Store globally for sync reads during UI rendering
    window._currentDb = db;
    renderShell();
    return db;
  } catch (error) {
    console.error("Error loading DB from Firestore:", error);
    alert("Erro ao carregar os dados. Verifique a internet e tente novamente.");
    return { ...defaultDb };
  }
}

async function saveDb(db) {
  window._currentDb = db;
  if (!window.currentUser) return;
  const userId = window.currentUser.uid;
  const docRef = fDb.collection('users').doc(userId);
  
  try {
    await docRef.set(db);
    updateGlobalUI();
  } catch (error) {
    console.error("Error saving DB to Firestore:", error);
    alert("Erro ao salvar os dados. " + error.message);
  }
}

// ─── UTILS ─────────────────────────────────────────────────────

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getDefaultBookmakerUrl(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('betano')) return 'https://br.betano.com';
  if (lowerName.includes('bet365')) return 'https://www.bet365.com';
  if (lowerName.includes('pinnacle')) return 'https://www.pinnacle.com';
  if (lowerName.includes('kto')) return 'https://www.kto.com';
  if (lowerName.includes('betfair')) return 'https://www.betfair.com';
  if (lowerName.includes('sportingbet')) return 'https://sports.sportingbet.com';
  if (lowerName.includes('1xbet')) return 'https://1xbet.com';
  if (lowerName.includes('estrelabet') || lowerName.includes('estrela bet')) return 'https://estrelabet.com';
  return '';
}

// ─── BUSINESS LOGIC ────────────────────────────────────────────

function calculateExposed(db) {
  return db.bets
    .filter(b => b.status === 'pending' && !b.isFreebet)
    .reduce((sum, b) => sum + Number(b.stake), 0);
}

function calculatePatrimonio(db) {
  const mp = Number(db.mercadoPago) || 0;
  const bkTotal = db.bookmakers.reduce((sum, bk) => sum + Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0)), 0);
  const exposed = calculateExposed(db);
  return mp + bkTotal + exposed;
}

function getTodayLogins(db) {
  return db.dailyLogins.logins;
}

function markLogin(db, bookmakerId) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  db.dailyLogins.logins[bookmakerId] = time;
}

function unmarkLogin(db, bookmakerId) {
  delete db.dailyLogins.logins[bookmakerId];
}

// ─── GLOBAL STATS CALCULATIONS ─────────────────────────────────

function calculateStats(db) {
  const settled = db.bets.filter(b => b.status === 'won' || b.status === 'lost');
  const won = settled.filter(b => b.status === 'won').length;
  const lost = settled.filter(b => b.status === 'lost').length;
  const totalSettled = won + lost;
  
  const acerto = totalSettled > 0 ? ((won / totalSettled) * 100).toFixed(0) + '%' : '0%';
  
  const pending = db.bets.filter(b => b.status === 'pending');
  const abertasCount = pending.length;
  
  const lucro = settled.reduce((sum, b) => sum + (Number(b.profit) || 0), 0);
  const pnlClass = lucro >= 0 ? 'green' : 'red';
  const pnlFormatted = (lucro >= 0 ? '+' : '') + formatMoney(lucro);
  
  const totalStake = settled.reduce((sum, b) => sum + Number(b.stake), 0);
  const roi = totalStake > 0 ? ((lucro / totalStake) * 100).toFixed(1) + '%' : '0.0%';
  const roiClass = lucro >= 0 ? 'green' : 'red';

  return { acerto, abertasCount, lucro, pnlFormatted, pnlClass, roi, roiClass, totalStake };
}

// ─── GLOBAL CALENDAR LOGIC ─────────────────────────────────────
let globalCurrentDate = new Date();

window.prevMonth = function() {
  globalCurrentDate.setMonth(globalCurrentDate.getMonth() - 1);
  renderGlobalCalendar();
};

window.nextMonth = function() {
  globalCurrentDate.setMonth(globalCurrentDate.getMonth() + 1);
  renderGlobalCalendar();
};

function renderGlobalCalendar() {
  const year = globalCurrentDate.getFullYear();
  const month = globalCurrentDate.getMonth();
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  const monthNameEl = document.getElementById('global-cal-month-name');
  if(monthNameEl) monthNameEl.textContent = `${monthNames[month]} ${year}`;

  const grid = document.getElementById('global-cal-grid');
  if(!grid) return;
  grid.innerHTML = '';

  const db = window._currentDb;
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let monthStaked = 0;
  let monthPnL = 0;

  // Group bets by date
  const dailyProfit = {};
  db.bets.filter(b => b.status !== 'pending').forEach(b => {
    let dStr = b.date ? b.date.trim() : '';
    if (dStr.includes('/')) {
       const p = dStr.split('/');
       if (p.length === 3) dStr = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
    if (!dStr) return;

    // For year and month, it's safer to just split the string
    const bYear = parseInt(dStr.split('-')[0]);
    const bMonth = parseInt(dStr.split('-')[1]) - 1;
    
    if (bYear === year && bMonth === month) {
      monthStaked += b.stake;
      monthPnL += b.profit;
    }
    const key = dStr;
    if (!dailyProfit[key]) dailyProfit[key] = 0;
    dailyProfit[key] += b.profit;
  });

  const infoEl = document.getElementById('global-cal-month-info');
  if(infoEl) {
    const pnlStr = monthPnL >= 0 ? `+${formatMoney(monthPnL)}` : `-${formatMoney(Math.abs(monthPnL))}`;
    const pnlColor = monthPnL >= 0 ? 'c-green' : 'c-red';
    infoEl.innerHTML = `Apostado: <span class="c-gold">${formatMoney(monthStaked)}</span> · PnL: <span class="${pnlColor}">${pnlStr}</span>`;
  }

  for (let x = 0; x < firstDayIndex; x++) {
    grid.innerHTML += `<div class="cal-cell" style="border-color:transparent;"></div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    let cellClass = 'cal-cell';
    let pnlHtml = '';

    if (dateStr === todayStr) cellClass += ' cal-cell--today';

    if (dailyProfit[dateStr] !== undefined) {
      const pnl = dailyProfit[dateStr];
      if (pnl > 0) {
        cellClass += ' cal-cell--win';
        pnlHtml = `<div class="cal-cell__pnl">+${pnl.toFixed(0)}</div>`;
      } else if (pnl < 0) {
        cellClass += ' cal-cell--lose';
        pnlHtml = `<div class="cal-cell__pnl">${pnl.toFixed(0)}</div>`;
      } else {
        pnlHtml = `<div class="cal-cell__pnl" style="color:var(--muted)">0</div>`;
      }
    }
    const hasData = dailyProfit[dateStr] !== undefined;
    const isHistorico = window.location.pathname.includes('historico');
    const clickHandler = hasData
      ? (isHistorico
          ? `onclick="filterByDate('${dateStr}')"`
          : `onclick="location.href='historico.html?date=${dateStr}'"`)
      : '';
    const cellCursor = hasData ? 'cursor:pointer;' : 'cursor:default;';
    
    // Check if this date is currently selected in historico
    if (window.selectedDateFilter === dateStr) {
      cellClass += ' cal-cell--selected';
    }

    grid.innerHTML += `<div class="${cellClass}" style="${cellCursor}" ${clickHandler}>${i}${pnlHtml}</div>`;
  }
}

// ─── GLOBAL UI UPDATES ─────────────────────────────────────────

function updateGlobalUI() {
  const db = window._currentDb;
  const patrimonio = calculatePatrimonio(db);
  const stats = calculateStats(db);
  
  // Update Header Patrimônio (Mobile)
  const patEl = document.getElementById('global-patrimonio');
  if (patEl) {
    patEl.textContent = formatMoney(patrimonio);
  }
  
  // Update Topbar Patrimônio (Desktop)
  const dPatEl = document.getElementById('desktop-patrimonio');
  if (dPatEl) {
    dPatEl.textContent = formatMoney(patrimonio);
  }

  // Update Desktop Sidebar (Saldo por Casa)
  const sidebarEl = document.getElementById('global-sidebar');
  if (sidebarEl) {
    let bkListHtml = db.bookmakers
      .filter(bk => {
        const total = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0));
        return total >= 0.01;
      })
      .map(bk => {
      const total = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0));
      return `<div class="sidebar-bk-row"><span class="name"><div style="width:8px; height:8px; border-radius:50%; background:${bk.color}"></div> ${bk.name}</span> <span class="value">${formatMoney(total)}</span></div>`;
    }).join('');

    const sidebarSection = sidebarEl.querySelector('.desktop-sidebar-section:nth-of-type(1)');
    if (sidebarSection) {
      sidebarSection.innerHTML = `
        <h3>Saldo Por Casa</h3>
        ${bkListHtml}
        
      <div class="sidebar-bk-row" style="margin-top: 16px; cursor: pointer;" onclick="logout()">
        <span class="name" style="color: var(--red);">Sair (Logout)</span>
      </div>

      `;
    }
    
    // Also update Banco and Exposto values dynamically
    const bVal = document.getElementById('sidebar-banco-val');
    if (bVal) bVal.textContent = formatMoney(db.mercadoPago);
    const eVal = document.getElementById('sidebar-exposto-val');
    if (eVal) eVal.textContent = formatMoney(calculateExposed(db));
  }

  // Right Panel: Abertas List
  const rightPanelEl = document.getElementById('global-right-panel');
  if (rightPanelEl) {
    const pendingBets = db.bets.filter(b => b.status === 'pending');
    let abertasHtml = '';
    pendingBets.slice(0, 5).forEach(b => {
      const freebetMarker = b.isFreebet ? ' <span style="color:#ffb800;">(Freebet)</span>' : '';
      abertasHtml += `
        <div style="font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
          <div style="color:var(--muted); margin-bottom:2px;">${b.category} • Odd ${b.odd}${freebetMarker}</div>
          <div style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.event}</div>
        </div>
      `;
    });
    if (pendingBets.length > 5) {
      abertasHtml += `<div style="font-size: 12px; color:var(--muted); text-align:center;">+ ${pendingBets.length - 5} mais no Histórico</div>`;
    }
    if (pendingBets.length === 0) {
      abertasHtml = `<div style="font-size: 13px; color:var(--muted);">Nenhuma aposta em aberto.</div>`;
    }

    rightPanelEl.innerHTML = `
      <div style="margin-bottom: 24px;">
        <div class="cal-nav" style="margin-bottom: 8px;">
          <button class="btn btn--icon" onclick="window.prevMonth()" style="border-radius:var(--radius-lg); width:24px; height:24px; font-size:12px; padding:0;">‹</button>
          <div class="cal-nav__center">
            <div class="cal-nav__month" id="global-cal-month-name" style="font-size:16px; font-weight:700;">Mai 2026</div>
            <div class="cal-nav__info" id="global-cal-month-info" style="white-space:nowrap;">Apostado: <span class="c-gold">R$ 0,00</span> · PnL: <span class="c-green">+R$ 0,00</span></div>
          </div>
          <button class="btn btn--icon" onclick="window.nextMonth()" style="border-radius:var(--radius-lg); width:24px; height:24px; font-size:12px; padding:0;">›</button>
        </div>
        <div class="cal-headers" style="font-size:10px; margin-bottom:4px;">
          <div class="cal-header-cell">D</div>
          <div class="cal-header-cell">S</div>
          <div class="cal-header-cell">T</div>
          <div class="cal-header-cell">Q</div>
          <div class="cal-header-cell">Q</div>
          <div class="cal-header-cell">S</div>
          <div class="cal-header-cell">S</div>
        </div>
        <div class="cal-grid" id="global-cal-grid" style="gap:2px;">
          <!-- JS fills this -->
        </div>
      </div>

      <div class="right-stats-grid">
        <div class="right-stats-card">
          <div class="label">ROI</div>
          <div class="value" style="color:var(--${stats.roiClass})">${stats.roi}</div>
        </div>
        <div class="right-stats-card">
          <div class="label">Acerto</div>
          <div class="value">${stats.acerto}</div>
        </div>
        <div class="right-stats-card">
          <div class="label">Lucro</div>
          <div class="value" style="color:var(--${stats.pnlClass})">${stats.pnlFormatted}</div>
        </div>
        <div class="right-stats-card">
          <div class="label">Apostas</div>
          <div class="value">${db.bets.filter(b => b.status === 'won' || b.status === 'lost').length}/${db.bets.length}</div>
        </div>
      </div>

      <div style="margin-bottom: 32px;">
        <h3 style="font-size: 12px; color: var(--gold); text-transform: uppercase; margin-bottom: 16px; display:flex; align-items:center; gap:6px;">
          ⌛ Abertas (${stats.abertasCount})
        </h3>
        ${abertasHtml}
      </div>
    `;
  }

  // Re-render calendar after right panel rebuild
  renderGlobalCalendar();
}

// ─── NAVIGATION (SHELL) ────────────────────────────────────────

function renderShell() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const db = window._currentDb;
  const stats = calculateStats(db);
  
  // 1. TOPBAR (Mobile Header + Desktop Topbar)
  const topbarEl = document.getElementById('global-topbar');
  if (topbarEl) {
    topbarEl.innerHTML = `
      <!-- Mobile Header -->
      <header class="mobile-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="logo-icon">🎯</div>
          <div>
            <div class="logo-name">BetTracker</div>
            <div class="logo-sub">Gerenciador de Apostas</div>
          </div>
        </div>
        <div>
          <div class="mobile-header__patrimonio-label">Patrimônio</div>
          <div class="mobile-header__patrimonio-value" id="global-patrimonio">R$ 0,00</div>
        </div>
      </header>

      <!-- Desktop Topbar -->
      <div class="desktop-topbar">
        <div class="topbar-logo"><span style="color:var(--red)">🎯</span> BetTracker</div>
        <div class="topbar-pills">
          <div class="topbar-pill"><span class="label">ROI</span><span class="value ${stats.roiClass}">${stats.roi}</span></div>
          <div class="topbar-pill"><span class="label">Acerto</span><span class="value">${stats.acerto}</span></div>
          <div class="topbar-pill"><span class="label">Abertas</span><span class="value" style="color:var(--gold)">${stats.abertasCount}</span></div>
          <div class="topbar-pill"><span class="label">PnL</span><span class="value ${stats.pnlClass}">${stats.pnlFormatted}</span></div>
        </div>
        <div class="topbar-patrimonio">
          <span class="label">Patrimônio</span>
          <span class="value" id="desktop-patrimonio">R$ 0,00</span>
        </div>
      </div>
    `;
  }

  // 2. DESKTOP SIDEBAR
  const sidebarEl = document.getElementById('global-sidebar');
  if (sidebarEl) {
    let bkListHtml = db.bookmakers
      .filter(bk => {
        const total = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0));
        return total >= 0.01;
      })
      .map(bk => {
      const total = Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0));
      return `<div class="sidebar-bk-row"><span class="name"><div style="width:8px; height:8px; border-radius:50%; background:${bk.color}"></div> ${bk.name}</span> <span class="value">${formatMoney(total)}</span></div>`;
    }).join('');

    sidebarEl.innerHTML = `
      <nav class="desktop-nav">
        <a href="index.html" class="desktop-nav-item desktop-nav-item--primary">+ Nova Aposta</a>
        <a href="historico.html" class="desktop-nav-item ${currentPage === 'historico.html' ? 'active' : ''}">≡ Histórico</a>
        <a href="fundos.html" class="desktop-nav-item ${currentPage === 'fundos.html' ? 'active' : ''}">⇄ Transferência</a>
        <a href="casas.html" class="desktop-nav-item ${currentPage === 'casas.html' ? 'active' : ''}">◈ Casas</a>
        <a href="logins.html" class="desktop-nav-item ${currentPage === 'logins.html' ? 'active' : ''}">✓ Logins</a>
        <a href="relatorio.html" class="desktop-nav-item ${currentPage === 'relatorio.html' ? 'active' : ''}">↗ Relatório</a>
      </nav>

      <div class="desktop-sidebar-section">
        <h3>Saldo Por Casa</h3>
        ${bkListHtml}
      </div>

      <div class="desktop-sidebar-section">
        <h3>Banco</h3>
        <div class="sidebar-bk-row"><span class="name"><div style="width:8px; height:8px; border-radius:50%; background:var(--blue)"></div> Mercado Pago</span> <span class="value" id="sidebar-banco-val" style="color:var(--blue)">${formatMoney(db.mercadoPago)}</span></div>
      </div>

      <div class="desktop-sidebar-section">
        <h3>Exposto</h3>
        <div class="sidebar-bk-row"><span class="name">⚡ Exposto</span> <span class="value" id="sidebar-exposto-val" style="color:var(--gold)">${formatMoney(calculateExposed(db))}</span></div>
      </div>

      <div class="desktop-sidebar-section" style="margin-top: 32px; cursor: pointer;" onclick="logout()">
        <h3 style="color: var(--red);">Sair (Logout)</h3>
      </div>
    `;
  }

  // 3. MOBILE NAV
  const mobileNavEl = document.getElementById('global-mobile-nav');
  if (mobileNavEl) {
    mobileNavEl.innerHTML = `
      <button class="mobile-nav-item ${currentPage === 'index.html' ? 'active' : ''}" onclick="location.href='index.html'">
        <span class="mobile-nav-item__icon">+</span>
        <span class="mobile-nav-item__text">Apostar</span>
      </button>
      <button class="mobile-nav-item ${currentPage === 'historico.html' ? 'active' : ''}" onclick="location.href='historico.html'">
        <span class="mobile-nav-item__icon">≡</span>
        <span class="mobile-nav-item__text">Histórico</span>
      </button>
      <button class="mobile-nav-item ${currentPage === 'fundos.html' ? 'active' : ''}" onclick="location.href='fundos.html'">
        <span class="mobile-nav-item__icon">⇄</span>
        <span class="mobile-nav-item__text">Fundos</span>
      </button>
      <button class="mobile-nav-item ${currentPage === 'casas.html' ? 'active' : ''}" onclick="location.href='casas.html'">
        <span class="mobile-nav-item__icon">◈</span>
        <span class="mobile-nav-item__text">Casas</span>
      </button>
      <button class="mobile-nav-item ${currentPage === 'relatorio.html' ? 'active' : ''}" onclick="location.href='relatorio.html'">
        <span class="mobile-nav-item__icon">↗</span>
        <span class="mobile-nav-item__text">Relatório</span>
      </button>
      <button class="mobile-nav-item ${currentPage === 'logins.html' ? 'active' : ''}" onclick="location.href='logins.html'">
        <span class="mobile-nav-item__icon">✓</span>
        <span class="mobile-nav-item__text">Logins</span>
      </button>
    `;
  }
  
  // 4. STATS ROW (Desktop Main Top)
  const appMain = document.getElementById('app-main');
  if (appMain) {
    let statsRow = appMain.querySelector('.stats-row');
    if (!statsRow) {
      statsRow = document.createElement('div');
      statsRow.className = 'stats-row';
      // Already inserted when created
    }
    statsRow.innerHTML = `
      <div class="card" style="padding: 12px;">
        <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Apostado</div>
        <div style="font-size:18px; font-weight:700; font-family:var(--mono);">${formatMoney(stats.totalStake)}</div>
      </div>
      <div class="card" style="padding: 12px;">
        <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Lucro</div>
        <div style="font-size:18px; font-weight:700; font-family:var(--mono); color:var(--${stats.pnlClass})">${stats.pnlFormatted}</div>
      </div>
      <div class="card" style="padding: 12px;">
        <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">ROI</div>
        <div style="font-size:18px; font-weight:700; font-family:var(--mono); color:var(--${stats.roiClass})">${stats.roi}</div>
      </div>
      <div class="card" style="padding: 12px;">
        <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Acertos</div>
        <div style="font-size:18px; font-weight:700; font-family:var(--mono);">${stats.acerto}</div>
      </div>
      <div class="card" style="padding: 12px;">
        <div style="font-size:12px; color:var(--muted); text-transform:uppercase;">Exposto</div>
        <div style="font-size:18px; font-weight:700; font-family:var(--mono); color:var(--gold);">${formatMoney(calculateExposed(db))}</div>
      </div>
    `;
    appMain.insertBefore(statsRow, appMain.firstChild);
  }

  updateGlobalUI();
}

// Initialize on DOM load


// Update automatically if user changes data in another tab
window.addEventListener('storage', (e) => {
  if (e.key === 'bettracker_db') {
    renderShell(); // Re-render the shell to reflect changes instantly
    
    // If we're on the index page, ensure the dropdown reflects new balances
    const bkSelect = document.getElementById('bet-bookmaker');
    if (bkSelect) {
      const db = window._currentDb;
      const currentSelected = bkSelect.value;
      bkSelect.innerHTML = '';
      db.bookmakers.forEach(bk => {
        const opt = document.createElement('option');
        if (bk) {
          opt.value = bk.id;
          opt.textContent = `${bk.name} (Saldo: R$ ${Number(bk.balance !== undefined ? bk.balance : (bk.sportsBalance || 0)).toFixed(2)})`;
        }
        bkSelect.appendChild(opt);
      });
      if (currentSelected) bkSelect.value = currentSelected;
      
      // Update form feedback just in case the balance dropped below the typed stake
      if (typeof window.updateFeedback === 'function') {
        window.updateFeedback();
      }
    }
  }
});
