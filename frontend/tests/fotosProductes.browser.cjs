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
    let fotos=[];
    await ctx.route('**/api/**',async route=>{
      const req=route.request(),url=new URL(req.url()),p=url.pathname;
      let result=[];
      if(p.endsWith('/inventari/tipus')) result=[{id:'g',nom:'Test group'}];
      if(p.endsWith('/inventari/productes')) result=[{id:'p',nom:'Test product',tipusId:'g',tipus:{id:'g',nom:'Test group'},quantitat:1,stockMinim:0}];
      if(p.includes('/fotos-productes/')) {
        if(req.method()==='POST'){assert.deepEqual(req.postDataBuffer(),png);fotos.push({id:p.split('/').pop(),nom:url.searchParams.get('nom')});result=fotos.at(-1);}
        else if(req.method()==='DELETE'){fotos=[];return route.fulfill({status:204});}
        else if(p.endsWith('/p')) result=fotos;
        else return route.fulfill({contentType:'image/png',body:png});
      }
      await route.fulfill({json:result});
    });
    const p=await ctx.newPage();p.setDefaultTimeout(15000);
    await p.goto('http://127.0.0.1:'+server.address().port+'/inventari');
    await p.getByRole('button',{name:/Test group/}).click();
    await p.getByRole('button',{name:'Fotos',exact:true}).click();
    await p.locator('input[type=file]').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:png});
    await p.getByAltText('sample.png').waitFor();
    assert(await p.getByAltText('sample.png').evaluate(i=>i.complete&&i.naturalWidth>0));
    await p.setViewportSize({width:390,height:844});
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await p.getByRole('button',{name:'Eliminar foto',exact:true}).click();
    await p.getByRole('button',{name:'Sí, eliminar',exact:true}).click();
    await p.getByText('Aquest producte encara no té fotos.').waitFor();
    fotos=[{id:'saved',nom:'sample.png'}];
    await p.evaluate(()=>localStorage.setItem('usuari',JSON.stringify({id:'u',nom:'Worker',rol:'TREBALLADOR'})));
    await p.reload();await p.getByRole('button',{name:/Test group/}).click();await p.getByRole('button',{name:'Fotos',exact:true}).click();
    await p.getByAltText('sample.png').waitFor();assert.equal(await p.locator('input[type=file]').count(),0);assert.equal(await p.getByRole('button',{name:'Eliminar foto',exact:true}).count(),0);
    console.log('PASS product photos: upload bytes, image display, deletion, mobile and worker read-only');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
