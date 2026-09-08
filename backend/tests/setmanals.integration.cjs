require('dotenv').config();
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const express=require('express');
const bcrypt=require('bcrypt');
const {prisma}=require('../dist/prisma');
test('weekly sheets preserve daily data, originals, concurrent edits and all three PDF layouts',async()=>{
  assert(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const password=randomUUID(),suffix=randomUUID();let user,server;const sheets=[];
  const week='2089-06-06';
  try{
    user=await prisma.usuari.create({data:{nom:'Prova setmanal',usuari:'test-'+suffix,contrasenya:await bcrypt.hash(password,4),rol:'TREBALLADOR'}});
    const app=express();app.use('/api/controls',require('../dist/routes/controls.routes').default);app.use(express.json());app.use('/api/auth',require('../dist/routes/auth.routes').default);
    server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
    let token='';const call=(path,method='GET',body)=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
    assert.equal((await call('/controls/setmanals/models')).status,401);
    token=(await(await call('/auth/login','POST',{usuari:user.usuari,contrasenya:password})).json()).token;
    const models=await(await call('/controls/setmanals/models')).json();assert.equal(models.length,3);
    const {dilluns}=require('../dist/services/setmanals.models');const monday=dilluns(week);
    for(const m of models){
      const url=`/controls/setmanals/${m.id}/${monday}`;
      const initial=await(await call(url)).json();assert.equal(initial.versio,0);assert.equal(initial.dades.lectures.length,7);
      const body={id:randomUUID(),versio:0,dades:initial.dades};const key=m.grups[0].camps.find(c=>c.tipus==='numero').key;
      body.dades.lectures[0].valors[key]='0';
      const saved=await call(url,'POST',body);assert.equal(saved.status,201);const rev=await saved.json();
      const head=await prisma.fullControlSetmanal.findUnique({where:{tipus_setmana:{tipus:m.id,setmana:monday}}});sheets.push(head.id);
      const firstPdf=Buffer.from(await(await call('/controls/setmanals/pdf/'+rev.id)).arrayBuffer());assert.equal(firstPdf.subarray(0,5).toString(),'%PDF-');assert.equal(createHash('sha256').update(firstPdf).digest('hex'),rev.sha256);
      assert.equal((await call(url,'POST',body)).status,200,'Duplicate retries must reuse the snapshot');
      const next=await(await call(url)).json();assert.equal(next.dades.lectures[0].valors[key],'0');next.dades.lectures[1].valors[key]='1.7';
      assert.equal((await call(url,'POST',{id:randomUUID(),versio:1,dades:next.dades})).status,201,'New days may be added without changing Monday');
      const current=await(await call(url)).json();assert.equal(current.dades.lectures[0].valors[key],'0');assert.equal(current.dades.lectures[1].valors[key],'1.7');
      current.dades.lectures[0].valors[key]='0.5';
      assert.equal((await call(url,'POST',{id:randomUUID(),versio:2,dades:current.dades})).status,400,'Corrections need a reason');
      assert.equal((await call(url,'POST',{id:randomUUID(),versio:2,dades:current.dades,motiu:'Correcció de lectura'})).status,201);
      assert(firstPdf.equals(Buffer.from(await(await call('/controls/setmanals/pdf/'+rev.id)).arrayBuffer())),'Original PDF is immutable');
      const current2=await(await call(url)).json();current2.dades.lectures[2].valors[key]='0.6';
      const results=await Promise.all([call(url,'POST',{id:randomUUID(),versio:3,dades:current2.dades}),call(url,'POST',{id:randomUUID(),versio:3,dades:current2.dades})]);
      assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
      const latest=await(await call(url)).json();assert.equal(latest.versio,4);assert.equal(latest.historial.length,4);
      assert(!(await(await call(`/controls/setmanals/${m.id}/2089-06-13`)).json()).revisionId,'Other weeks remain separate');
    }
  }finally{
    if(server)await new Promise(r=>server.close(r));
    await prisma.revisioControlSetmanal.deleteMany({where:{fullId:{in:sheets}}});await prisma.fullControlSetmanal.deleteMany({where:{id:{in:sheets}}});
    if(user)await prisma.usuari.delete({where:{id:user.id}});await prisma.$disconnect();
  }
});
