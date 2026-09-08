// Run after `npm run build` and `prisma migrate deploy`, against a LOCAL database.
require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const { prisma } = require('../dist/prisma');

test('control archive preserves PDFs, corrections, permissions and attachments', async () => {
  assert(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Integration tests require a local database');
  const suffix = crypto.randomUUID();
  const password = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 4);
  const users = [];
  let template, folder, server;
  try {
    for (const rol of ['ENCARREGAT', 'TREBALLADOR']) users.push(await prisma.usuari.create({ data: { nom: `Test ${rol}`, usuari: `test-${rol}-${suffix}`, contrasenya: hash, rol } }));
    const app = express();
    app.use('/api/controls', require('../dist/routes/controls.routes').default);
    app.use('/api/documentacio', require('../dist/routes/documentacio.routes').default);
    app.use(express.json());
    app.use('/api/auth', require('../dist/routes/auth.routes').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}/api`;
    async function call(path, method = 'GET', body, token) {
      return fetch(url + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    }
    const tokens = [];
    for (const u of users) {
      const response = await call('/auth/login', 'POST', { usuari: u.usuari, contrasenya: password });
      assert.equal(response.status, 200); tokens.push((await response.json()).token);
    }
    const [admin, worker] = tokens;
    assert.equal((await call('/controls/plantilles')).status, 401);
    const definition = { nom: `Control ${suffix}`, camps: [{ nom: 'Pressió', tipus: 'numero', obligatori: true }, { nom: 'Estat', tipus: 'seleccio', opcions: ['Correcte', 'Incidència'], obligatori: true }, { nom: 'Observacions', tipus: 'multilinia', obligatori: false }] };
    assert.equal((await call('/controls/plantilles', 'POST', definition, worker)).status, 403);
    const templateResponse = await call('/controls/plantilles', 'POST', definition, admin); assert.equal(templateResponse.status, 201);
    template = await templateResponse.json();
    const body = { id: crypto.randomUUID(), plantillaId: template.id, versio: 1, dia: '2026-09-08', valors: { 'Pressió': '0', Estat: 'Correcte', Observacions: 'Revisió de la vàlvula.\n'.repeat(200) } };
    assert.equal((await call('/controls/registres', 'POST', { ...body, dia: '2026-02-30' }, worker)).status, 400);
    assert.equal((await call('/controls/registres', 'POST', { ...body, valors: {} }, worker)).status, 400);
    const saved = await call('/controls/registres', 'POST', body, worker); assert.equal(saved.status, 201);
    const r = await saved.json();
    const pdfResponse = await call(`/controls/registres/${r.id}/pdf`, 'GET', null, worker); assert.equal(pdfResponse.status, 200);
    const pdf = Buffer.from(await pdfResponse.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-'); assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'), r.sha256);
    assert.equal((await call('/controls/registres', 'POST', body, worker)).status, 200, 'Retry must return the original record');
    assert.equal((await call('/controls/registres', 'POST', { ...body, dia: '2026-09-09' }, worker)).status, 409);
    assert.equal((await call(`/controls/registres/${r.id}`, 'DELETE', null, admin)).status, 404);
    assert.equal((await call(`/controls/registres/${r.id}`, 'PATCH', { valors: {} }, admin)).status, 404);
    assert.equal((await call(`/controls/plantilles/${template.id}`, 'PATCH', { ...definition, nom: 'Control canviat', versio: 1, activa: true }, admin)).status, 200);
    assert.equal((await call('/controls/registres', 'POST', { ...body, id: crypto.randomUUID() }, worker)).status, 409, 'Stale forms must not submit');
    const unchanged = Buffer.from(await (await call(`/controls/registres/${r.id}/pdf`, 'GET', null, admin)).arrayBuffer());
    assert(pdf.equals(unchanged), 'Stored PDF must not change after template edits');
    const detail = await (await call(`/controls/registres/${r.id}`, 'GET', null, admin)).json(); assert.equal(detail.nom, definition.nom); assert.equal(detail.autorNom, users[1].nom);
    const correction = await call('/controls/registres', 'POST', { ...body, id: crypto.randomUUID(), rectificaId: r.id, motiu: 'Correcció de lectura', valors: { ...body.valors, 'Pressió': '2.5' } }, worker); assert.equal(correction.status, 201);
    assert.equal((await (await call(`/controls/registres/${r.id}`, 'GET', null, worker)).json()).rectificacio.id, (await correction.json()).id);
    const listed = await (await call(`/controls/registres?plantillaId=${template.id}&desDe=2026-09-08&fins=2026-09-08`, 'GET', null, admin)).json(); assert.equal(listed.total, 2); assert(!('pdf' in listed.items[0]));
    assert.equal((await call('/documentacio/carpetes', 'POST', { nom: suffix }, worker)).status, 403);
    folder = await (await call('/documentacio/carpetes', 'POST', { nom: suffix }, admin)).json();
    const upload = { id: crypto.randomUUID(), carpetaId: folder.id, nom: 'PDF de prova', nomFitxer: 'prova.pdf', base64: pdf.toString('base64') };
    assert.equal((await call('/documentacio/documents', 'POST', upload, worker)).status, 403);
    assert.equal((await call('/documentacio/documents', 'POST', { ...upload, base64: Buffer.from('not pdf').toString('base64') }, admin)).status, 400);
    const uploaded = await call('/documentacio/documents', 'POST', upload, admin); assert.equal(uploaded.status, 201); const document = await uploaded.json();
    assert.equal((await call('/documentacio/documents', 'POST', upload, admin)).status, 200);
    assert.equal((await call(`/documentacio/documents/${document.id}/fitxer`)).status, 401);
    const downloaded = Buffer.from(await (await call(`/documentacio/documents/${document.id}/fitxer`, 'GET', null, worker)).arrayBuffer()); assert(pdf.equals(downloaded));
    assert(!(await (await call(`/documentacio/documents?carpetaId=${folder.id}`, 'GET', null, worker)).json()).items.some(d => 'contingut' in d));
    await prisma.usuari.update({ where: { id: users[1].id }, data: { actiu: false } });
    assert.equal((await call('/controls/plantilles', 'GET', null, worker)).status, 403);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (template) {
      await prisma.registreControl.deleteMany({ where: { plantillaId: template.id, rectificaId: { not: null } } });
      await prisma.registreControl.deleteMany({ where: { plantillaId: template.id } });
      await prisma.plantillaControl.delete({ where: { id: template.id } });
    }
    if (folder) { await prisma.documentArxiu.deleteMany({ where: { carpetaId: folder.id } }); await prisma.carpetaDocument.delete({ where: { id: folder.id } }); }
    await prisma.usuari.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await prisma.$disconnect();
  }
});
