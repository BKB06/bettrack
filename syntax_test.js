const fs = require('fs');
const html = fs.readFileSync('fundos.html', 'utf8');
const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
if (scriptMatches) {
  scriptMatches.forEach((match, idx) => {
    const code = match.replace(/<\/?script>/g, '');
    fs.writeFileSync(`temp_script_fundos_${idx}.js`, code);
    console.log(`Checking script ${idx}...`);
    try {
      require('child_process').execSync(`node -c temp_script_fundos_${idx}.js`);
      console.log(`Script ${idx} OK`);
    } catch (e) {
      console.error(`Script ${idx} ERROR`);
      console.error(e.stderr.toString());
    }
  });
}
