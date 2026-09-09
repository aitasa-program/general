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



    let records=[{id:'m',grup:'XC',titol:'Punt A',data:'2026-09-09',notes:'Nota original',intervalDies:0,feta:false}];
    await ctx.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url()).pathname;let data=[];
      if(url.endsWith('/mostres')) {if(req.method()==='POST'){records.push({id:'new',...req.postDataJSON(),feta:false});}data=records;}
      if(url.endsWith('/checklists'))data=[{id:'c',nom:'Rutina',data:'2026-09-10T10:00:00Z',frequencia:'SETMANAL',items:[{id:'ci',text:'Mostres XR-ZS',marcat:false}]}];
      await route.fulfill({json:data});});
    const p=await ctx.newPage();p.setDefaultTimeout(15000);await p.goto('http://127.0.0.1:'+server.address().port+'/mostres');
    await p.getByRole('heading',{name:'Punt A',exact:true}).waitFor();await p.getByRole('heading',{name:'Mostres XR-ZS',exact:true}).waitFor();
    assert.equal(await p.getByRole('link',{name:'Obrir la tasca original'}).count(),1);
    await p.getByRole('button',{name:'+ Nova mostra',exact:true}).click();await p.getByLabel('Mostra / punt de recollida',{exact:true}).fill('Punt B');await p.getByLabel('Data',{exact:true}).fill('2026-09-10');await p.getByRole('button',{name:'Desar',exact:true}).click();await p.getByRole('heading',{name:'Punt B',exact:true}).waitFor();
    await p.getByLabel('Cercar',{exact:true}).fill('Punt A');assert.equal(await p.getByRole('heading',{name:'Punt B',exact:true}).count(),0);
    await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    console.log('PASS samples: existing checklist linked once, create, search and mobile');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
