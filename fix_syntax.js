const fs = require('fs');
let code = fs.readFileSync('temp_script_0.js', 'utf8');

// Try removing the last `});`
const lines = code.split('\n');
lines.pop(); // remove empty line if any
lines.pop(); // remove `});`
const newCode = lines.join('\n');
fs.writeFileSync('temp_script_test.js', newCode);
try {
  require('child_process').execSync('node -c temp_script_test.js');
  console.log("Fixed by removing one `});`");
} catch(e) {
  console.error("Still error");
}
