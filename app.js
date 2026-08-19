/**
 * BetTrack — integração com Firebase e composição da interface compartilhada.
 *
 * Regras puras e normalização de dados vivem em `core.js`; este arquivo deve se
 * limitar a coordenar autenticação, persistência e DOM.
 */

if (!window.BetTrackCore) {
  throw new Error('core.js precisa ser carregado antes de app.js.');
}

const {
  calculateBetReversalDebit,
  calculateBetSettlement,
  calculateExposed,
  calculatePatrimonio,
  calculateStats,
  createDefaultDb,
  escapeHtml,
  escapeJsString,
  formatMoney,
  generateId,
  getDefaultBookmakerUrl,
  getLocalDateKey,
  normalizeDate,
  normalizeDb,
  normalizeExternalUrl,
  roundMoney,
  sanitizeColor,
  toFiniteNumber
} = window.BetTrackCore;

const DB_KEY = 'bettracker_db';

// ─── DB FUNCTIONS ──────────────────────────────────────────────

async function loadDb() {
  await window.authStateReady;
  if (!window.currentUser) {
    return createDefaultDb();
  }

  const userId = window.currentUser.uid;
  const docRef = window.betTrackDb.collection('users').doc(userId);
  
  try {
    const docSnapshot = await docRef.get();
    let rawDb;
    
    if (docSnapshot.exists) {
      rawDb = docSnapshot.data();
    } else {
      // Migração única para usuários da antiga versão baseada em localStorage.
      const localData = localStorage.getItem(DB_KEY);
      if (localData) {
        try {
          rawDb = JSON.parse(localData);
        } catch (error) {
          console.warn('Os dados locais antigos não puderam ser migrados.', error);
          rawDb = createDefaultDb();
        }
      } else {
        rawDb = createDefaultDb();
      }
    }

    const db = normalizeDb(rawDb);

    if (!docSnapshot.exists) {
      await docRef.set(db);
    }
    
    // A interface compartilhada faz leituras síncronas deste snapshot normalizado.
    window._dbLoadFailed = false;
    window._currentDb = db;
    renderShell();
    return db;
  } catch (error) {
    console.error('Erro ao carregar dados do Firestore:', error);
    alert('Erro ao carregar os dados. Verifique a internet e tente novamente.');
    const fallbackDb = createDefaultDb();
    // Impede que o estado de contingência sobrescreva dados reais numa gravação posterior.
    window._dbLoadFailed = true;
    window._currentDb = fallbackDb;
    renderShell();
    return fallbackDb;
  }
}

async function saveDb(db) {
  if (!window.currentUser || window._dbLoadFailed) {
    const error = new Error('Não há uma sessão de dados válida para salvar.');
    alert('Os dados não foram salvos porque a versão atual não pôde ser carregada. Atualize a página e tente novamente.');
    throw error;
  }

  const normalizedDb = normalizeDb(db);
  const userId = window.currentUser.uid;
  const docRef = window.betTrackDb.collection('users').doc(userId);
  
  try {
    await docRef.set(normalizedDb);
    window._currentDb = normalizedDb;
    updateGlobalUI();
    return normalizedDb;
  } catch (error) {
    console.error('Erro ao salvar dados no Firestore:', error);
    alert('Erro ao salvar os dados. Tente novamente.');
    throw error;
  }
}

