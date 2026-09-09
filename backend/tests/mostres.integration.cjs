require('dotenv').config();
const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),express=require('express'),jwt=require('jsonwebtoken');
const {prisma}=require('../dist/prisma');
test('samples: duplicate protection, dates, fortnightly completion and permissions',async()=>{
 assert.equal(new URL(process.env.DATABASE_URL).hostname,'127.0.0.1');
 const grup=randomUUID();let user,server;
 try{
  user=await prisma.usuari.create({data:{nom:'Samples test',usuari:randomUUID(),contrasenya:'not-a-login',rol:'ENCARREGAT'}});
  const token=jwt.sign({id:user.id,rol:'ENCARREGAT'},process.env.JWT_SECRET||'canvia_aquest_secret');
  const app=express();app.use(express.json());app.use('/samples',require('../dist/routes/mostres.routes').default);
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const call=(path,method='GET',body)=>fetch(`http://127.0.0.1:${server.address().port}/samples${path}`,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const data={grup,titol:'Punt A',data:'2026-09-09',intervalDies:14};
  let res=await call('','POST',data);assert.equal(res.status,201);const row=await res.json();
  assert.equal((await call('','POST',{...data,titol:' punt a '})).status,409);
  assert.equal((await call('','POST',{...data,data:'2026-02-30'})).status,400);
  assert.equal((await call('/'+row.id+'/estat','PATCH',{feta:true})).status,200);
  await call('/'+row.id+'/estat','PATCH',{feta:true});
  const records=await prisma.mostra.findMany({where:{grup},orderBy:{data:'asc'}});
  assert.equal(records.length,2);assert.equal(records[0].feta,true);assert.equal(records[1].data,'2026-09-23');assert.equal(records[1].feta,false);
  await prisma.usuari.update({where:{id:user.id},data:{rol:'TREBALLADOR'}});
  assert.equal((await call('')).status,200);assert.equal((await call('','POST',data)).status,403);
 }finally{if(server)await new Promise(r=>server.close(r));await prisma.mostra.deleteMany({where:{grup}});if(user)await prisma.usuari.delete({where:{id:user.id}});await prisma.$disconnect();}
});
