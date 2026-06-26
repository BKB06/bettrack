const fs = require('fs');

let db = {
  mercadoPago: 0,
  bookmakers: [
    { id: 'b1', name: 'Bet365', balance: 100 },
    { id: 'pinnacle1', name: 'Pinnacle', balance: 24.53 }
  ]
};

const amount = 24.53;
const idxFrom = 1;

db.bookmakers[idxFrom].balance -= amount;
db.bookmakers[idxFrom].balance = Math.max(0, parseFloat(db.bookmakers[idxFrom].balance.toFixed(2)));
db.mercadoPago += amount;
db.mercadoPago = parseFloat(db.mercadoPago.toFixed(2));

console.log("balance after:", db.bookmakers[idxFrom].balance);
