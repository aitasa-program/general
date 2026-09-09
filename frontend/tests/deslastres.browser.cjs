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

    const {modelsSetmanals,dadesBuides,prepararSetmana}=require('../../backend/dist/services/setmanals.models');
    let saved=null,posts=0;
    await ctx.route('**/api/**',async route=>{
      const req=route.request(),url=new URL(req.url()).pathname;
      let result=[];
      if(url.endsWith('/setmanals/models')) result=modelsSetmanals;
      else if(url.includes('/setmanals/')) {
        const week=url.split('/').pop();
        if(req.method()==='POST') {const body=req.postDataJSON();saved=prepararSetmana(modelsSetmanals.find(m=>m.id===url.split('/').at(-2)),week,body.dades,saved||dadesBuides(week),'Prova').dades;posts++;}
        result={versio:posts,dades:saved||dadesBuides(week),historial:[],total:posts,revisionId:null};
      }
      await route.fulfill({json:result});
    });
    const p=await ctx.newPage();p.setDefaultTimeout(15000);
    await p.goto('http://127.0.0.1:'+server.address().port+'/registres-control');

    await p.getByRole('button',{name:'Repsol Deslastres',exact:true}).click();
    await p.getByRole('heading',{name:'Porta 80',exact:true}).waitFor();
    assert.equal(await p.getByLabel('Auto (mg/l)',{exact:true}).count(),2);
    await p.locator('#reading-deslastres_auto').fill('0.4');
    await p.locator('#reading-porta80_manual').fill('0');
    await p.locator('#reading-porta80_polsos').fill('80');
    await p.getByRole('button',{name:/^Organolèptics/}).click();
    assert.equal(await p.locator('.weekly-org').count(),2);
    await p.getByLabel('pH',{exact:true}).nth(1).fill('7.4');
    await p.getByRole('button',{name:'Desar canvis de la setmana',exact:true}).click();
    await p.getByText('Setmana guardada.',{exact:false}).waitFor();
    assert.equal(posts,1);
    assert(saved.lectures.some(r=>r.valors.porta80_manual==='0'&&r.valors.deslastres_auto==='0.4'));
    assert.equal(saved.organoleptics[0].lloc,'Porta 80');
    assert.equal(saved.organoleptics[0].valors.ph,'7.4');
    await p.setViewportSize({width:390,height:844});
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    console.log('PASS Repsol Deslastres: two points, readings, default sensory locations, save, zero and mobile');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
