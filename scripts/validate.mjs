import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = [
  '404.html',
  'casas.html',
  'fundos.html',
  'historico.html',
  'index.html',
  'logins.html',
  'relatorio.html'
];
const javascriptFiles = ['app.js', 'core.js', 'firebase-client.js', 'firebase-config.example.js'];
if (existsSync(path.join(projectRoot, 'firebase-config.js'))) {
  javascriptFiles.push('firebase-config.js');
}
const requiredFiles = [...htmlFiles, ...javascriptFiles, 'styles.css', 'firebase.json', 'firestore.rules'];
const errors = [];

function fail(message) {
  errors.push(message);
}

for (const file of requiredFiles) {
  if (!existsSync(path.join(projectRoot, file))) fail(`Arquivo obrigatório ausente: ${file}`);
}

for (const file of javascriptFiles) {
  const source = await readFile(path.join(projectRoot, file), 'utf8');
  try {
    new vm.Script(source, { filename: file });
  } catch (error) {
    fail(`${file}: JavaScript inválido (${error.message})`);
  }
}

for (const file of htmlFiles) {
  const html = await readFile(path.join(projectRoot, file), 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) fail(`${file}: IDs duplicados (${duplicateIds.join(', ')})`);

  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(script[1])) continue;
    try {
      new vm.Script(script[2], { filename: `${file}:inline-script` });
    } catch (error) {
      fail(`${file}: script inline inválido (${error.message})`);
    }
  }

  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(html)) {
    fail(`${file}: viewport impede zoom do usuário`);
  }

  if (/target=["']_blank["'](?![^>]*\brel=)/gi.test(html)) {
    fail(`${file}: link _blank sem rel="noopener noreferrer"`);
  }

  for (const label of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const hasFor = /\bfor=["'][^"']+["']/i.test(label[1]);
    const wrapsControl = /<(input|select|textarea)\b/i.test(label[2]);
    if (!hasFor && !wrapsControl) {
      fail(`${file}: label sem associação explícita a um campo`);
    }
  }

  if (file !== '404.html') {
    const configPosition = html.indexOf('src="firebase-config.js"');
    const clientPosition = html.indexOf('src="firebase-client.js"');
    const corePosition = html.indexOf('src="core.js"');
    const appPosition = html.indexOf('src="app.js"');
    if (
      configPosition < 0 ||
      clientPosition < 0 ||
      corePosition < 0 ||
      appPosition < 0 ||
      configPosition > clientPosition ||
      clientPosition > corePosition ||
      corePosition > appPosition
    ) {
      fail(`${file}: scripts compartilhados ausentes ou fora da ordem esperada`);
    }
  }
}

const firebaseConfig = JSON.parse(await readFile(path.join(projectRoot, 'firebase.json'), 'utf8'));
if (firebaseConfig.hosting?.public !== 'dist') {
  fail('firebase.json: somente dist/ pode ser publicada');
}

if (errors.length) {
  console.error(`Validação falhou com ${errors.length} problema(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Validação concluída: ${requiredFiles.length} arquivos e ${htmlFiles.length} páginas.`);
}
