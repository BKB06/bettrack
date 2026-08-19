import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'dist');
const allowExampleConfig = process.argv.includes('--allow-example');

// Uma lista fechada é intencional: novos rascunhos nunca entram no deploy por acidente.
const publicFiles = [
  '404.html',
  'app.js',
  'casas.html',
  'core.js',
  'favicon.ico',
  'firebase-client.js',
  'fundos.html',
  'historico.html',
  'index.html',
  'logins.html',
  'relatorio.html',
  'styles.css'
];

const firebaseEnvironmentKeys = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

function createFirebaseConfigFromEnvironment() {
  const missingKeys = firebaseEnvironmentKeys.filter(key => !process.env[key]);
  if (missingKeys.length) return null;

  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  if (process.env.FIREBASE_MEASUREMENT_ID) {
    config.measurementId = process.env.FIREBASE_MEASUREMENT_ID;
  }

  return `// Gerado automaticamente durante o build.\nwindow.firebaseConfig = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
}

async function resolveFirebaseConfig() {
  const localConfigPath = path.join(projectRoot, 'firebase-config.js');
  if (existsSync(localConfigPath)) {
    return readFile(localConfigPath, 'utf8');
  }

  const environmentConfig = createFirebaseConfigFromEnvironment();
  if (environmentConfig) return environmentConfig;

  if (allowExampleConfig) {
    return readFile(path.join(projectRoot, 'firebase-config.example.js'), 'utf8');
  }

  throw new Error(
    'Configuração Firebase ausente. Copie firebase-config.example.js para firebase-config.js ' +
      'ou defina as variáveis FIREBASE_* documentadas no README.'
  );
}

function validateFirebaseConfig(source) {
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\bprivate_key\b|\bclient_email\b/i.test(source)) {
    throw new Error('A configuração contém sinais de uma conta de serviço e não pode ir para o navegador.');
  }

  if (!allowExampleConfig && /YOUR_[A-Z0-9_]+/.test(source)) {
    throw new Error('A configuração Firebase ainda contém valores de exemplo.');
  }

  if (!/window\.firebaseConfig\s*=/.test(source)) {
    throw new Error('A configuração deve atribuir os valores a window.firebaseConfig.');
  }

  if (/firebase\.initializeApp|authStateReady|loginWithGoogle|window\.logout/.test(source)) {
    throw new Error('firebase-config.js deve conter apenas valores; use firebase-client.js para o comportamento.');
  }

  return source;
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  publicFiles.map(file => copyFile(path.join(projectRoot, file), path.join(outputDirectory, file)))
);

await writeFile(
  path.join(outputDirectory, 'firebase-config.js'),
  validateFirebaseConfig(await resolveFirebaseConfig()),
  'utf8'
);

console.log(`Build concluído: ${publicFiles.length + 1} arquivos públicos em dist/.`);
