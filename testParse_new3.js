let desc = "Cleveland Cavaliers -NewYork co 519,";
desc = desc.replace(/\s*(?:esta noite|hoje|amanhã|amanha|cio|ço|co)*\s*\d{2,4}[:h]?\d{0,2}.*$/i, '');
console.log("DESC 1:", desc);

let desc2 = "Cleveland Cavaliers -NewYork Knicks";
desc2 = desc2.replace(/\b(?:esta noite|hoje|amanhã|amanha|cio|ço|co|os)\b.*/i, '');
console.log("DESC 2:", desc2);
