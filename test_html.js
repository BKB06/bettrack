
const validLines = ['Athletico-PR', 'Mirassol'];
let desc = '';
const betterLines = validLines;
if (betterLines.length > 0) desc = betterLines[0];
   desc += ' - ' + betterLines[1];
}
desc = desc.replace(/^([a-zA-ZÀ-ÿ]{1}[\s\W\d]*)*(?=[a-zA-ZÀ-ÿ])/i, '');
console.log('Result:', desc);
    