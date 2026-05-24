let regex = /\s*(?:esta noite|hoje|amanhã|amanha|cio|ço|co)*\s*\d{2,4}[:h]?\d{0,2}.*$/i;
console.log("76ers:", "Philadelphia 76ers".replace(regex, ''));
console.log("co 519,:", "Cleveland Cavaliers -NewYork co 519,".replace(regex, ''));
console.log("2130:", "San Antonio Spurs - Oklahoma cio 2130".replace(regex, ''));
