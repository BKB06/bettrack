/**
 * BetTracker - Data Layer & App Logic
 * Uses localStorage for persistence.
 */

const DB_KEY = 'bettracker_db';

const defaultDb = {
  mercadoPago: 90.21,
  bookmakers: [
    { id: '1', name: 'Betano', color: '#ff3c3c', sportsBalance: 0.16, casinoBalance: 0.05 },
    { id: '2', name: 'Bet365', color: '#00e87a', sportsBalance: 0, casinoBalance: 0 }
  ],
  bets: [],
  cashflow: []
};

// ─── DB FUNCTIONS ──────────────────────────────────────────────

function loadDb() {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : { ...defaultDb };
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  updateGlobalUI();
}

// ─── UTILS ─────────────────────────────────────────────────────

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// ─── BUSINESS LOGIC ────────────────────────────────────────────

function calculateExposed(db) {
  return db.bets
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => sum + Number(b.stake), 0);
}

function calculatePatrimonio(db) {
  const mp = Number(db.mercadoPago) || 0;
  const sports = db.bookmakers.reduce((sum, bk) => sum + Number(bk.sportsBalance), 0);
  const casino = db.bookmakers.reduce((sum, bk) => sum + Number(bk.casinoBalance), 0);
  const exposed = calculateExposed(db);
  return mp + sports + casino + exposed;
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

  const db = loadDb();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let monthStaked = 0;
  let monthPnL = 0;

  // Group bets by date
  const dailyProfit = {};
  db.bets.filter(b => b.status !== 'pending').forEach(b => {
    const bDate = new Date(b.date);
    if (bDate.getFullYear() === year && bDate.getMonth() === month) {
      monthStaked += b.stake;
      monthPnL += b.profit;
    }
    const key = b.date;
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
    grid.innerHTML += `<div class="cal-cell" style="border-color:transparent; padding:2px; min-height:24px;"></div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    let cellClass = 'cal-cell';
    let style = 'padding:2px; min-height:24px; font-size:10px; display:flex; flex-direction:column; align-items:center; justify-content:center;';

    if (dateStr === todayStr) cellClass += ' cal-cell--today';

    if (dailyProfit[dateStr] !== undefined) {
      const pnl = dailyProfit[dateStr];
      if (pnl > 0) {
        cellClass += ' cal-cell--win';
      } else if (pnl < 0) {
        cellClass += ' cal-cell--lose';
      }
    }
    grid.innerHTML += `<div class="${cellClass}" style="${style}">${i}</div>`;
  }
}

// ─── GLOBAL UI UPDATES ─────────────────────────────────────────

function updateGlobalUI() {
  const db = loadDb();
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

  // Right Panel: Abertas List
  const rightPanelEl = document.getElementById('global-right-panel');
  if (rightPanelEl) {
    const pendingBets = db.bets.filter(b => b.status === 'pending');
    let abertasHtml = '';
    pendingBets.slice(0, 5).forEach(b => {
      abertasHtml += `
        <div style="font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
          <div style="color:var(--muted); margin-bottom:2px;">${b.category} • Odd ${b.odd}</div>
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

    // Right Panel: Casas Summary
    let casasHtml = db.bookmakers.map(bk => {
      const totalBk = Number(bk.sportsBalance) + Number(bk.casinoBalance);
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; margin-bottom:6px;">
          <span style="display:flex; align-items:center; gap:6px;">
            <div style="width:8px; height:8px; border-radius:50%; background:${bk.color}"></div>
            ${bk.name}
          </span>
          <span style="font-family:var(--mono); color:var(--green)">${formatMoney(totalBk)}</span>
        </div>
      `;
    }).join('');

    const exp = calculateExposed(db);

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

      <div style="margin-bottom: 32px;">
        <h3 style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin-bottom: 16px;">Casas</h3>
        ${casasHtml}
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border);">
          <span style="display:flex; align-items:center; gap:6px;">
            <div style="width:8px; height:8px; border-radius:50%; background:var(--blue)"></div>
            Mercado Pago
          </span>
          <span style="font-family:var(--mono); color:var(--blue)">${formatMoney(db.mercadoPago)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-top:8px; color:var(--gold);">
          <span>⚡ Exposto:</span>
          <span style="font-family:var(--mono);">${formatMoney(exp)}</span>
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
}

// ─── NAVIGATION (SHELL) ────────────────────────────────────────

function renderShell() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const db = loadDb();
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
    let bkListHtml = db.bookmakers.map(bk => {
      const total = Number(bk.sportsBalance) + Number(bk.casinoBalance);
      return `<div class="sidebar-bk-row"><span class="name"><div style="width:8px; height:8px; border-radius:50%; background:${bk.color}"></div> ${bk.name}</span> <span class="value">${formatMoney(total)}</span></div>`;
    }).join('');

    sidebarEl.innerHTML = `
      <nav class="desktop-nav">
        <a href="index.html" class="desktop-nav-item desktop-nav-item--primary">+ Nova Aposta</a>
        <a href="historico.html" class="desktop-nav-item ${currentPage === 'historico.html' ? 'active' : ''}">≡ Histórico</a>
        <a href="fundos.html" class="desktop-nav-item ${currentPage === 'fundos.html' ? 'active' : ''}">⇄ Transferência</a>
        <a href="casas.html" class="desktop-nav-item ${currentPage === 'casas.html' ? 'active' : ''}">◈ Casas</a>
        <a href="relatorio.html" class="desktop-nav-item ${currentPage === 'relatorio.html' ? 'active' : ''}">↗ Relatório</a>
      </nav>

      <div class="desktop-sidebar-section">
        <h3>Saldo Por Casa</h3>
        ${bkListHtml}
      </div>

      <div class="desktop-sidebar-section">
        <h3>Banco</h3>
        <div class="sidebar-bk-row"><span class="name"><div style="width:8px; height:8px; border-radius:50%; background:var(--blue)"></div> Mercado Pago</span> <span class="value" style="color:var(--blue)">${formatMoney(db.mercadoPago)}</span></div>
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
    `;
  }
  
  // 4. STATS ROW (Desktop Main Top)
  const appMain = document.getElementById('app-main');
  if (appMain) {
    const statsRow = document.createElement('div');
    statsRow.className = 'stats-row';
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
  renderGlobalCalendar();
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  renderShell();
});