/** Registra um check-in preservando o valor anterior para permitir desfazer. */
function markLogin(db, bookmakerId, now = new Date()) {
  const bookmaker = db.bookmakers.find(bk => bk.id === bookmakerId);
  if (!bookmaker || db.dailyLogins.logins[bookmakerId]) return false;

  if (bookmaker.lastLoginBeforeUndo === undefined) {
    // `null` representa corretamente a ausência de valor no Firestore.
    bookmaker.lastLoginBeforeUndo = bookmaker.lastLogin ?? null;
  }

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  db.dailyLogins.logins[bookmakerId] = `${hours}:${minutes}`;
  bookmaker.lastLogin = now.toISOString();
  return true;
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

  // Consolida uma vez para manter o calendário linear mesmo com muitos registros.
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
      monthStaked += toFiniteNumber(b.stake);
      monthPnL += toFiniteNumber(b.profit);
    }
    const key = dStr;
    if (!dailyProfit[key]) dailyProfit[key] = 0;
    dailyProfit[key] += toFiniteNumber(b.profit);
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

  const todayStr = getLocalDateKey();
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
    // O filtro também é refletido no calendário da barra lateral do histórico.
    if (window.selectedDateFilter === dateStr) {
      cellClass += ' cal-cell--selected';
    }

    grid.innerHTML += hasData
      ? `<button type="button" class="${cellClass}" ${clickHandler} aria-label="Ver apostas de ${String(i).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}">${i}${pnlHtml}</button>`
      : `<div class="${cellClass}" aria-hidden="true">${i}${pnlHtml}</div>`;
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
      const color = sanitizeColor(bk.color);
      const name = escapeHtml(bk.name);
      return `<div class="sidebar-bk-row"><span class="name"><span class="status-dot-small" style="background:${color}"></span> ${name}</span> <span class="value">${formatMoney(total)}</span></div>`;
    }).join('');

    const sidebarSection = sidebarEl.querySelector('.desktop-sidebar-section:nth-of-type(1)');
    if (sidebarSection) {
      sidebarSection.innerHTML = `
        <h3>Saldo Por Casa</h3>
        ${bkListHtml}
        
      <button type="button" class="sidebar-bk-row sidebar-logout" onclick="logout()">
        <span class="name" style="color: var(--red);">Sair (Logout)</span>
      </button>

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
      const sport = escapeHtml(b.sport || 'Outros');
      const league = b.league ? ` · ${escapeHtml(b.league)}` : '';
      const event = escapeHtml(b.event || 'Evento sem descrição');
      abertasHtml += `
        <div style="font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
          <div style="color:var(--muted); margin-bottom:2px;">${sport}${league} • Odd ${toFiniteNumber(b.odd).toFixed(2)}${freebetMarker}</div>
          <div style="color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${event}</div>
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
          <button type="button" class="btn btn--icon" onclick="window.prevMonth()" aria-label="Mês anterior" style="border-radius:var(--radius-lg); width:24px; height:24px; font-size:12px; padding:0;">‹</button>
          <div class="cal-nav__center">
            <div class="cal-nav__month" id="global-cal-month-name" style="font-size:16px; font-weight:700;">Mai 2026</div>
            <div class="cal-nav__info" id="global-cal-month-info" style="white-space:nowrap;">Apostado: <span class="c-gold">R$ 0,00</span> · PnL: <span class="c-green">+R$ 0,00</span></div>
          </div>
          <button type="button" class="btn btn--icon" onclick="window.nextMonth()" aria-label="Próximo mês" style="border-radius:var(--radius-lg); width:24px; height:24px; font-size:12px; padding:0;">›</button>
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
      const color = sanitizeColor(bk.color);
      const name = escapeHtml(bk.name);
      return `<div class="sidebar-bk-row"><span class="name"><span class="status-dot-small" style="background:${color}"></span> ${name}</span> <span class="value">${formatMoney(total)}</span></div>`;
    }).join('');

    sidebarEl.innerHTML = `
      <nav class="desktop-nav" aria-label="Navegação principal">
        <a href="index.html" class="desktop-nav-item desktop-nav-item--primary" ${currentPage === 'index.html' ? 'aria-current="page"' : ''}>+ Nova Aposta</a>
        <a href="historico.html" class="desktop-nav-item ${currentPage === 'historico.html' ? 'active' : ''}" ${currentPage === 'historico.html' ? 'aria-current="page"' : ''}>≡ Histórico</a>
        <a href="fundos.html" class="desktop-nav-item ${currentPage === 'fundos.html' ? 'active' : ''}" ${currentPage === 'fundos.html' ? 'aria-current="page"' : ''}>⇄ Transferência</a>
        <a href="casas.html" class="desktop-nav-item ${currentPage === 'casas.html' ? 'active' : ''}" ${currentPage === 'casas.html' ? 'aria-current="page"' : ''}>◈ Casas</a>
        <a href="logins.html" class="desktop-nav-item ${currentPage === 'logins.html' ? 'active' : ''}" ${currentPage === 'logins.html' ? 'aria-current="page"' : ''}>✓ Logins</a>
        <a href="relatorio.html" class="desktop-nav-item ${currentPage === 'relatorio.html' ? 'active' : ''}" ${currentPage === 'relatorio.html' ? 'aria-current="page"' : ''}>↗ Relatório</a>
      </nav>

      <div class="desktop-sidebar-section">
        <h3>Saldo Por Casa</h3>
        ${bkListHtml}
      </div>

      <div class="desktop-sidebar-section">
        <h3>Banco</h3>
        <div class="sidebar-bk-row"><span class="name"><span class="status-dot-small" style="background:var(--blue)"></span> Mercado Pago</span> <span class="value" id="sidebar-banco-val" style="color:var(--blue)">${formatMoney(db.mercadoPago)}</span></div>
      </div>

      <div class="desktop-sidebar-section">
        <h3>Exposto</h3>
        <div class="sidebar-bk-row"><span class="name">⚡ Exposto</span> <span class="value" id="sidebar-exposto-val" style="color:var(--gold)">${formatMoney(calculateExposed(db))}</span></div>
      </div>

      <button type="button" class="desktop-sidebar-section sidebar-logout" onclick="logout()">Sair (Logout)</button>
    `;
  }

  // 3. MOBILE NAV
  const mobileNavEl = document.getElementById('global-mobile-nav');
  if (mobileNavEl) {
    mobileNavEl.innerHTML = `
      <button type="button" class="mobile-nav-item ${currentPage === 'index.html' ? 'active' : ''}" onclick="location.href='index.html'" ${currentPage === 'index.html' ? 'aria-current="page"' : ''}>
        <span class="mobile-nav-item__icon">+</span>
        <span class="mobile-nav-item__text">Apostar</span>
      </button>
      <button type="button" class="mobile-nav-item ${currentPage === 'historico.html' ? 'active' : ''}" onclick="location.href='historico.html'" ${currentPage === 'historico.html' ? 'aria-current="page"' : ''}>
        <span class="mobile-nav-item__icon">≡</span>
        <span class="mobile-nav-item__text">Histórico</span>
      </button>
      <button type="button" class="mobile-nav-item ${currentPage === 'fundos.html' ? 'active' : ''}" onclick="location.href='fundos.html'" ${currentPage === 'fundos.html' ? 'aria-current="page"' : ''}>
        <span class="mobile-nav-item__icon">⇄</span>
        <span class="mobile-nav-item__text">Fundos</span>
      </button>
      <button type="button" class="mobile-nav-item ${currentPage === 'casas.html' ? 'active' : ''}" onclick="location.href='casas.html'" ${currentPage === 'casas.html' ? 'aria-current="page"' : ''}>
        <span class="mobile-nav-item__icon">◈</span>
        <span class="mobile-nav-item__text">Casas</span>
      </button>
      <button type="button" class="mobile-nav-item ${currentPage === 'relatorio.html' ? 'active' : ''}" onclick="location.href='relatorio.html'" ${currentPage === 'relatorio.html' ? 'aria-current="page"' : ''}>
        <span class="mobile-nav-item__icon">↗</span>
        <span class="mobile-nav-item__text">Relatório</span>
      </button>
      <button type="button" class="mobile-nav-item ${currentPage === 'logins.html' ? 'active' : ''}" onclick="location.href='logins.html'" ${currentPage === 'logins.html' ? 'aria-current="page"' : ''}>
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
