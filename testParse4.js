let desc = "San Antonio Spurs - Oklahoma cio 2130";
desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha|cio|ço)*\s*\d{2}[:h]?\d{2}.*$/i, '');
console.log("DESC 1:", desc);

let desc2 = "Sao Paulo - Palmeiras 21:30";
desc2 = desc2.replace(/\s*(?:esta noite|hoje|amanhã|amanha|cio|ço)*\s*\d{2}[:h]?\d{2}.*$/i, '');
console.log("DESC 2:", desc2);
