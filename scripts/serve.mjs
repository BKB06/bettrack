import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = path.join(projectRoot, 'dist');
const port = Number(process.env.PORT) || 4173;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8'
};

if (!existsSync(publicDirectory)) {
  throw new Error('A pasta dist/ não existe. Execute npm run build antes de iniciar.');
}

createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Requisição inválida.');
    return;
  }
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.resolve(publicDirectory, `.${requestedPath}`);
  const staysInsidePublicDirectory = resolvedPath.startsWith(`${publicDirectory}${path.sep}`);

  let filePath = staysInsidePublicDirectory ? resolvedPath : '';
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = path.join(publicDirectory, '404.html');
    response.statusCode = 404;
  }

  response.setHeader('Content-Type', contentTypes[path.extname(filePath)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`BetTrack disponível em http://127.0.0.1:${port}`);
});
