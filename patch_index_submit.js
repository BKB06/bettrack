const fs = require('fs');

function patchIndexSubmit(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Make form submit async properly and save db correctly
  content = content.replace(/form\.addEventListener\('submit', async \(e\) => \{([\s\S]*?)saveDb\(db\);/g, `form.addEventListener('submit', async (e) => {$1await saveDb(db);`);

  fs.writeFileSync(filePath, content);
  console.log(filePath + ' submit patched');
}

patchIndexSubmit('/opt/lampp/htdocs/bettrack/index.html');
