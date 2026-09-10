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



    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
    let requests=0,downloads=0;
    await ctx.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let data=[];
      if(path.endsWith('/carpetes'))data=[{id:'maps',nom:'Mapes Mostres',_count:{documents:1}}];
      else if(path.endsWith('/documents'))data={items:[{id:'map',nom:'Mapa de prova',nomFitxer:'map.png',mida:png.length,creatEl:'2026-09-10',autorNom:'Prova'}],total:1};
      else if(path.endsWith('/fitxer')){requests++;assert(route.request().headers().authorization);return route.fulfill({contentType:'image/png',body:png});}
      await route.fulfill({json:data});});
    const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('download',()=>downloads++);
    await p.goto('http://127.0.0.1:'+server.address().port+'/documentacio?carpeta=maps');
    await p.getByRole('button',{name:'Veure i ampliar',exact:true}).waitFor();assert.equal(requests,0);
    await p.getByRole('button',{name:'Veure i ampliar',exact:true}).click();await p.getByRole('dialog').waitFor();await p.getByAltText('Mapa de prova').waitFor();await p.waitForFunction(()=>document.querySelector('dialog img')?.naturalWidth>0);
    assert.equal(requests,1);assert.equal(downloads,0);await p.getByRole('button',{name:'Ampliar imatge'}).click();assert.equal(await p.locator('dialog output').textContent(),'150%');
    assert(await p.locator('.document-viewer-content').evaluate(e=>e.scrollWidth>e.clientWidth));
    await p.getByRole('button',{name:'Ajustar',exact:true}).click();assert.equal(await p.locator('dialog output').textContent(),'100%');
    await p.keyboard.press('Escape');assert.equal(await p.getByRole('dialog').count(),0);
    await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Veure i ampliar',exact:true}).click();await p.getByAltText('Mapa de prova').waitFor();await p.getByRole('button',{name:'Ampliar imatge'}).click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.getByRole('button',{name:'Tancar',exact:true}).click();assert.equal(downloads,0);
    console.log('PASS map preview: authenticated lazy load, no download, zoom, fit, Escape and mobile');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
