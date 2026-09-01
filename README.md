# AITASA - App de Gestió de Magatzem i Tasques

## Estructura
- `backend/` — API REST amb Node.js + Express + TypeScript + Prisma + PostgreSQL
- `frontend/` — App web (PWA) amb React + TypeScript + Vite

## Posar en marxa el backend
```
cd backend
npm install
cp .env.example .env   # edita DATABASE_URL i JWT_SECRET
npx prisma migrate dev --name init
npm run dev
```
El servidor arrenca a `http://localhost:4000`.

## Posar en marxa el frontend
```
cd frontend
npm install
npm run dev
```
La web arrenca a `http://localhost:5173`.

## Estat actual (Pas 8 completat)
- Model de dades complet (usuaris, tasques, checklists, recordatoris amb notificacions push, formularis, inventari amb flux d'aprovació)
- Login amb nom d'usuari i contrasenya
- Backend: gestió completa d'usuaris (crear, editar, desactivar/reactivar, restablir contrasenya, eliminar)
- Frontend: checklists, tasques, recordatoris amb notificacions push reals (`/recordatoris`)
- Backend: planificador que revisa cada minut els recordatoris pendents i envia la notificació push encara que l'usuari no tingui la web oberta
- Frontend: **formularis** (`/formularis`) — l'encarregat defineix camps dinàmics (text/número/selecció), qualsevol usuari els omple, l'encarregat veu les respostes
- Frontend: **inventari** (`/inventari`) — llista de productes amb avís de stock baix, registre d'entrades/sortides amb flux d'aprovació pendent → confirmat/rebutjat

## Configurar les notificacions push (un sol cop)
1. A la carpeta `backend/`, executa: `npx web-push generate-vapid-keys`
2. Copia la clau pública i la privada resultants a `.env`, a `VAPID_PUBLIC_KEY` i `VAPID_PRIVATE_KEY`
3. Reinicia el backend (`npm run dev`)
4. A la web, cada usuari ha d'entrar a "Recordatoris" i prémer "Activar notificacions" (un cop per dispositiu/navegador)

**Important**: no canviïs aquestes claus un cop els usuaris ja s'hagin subscrit, o hauran de tornar a activar les notificacions.

## Nota important sobre el primer usuari
Com que crear usuaris requereix ja estar loguejat com a encarregat, cal crear el primer encarregat manualment (via `/api/auth/registre` amb una eina com Postman, o directament a la base de dades) abans de poder-hi entrar per primer cop.

## Pròxims passos
9. Proves i ajustos finals
