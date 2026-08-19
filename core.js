/**
 * Funções puras e regras de domínio do BetTrack.
 *
 * O arquivo usa um formato compatível com navegador e Node.js: a interface fica
 * disponível em `window.BetTrackCore` na aplicação e em `module.exports` nos
 * testes. Manter estas funções sem dependência do DOM torna as regras financeiras
 * fáceis de validar e reduz efeitos colaterais nas telas.
 */
(function exposeBetTrackCore(globalScope, factory) {
  'use strict';

  const api = Object.freeze(factory());

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.BetTrackCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBetTrackCore() {
  'use strict';

  const DEFAULT_BOOKMAKER_COLOR = '#4a5a7a';
  const VALID_BET_STATUSES = new Set(['pending', 'won', 'lost', 'void']);

  /** Cria uma nova base para evitar o compartilhamento acidental de arrays. */
  function createDefaultDb() {
    return {
      mercadoPago: 90.21,
      bookmakers: [
        { id: '1', name: 'Betano', color: '#ff3c3c', balance: 0.21 },
        { id: '2', name: 'Bet365', color: '#00e87a', balance: 0 }
      ],
      bets: [],
      cashflow: [],
      dailyLogins: { date: '', logins: {} }
    };
  }

  function toFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function roundMoney(value) {
    return Math.round((toFiniteNumber(value) + Number.EPSILON) * 100) / 100;
  }

  function sanitizeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ''))
      ? String(value)
      : DEFAULT_BOOKMAKER_COLOR;
  }

  /**
   * Aceita somente links HTTP(S) e promove HTTP para HTTPS. A função é usada
   * antes de persistir ou inserir URLs de casas de aposta no DOM.
   */
  function normalizeExternalUrl(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';

    const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(rawValue)
      ? rawValue
      : `https://${rawValue}`;

    try {
      const url = new URL(withProtocol);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      if (url.username || url.password) return '';
      url.protocol = 'https:';
      return url.href;
    } catch {
      return '';
    }
  }

  function normalizeDate(value) {
    const date = String(value || '').trim();
    const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const brMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    const parts = isoMatch
      ? [isoMatch[1], isoMatch[2], isoMatch[3]]
      : brMatch
        ? [brMatch[3], brMatch[2], brMatch[1]]
        : null;
    if (!parts) return '';

    const [year, month, day] = parts.map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    const isValid =
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day;

    if (isValid) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  }

  function getLocalDateKey(date = new Date()) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function generateId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  function escapeJsString(value) {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
      .replace(/&/g, '\\x26')
      .replace(/"/g, '\\x22')
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e');
  }

  /**
   * Normaliza documentos antigos do Firestore em um único ponto. A função
   * preserva campos desconhecidos para manter compatibilidade com versões
   * anteriores, mas garante os tipos usados nos cálculos e renderizações.
   */
  function normalizeDb(rawDb, today = new Date()) {
    const source = rawDb && typeof rawDb === 'object' ? rawDb : {};
    const db = { ...createDefaultDb(), ...source };

    db.mercadoPago = Math.max(0, roundMoney(db.mercadoPago));

    db.bookmakers = Array.isArray(db.bookmakers)
      ? db.bookmakers.filter(Boolean).map(bookmaker => {
          const legacyBalance =
            toFiniteNumber(bookmaker.sportsBalance) +
            toFiniteNumber(bookmaker.casinoBalance);
          const hasLegacyBalance =
            bookmaker.sportsBalance !== undefined || bookmaker.casinoBalance !== undefined;
          const normalizedName = String(bookmaker.name || '').trim().slice(0, 80);
          const normalized = {
            ...bookmaker,
            id: String(bookmaker.id || generateId()),
            name: normalizedName || 'Casa sem nome',
            color: sanitizeColor(bookmaker.color),
            balance: Math.max(0, roundMoney(hasLegacyBalance ? legacyBalance : bookmaker.balance))
          };

          delete normalized.sportsBalance;
          delete normalized.casinoBalance;

          if (normalized.url) {
            normalized.url = normalizeExternalUrl(normalized.url);
          }

          return normalized;
        })
      : [];

    db.bets = Array.isArray(db.bets)
      ? db.bets.filter(Boolean).map(bet => {
          const normalized = {
            ...bet,
            id: String(bet.id || generateId()),
            bookmakerId: String(bet.bookmakerId || ''),
            date: normalizeDate(bet.date),
            odd: Math.max(0, toFiniteNumber(bet.odd)),
            stake: Math.max(0, roundMoney(bet.stake)),
            profit: roundMoney(bet.profit),
            isFreebet: Boolean(bet.isFreebet),
            status: VALID_BET_STATUSES.has(bet.status) ? bet.status : 'pending'
          };

          // Migração do modelo antigo, que guardava esporte e liga em `category`.
          if (normalized.category && !normalized.sport) {
            if (normalized.category === 'NBA' || normalized.category === 'WNBA') {
              normalized.sport = 'Basquete';
              normalized.league = normalized.category;
            } else if (normalized.category === 'Futebol') {
              normalized.sport = 'Futebol';
              normalized.league = '';
            } else {
              normalized.sport = 'Outros';
              normalized.league = '';
            }
          }

          normalized.sport = String(normalized.sport || 'Outros');
          normalized.league = String(normalized.league || '');
          normalized.event = String(normalized.event || 'Evento sem descrição').slice(0, 240);
          delete normalized.category;
          return normalized;
        })
      : [];

    db.cashflow = Array.isArray(db.cashflow)
      ? db.cashflow.filter(Boolean).map(entry => ({
          ...entry,
          id: String(entry.id || generateId()),
          amount: Math.max(0, roundMoney(entry.amount)),
          date: normalizeDate(entry.date),
          note: String(entry.note || '').slice(0, 240)
        }))
      : [];

    const currentDate = getLocalDateKey(today);
    const savedDailyLogins =
      db.dailyLogins && typeof db.dailyLogins === 'object' ? db.dailyLogins : {};
    const isCurrentDay = savedDailyLogins.date === currentDate;

    db.dailyLogins = isCurrentDay
      ? {
          ...savedDailyLogins,
          date: currentDate,
          logins:
            savedDailyLogins.logins && typeof savedDailyLogins.logins === 'object'
              ? { ...savedDailyLogins.logins }
              : {}
        }
      : { date: currentDate, logins: {} };

    if (!isCurrentDay) {
      db.bookmakers.forEach(bookmaker => {
        delete bookmaker.lastLoginBeforeUndo;
      });
    }

    return db;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(toFiniteNumber(value));
  }

  /**
   * Calcula uma liquidação uma única vez para que lucro e crédito usem o mesmo
   * arredondamento. O crédito representa o valor que retorna ao saldo da casa.
   */
  function calculateBetSettlement(bet, result) {
    const stake = Math.max(0, roundMoney(bet?.stake));
    const odd = Math.max(0, toFiniteNumber(bet?.odd));
    const isFreebet = Boolean(bet?.isFreebet);

    if (result === 'won') {
      const grossPayout = roundMoney(stake * odd);
      const profit = roundMoney(grossPayout - stake);
      return {
        status: 'won',
        profit,
        balanceCredit: isFreebet ? Math.max(0, profit) : Math.max(0, grossPayout)
      };
    }

    if (result === 'lost') {
      return {
        status: 'lost',
        profit: isFreebet ? 0 : -stake,
        balanceCredit: 0
      };
    }

    if (result === 'void') {
      return {
        status: 'void',
        profit: 0,
        balanceCredit: isFreebet ? 0 : stake
      };
    }

    throw new TypeError(`Resultado de aposta inválido: ${String(result)}`);
  }

  /** Retorna quanto precisa existir na casa para desfazer uma liquidação. */
  function calculateBetReversalDebit(bet) {
    if (bet?.status === 'won') {
      const debit = bet.isFreebet
        ? roundMoney(bet.profit)
        : roundMoney(toFiniteNumber(bet.stake) + toFiniteNumber(bet.profit));
      return Math.max(0, debit);
    }

    if (bet?.status === 'void' && !bet.isFreebet) {
      return Math.max(0, roundMoney(bet.stake));
    }

    return 0;
  }

  function calculateExposed(db) {
    return (Array.isArray(db?.bets) ? db.bets : [])
      .filter(bet => bet.status === 'pending' && !bet.isFreebet)
      .reduce((sum, bet) => sum + toFiniteNumber(bet.stake), 0);
  }

  function calculatePatrimonio(db) {
    const bookmakers = Array.isArray(db?.bookmakers) ? db.bookmakers : [];
    const bookmakerTotal = bookmakers.reduce(
      (sum, bookmaker) => sum + toFiniteNumber(bookmaker.balance),
      0
    );

    return toFiniteNumber(db?.mercadoPago) + bookmakerTotal + calculateExposed(db);
  }

  function calculateStats(db) {
    const bets = Array.isArray(db?.bets) ? db.bets : [];
    const settled = bets.filter(bet => bet.status === 'won' || bet.status === 'lost');
    const won = settled.filter(bet => bet.status === 'won').length;
    const lost = settled.length - won;
    const profit = settled.reduce((sum, bet) => sum + toFiniteNumber(bet.profit), 0);
    const totalStake = settled.reduce((sum, bet) => sum + toFiniteNumber(bet.stake), 0);
    const isPositive = profit >= 0;

    return {
      acerto: settled.length ? `${((won / settled.length) * 100).toFixed(0)}%` : '0%',
      abertasCount: bets.filter(bet => bet.status === 'pending').length,
      lucro: profit,
      pnlFormatted: `${isPositive ? '+' : ''}${formatMoney(profit)}`,
      pnlClass: isPositive ? 'green' : 'red',
      roi: totalStake ? `${((profit / totalStake) * 100).toFixed(1)}%` : '0.0%',
      roiClass: isPositive ? 'green' : 'red',
      totalStake,
      won,
      lost
    };
  }

  function getDefaultBookmakerUrl(name) {
    const normalizedName = String(name || '').toLocaleLowerCase('pt-BR');
    const knownUrls = [
      [['betano'], 'https://br.betano.com/'],
      [['bet365'], 'https://www.bet365.com/'],
      [['pinnacle'], 'https://www.pinnacle.com/'],
      [['kto'], 'https://www.kto.com/'],
      [['betfair'], 'https://www.betfair.com/'],
      [['sportingbet'], 'https://sports.sportingbet.com/'],
      [['1xbet'], 'https://1xbet.com/'],
      [['estrelabet', 'estrela bet'], 'https://estrelabet.com/'],
      [['novibet'], 'https://www.novibet.com.br/'],
      [['betdasorte', 'bet da sorte', 'bet dá sorte'], 'https://www.betdasorte.com/']
    ];

    return knownUrls.find(([aliases]) => aliases.some(alias => normalizedName.includes(alias)))?.[1] || '';
  }

  return {
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
  };
});
