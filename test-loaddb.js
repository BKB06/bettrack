const fs = require('fs');
const appCode = fs.readFileSync('app.js', 'utf8');
const script = `
  const localStorage = { getItem: () => null, setItem: () => {} };
  const document = { addEventListener: () => {} };
  const window = { addEventListener: () => {} };
  ${appCode}
  console.log(loadDb());
`;
eval(script);
