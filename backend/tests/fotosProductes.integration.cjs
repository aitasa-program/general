require('dotenv').config();
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const express=require('express'),jwt=require('jsonwebtoken');
const {prisma}=require('../dist/prisma');
test('product photos: permissions, persistent bytes, retries, limits and removal',async()=>{
  assert.equal(new URL(process.env.DATABASE_URL).hostname,'127.0.0.1');
  let user,product,server;
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
  try {
    user=await prisma.usuari.create({data:{nom:'Photo test',usuari:randomUUID(),contrasenya:'not-a-login-hash',rol:'ENCARREGAT'}});
    product=await prisma.producte.create({data:{nom:'Photo test',codi:randomUUID()}});
    const token=jwt.sign({id:user.id,rol:'ENCARREGAT'},process.env.JWT_SECRET||'canvia_aquest_secret');
    const app=express();app.use('/photos',require('../dist/routes/fotosProductes.routes').default);
    server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    const root=`http://127.0.0.1:${server.address().port}/photos/`;
    const call=(path,method='GET',body,auth=token)=>fetch(root+path,{method,headers:{...(auth?{Authorization:'Bearer '+auth}:{}),'Content-Type':'image/png'},...(body?{body}: {})});
    const id=randomUUID(),url=product.id+'/'+id+'?nom=test.png';
    assert.equal((await call(product.id,'GET',null,'')).status,401);
    assert.equal((await call(url,'POST',png)).status,201);
    assert.equal((await call(url,'POST',png)).status,200);
    assert.deepEqual(Buffer.from(await(await call(product.id+'/'+id)).arrayBuffer()),png);
    assert.equal((await(await call(product.id)).json()).length,1);
    assert.equal((await call(randomUUID()+'/'+id)).status,404);
    assert.equal((await call(product.id+'/'+randomUUID()+'?nom=fake.png','POST',Buffer.from('<svg/>'))).status,400);
    await prisma.usuari.update({where:{id:user.id},data:{rol:'TREBALLADOR'}});
    assert.equal((await call(url)).status,200);
    assert.equal((await call(product.id+'/'+randomUUID()+'?nom=worker.png','POST',png)).status,403);
    assert.equal((await call(product.id+'/'+id,'DELETE')).status,403);
    await prisma.usuari.update({where:{id:user.id},data:{rol:'ENCARREGAT'}});
    for(let n=0;n<9;n++)assert.equal((await call(product.id+'/'+randomUUID()+'?nom=test.png','POST',png)).status,201);
    assert.equal((await call(product.id+'/'+randomUUID()+'?nom=test.png','POST',png)).status,400);
    assert.equal((await call(product.id+'/'+id,'DELETE')).status,204);
    assert.equal((await call(product.id+'/'+id)).status,404);
    await prisma.producte.delete({where:{id:product.id}});
    assert.equal(await prisma.fotoProducte.count({where:{producteId:product.id}}),0);product=null;
  } finally {
    if(server)await new Promise(r=>server.close(r));
    if(product)await prisma.producte.delete({where:{id:product.id}});
    if(user)await prisma.usuari.delete({where:{id:user.id}});
    await prisma.$disconnect();
  }
});
