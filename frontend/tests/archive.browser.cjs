// Build the frontend first. Set PLAYWRIGHT_MODULE if using a bundled Playwright runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const dist = path.resolve(__dirname, '../dist');
  const server = http.createServer((req, res) => {
    let file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true });
    await ctx.addInitScript(() => {
      localStorage.setItem('token', 'ui-test-only');
      if (!localStorage.getItem('usuari')) localStorage.setItem('usuari', JSON.stringify({ id: 'u', nom: 'Prova', rol: 'ENCARREGAT' }));
    });
    const templates = [], records = [], docs = [];
    await ctx.route('**/api/**', async route => {
      const req = route.request();
      const url = new URL(req.url()).pathname.replace('/api', '');
      const body = req.method() === 'POST' ? req.postDataJSON() : null;
      let result = [];
      if (url === '/controls/plantilles') {
        if (body) templates.push({ ...body, id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', versio: 1, activa: true });
        result = body ? templates[0] : templates;
      }
      if (url === '/controls/registres') {
        if (body) records.push({ ...body, nom: templates[0].nom, camps: templates[0].camps, autorId: 'u', autorNom: 'Prova', creatEl: new Date().toISOString(), sha256: 'a'.repeat(64), rectificaId: null, rectificacio: null });
        result = body ? records[0] : { items: records, total: records.length, pagina: 1 };
      }
      if (url.startsWith('/controls/registres/')) result = records[0];
      if (url.endsWith('/pdf') || url.endsWith('/fitxer')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
      if (url === '/documentacio/carpetes') result = [{ id: 'pams', nom: 'PAM,s', _count: { documents: docs.length } }];
      if (url === '/documentacio/documents') {
        if (body) docs.push({ ...body, mida: 12, autorNom: 'Prova', creatEl: new Date().toISOString() });
        result = body ? docs[0] : { items: docs, total: docs.length, pagina: 1 };
      }
      await route.fulfill({ status: body ? 201 : 200, json: result });
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(30000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    await p.goto(base + '/registres-control', { waitUntil: 'domcontentloaded' });
    await p.getByRole('button', { name: 'Crear formulari', exact: true }).click();
    await p.getByLabel('Nom del formulari', { exact: true }).fill('Control de pressió');
    await p.getByLabel('Nom del camp', { exact: true }).fill('Pressió');
    await p.locator('.field-editor select').selectOption('numero');
    await p.getByRole('button', { name: '+ Afegir camp', exact: true }).click();
    await p.getByLabel('Nom del camp', { exact: true }).last().fill('Estat');
    await p.locator('.field-editor select').last().selectOption('seleccio');
    await p.getByLabel('Opcions (una per línia)', { exact: true }).fill('Correcte\nIncidència');
    await p.getByRole('button', { name: 'Desar formulari', exact: true }).click();
    await p.getByText('Plantilla guardada. Els registres anteriors es conserven.').waitFor();
    await p.getByRole('button', { name: 'Emplenar control', exact: true }).click();
    await p.getByRole('button', { name: /Control de pressió/ }).click();
    await p.getByLabel('Pressió *', { exact: true }).fill('0');
    await p.locator('#control-1').selectOption('Correcte');
    const out = process.env.ARCHIVE_TEST_OUTPUT;
    if (out) { fs.mkdirSync(out, { recursive: true }); await p.screenshot({ path: path.join(out, 'control-desktop.png'), fullPage: true }); }
    await p.getByRole('button', { name: 'Desar registre i PDF', exact: true }).click();
    await p.getByText('Registre i PDF guardats a l’arxiu.').waitFor();
    assert.equal(records.length, 1);
    const download = p.waitForEvent('download');
    await p.getByRole('button', { name: 'Descarregar PDF', exact: true }).click();
    await download;
    await p.getByRole('button', { name: 'Arxiu de registres', exact: true }).click();
    await p.getByRole('button', { name: 'Veure registre', exact: true }).click();
    await p.locator('#control-detail').waitFor();
    assert.equal(await p.getByRole('button', { name: 'Rectificar', exact: true }).count(), 1);
    for (const width of [1440, 900, 390]) {
      await p.setViewportSize({ width, height: 900 });
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Control overflow at ' + width);
    }
    if (out) await p.screenshot({ path: path.join(out, 'control-mobile.png'), fullPage: true });
    await p.goto(base + '/documentacio', { waitUntil: 'domcontentloaded' });
    await p.getByRole('button', { name: /PAM,s/ }).click();
    await p.getByLabel('Nom del document', { exact: true }).fill('PAM de prova');
    await p.getByLabel('Fitxer', { exact: true }).setInputFiles({ name: 'pam.txt', mimeType: 'text/plain', buffer: Buffer.from('Document de prova') });
    await p.getByRole('button', { name: 'Guardar document', exact: true }).click();
    await p.getByText('Document guardat. Ja es pot consultar i descarregar.').waitFor();
    assert.equal(docs.length, 1);
    if (out) await p.screenshot({ path: path.join(out, 'documentacio-mobile.png'), fullPage: true });
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await p.evaluate(() => localStorage.setItem('usuari', JSON.stringify({ id: 'u', nom: 'Prova', rol: 'TREBALLADOR' })));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.getByRole('button', { name: 'Descarregar', exact: true }).waitFor();
    assert.equal(await p.getByRole('button', { name: 'Guardar document', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: template builder, submission, PDF download, archive, document upload, mobile/tablet layout and worker view.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
