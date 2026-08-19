'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');

test('createDefaultDb retorna estruturas independentes', () => {
  const first = core.createDefaultDb();
  const second = core.createDefaultDb();

  first.bookmakers.push({ id: 'extra' });
  assert.notEqual(first.bookmakers.length, second.bookmakers.length);
});

test('normalizeDb migra datas, categorias e valores legados', () => {
  const db = core.normalizeDb(
    {
      mercadoPago: '10.239',
      bookmakers: [
        {
          id: 'book-1',
          name: 'Exemplo',
          color: 'cor-inválida',
          sportsBalance: '20.10',
          casinoBalance: 4.9
        }
      ],
      bets: [
        {
          id: 'bet-1',
          bookmakerId: 'book-1',
          category: 'NBA',
          date: '19/08/2026',
          odd: '2.5',
          stake: '10',
          profit: '15',
          status: 'won'
        }
      ]
    },
    new Date(2026, 7, 19)
  );

  assert.equal(db.mercadoPago, 10.24);
  assert.equal(db.bookmakers[0].balance, 25);
  assert.equal(db.bookmakers[0].color, '#4a5a7a');
  assert.equal(db.bets[0].date, '2026-08-19');
  assert.equal(db.bets[0].sport, 'Basquete');
  assert.equal(db.bets[0].league, 'NBA');
  assert.equal(db.bets[0].category, undefined);
});

test('cálculos financeiros ignoram freebet no valor exposto', () => {
  const db = {
    mercadoPago: 100,
    bookmakers: [{ balance: 50 }],
    bets: [
      { status: 'pending', stake: 20, isFreebet: false },
      { status: 'pending', stake: 10, isFreebet: true },
      { status: 'won', stake: 30, profit: 15 }
    ]
  };

  assert.equal(core.calculateExposed(db), 20);
  assert.equal(core.calculatePatrimonio(db), 170);
  assert.equal(core.calculateStats(db).roi, '50.0%');
});

test('escapeHtml neutraliza conteúdo persistido antes do innerHTML', () => {
  assert.equal(
    core.escapeHtml(`<img src=x onerror='alert(1)'>`),
    '&lt;img src=x onerror=&#39;alert(1)&#39;&gt;'
  );
});

test('escapeJsString protege argumentos dentro de handlers HTML', () => {
  assert.equal(core.escapeJsString(`a'\"<&`), `a\\'\\x22\\x3c\\x26`);
});

test('normalizeExternalUrl aceita apenas endereços web seguros', () => {
  assert.equal(core.normalizeExternalUrl('example.com'), 'https://example.com/');
  assert.equal(core.normalizeExternalUrl('http://example.com/path'), 'https://example.com/path');
  assert.equal(core.normalizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(core.normalizeExternalUrl('https://user:pass@example.com'), '');
});

test('normalizeDate rejeita datas impossíveis', () => {
  assert.equal(core.normalizeDate('29/02/2024'), '2024-02-29');
  assert.equal(core.normalizeDate('2026-02-30'), '');
});

test('normalizeDb não permite saldos e stakes negativos', () => {
  const db = core.normalizeDb({
    mercadoPago: -10,
    bookmakers: [{ id: 'book-1', name: 'Casa', balance: -5 }],
    bets: [{ id: 'bet-1', bookmakerId: 'book-1', stake: -20 }]
  });

  assert.equal(db.mercadoPago, 0);
  assert.equal(db.bookmakers[0].balance, 0);
  assert.equal(db.bets[0].stake, 0);
});

test('liquidação e reversão reutilizam o mesmo arredondamento monetário', () => {
  const bet = { stake: 1.5, odd: 1.21, isFreebet: false };
  const settlement = core.calculateBetSettlement(bet, 'won');

  assert.deepEqual(settlement, {
    status: 'won',
    profit: 0.32,
    balanceCredit: 1.82
  });
  assert.equal(
    core.calculateBetReversalDebit({ ...bet, ...settlement }),
    settlement.balanceCredit
  );
});
