// Sert la version web de l'appli (build/web) sur http://localhost:5200 pour la
// tester dans un navigateur. /api et /medias sont relayés vers l'API (port 3000),
// comme le proxy de la boutique : même origine, donc ni CORS ni réglage de l'API.
// Construire d'abord :  flutter build web --dart-define=SERVEUR=http://localhost:5200
const http = require('http');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..', 'build', 'web');
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.otf': 'font/otf', '.ttf': 'font/ttf' };

http
  .createServer((q, r) => {
    if (q.url.startsWith('/api/') || q.url.startsWith('/medias/')) {
      const relais = http.request({ host: 'localhost', port: 3000, path: q.url, method: q.method, headers: { ...q.headers, host: 'localhost:3000' } }, (rep) => {
        r.writeHead(rep.statusCode, rep.headers);
        rep.pipe(r);
      });
      relais.on('error', () => r.writeHead(502).end());
      q.pipe(relais);
      return;
    }
    let fichier = path.join(racine, decodeURIComponent(q.url.split('?')[0]));
    if (!fichier.startsWith(racine) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) fichier = path.join(racine, 'index.html');
    r.setHeader('Content-Type', types[path.extname(fichier)] ?? 'application/octet-stream');
    fs.createReadStream(fichier).pipe(r);
  })
  .listen(5200, 'localhost', () => console.log('Appli client : http://localhost:5200'));
