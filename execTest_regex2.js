let desc1 = "Team A (Handicap) odd";
desc1 = desc1.replace(/[^\w\)]+([a-zA-ZÀ-ÿ]{1,3}\b[^\w\)]*)*$/i, '');
desc1 = desc1.replace(/^[\s\W_]+/, '').replace(/[^\w\)]+$/, '').trim();
console.log(desc1);

let desc2 = "Lakers vs Warriors - ";
desc2 = desc2.replace(/[^\w\)]+([a-zA-ZÀ-ÿ]{1,3}\b[^\w\)]*)*$/i, '');
desc2 = desc2.replace(/^[\s\W_]+/, '').replace(/[^\w\)]+$/, '').trim();
console.log(desc2);
