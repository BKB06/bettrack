const fs = require('fs');

let db = {
  mercadoPago: 0,
  bookmakers: [
    { id: 'b1', name: 'Bet365', sportsBalance: 100, casinoBalance: 0 },
    { id: 'pinnacle1', name: 'Pinnacle', sportsBalance: 24.53, casinoBalance: 0 }
  ]
};

const amount = 24.53;
const idxFrom = 1;

db.bookmakers[idxFrom].sportsBalance -= amount;
db.bookmakers[idxFrom].sportsBalance = Math.max(0, parseFloat(db.bookmakers[idxFrom].sportsBalance.toFixed(2)));
db.mercadoPago += amount;
db.mercadoPago = parseFloat(db.mercadoPago.toFixed(2));

console.log("sportsBalance after:", db.bookmakers[idxFrom].sportsBalance);
