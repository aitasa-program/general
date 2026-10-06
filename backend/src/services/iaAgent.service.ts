import Anthropic from '@anthropic-ai/sdk';
import { llegirFitxer, llistarDirectori } from './githubRepo.service';

export function iaConfigurada(): boolean {
  return !!process.env.IA_ANTHROPIC_API_KEY;
}

function client(): Anthropic {
  const apiKey = process.env.IA_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta la variable d'entorn IA_ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey });
}

const SISTEMA = `Ets la IA de "Modificacions APP" de AITASA, una aplicació de gestió de magatzem i tasques per a una empresa.

Estructura del repositori:
- backend/: API REST amb Node.js + Express + TypeScript + Prisma + PostgreSQL. Rutes a backend/src/routes, lògica a backend/src/services, esquema de base de dades a backend/prisma/schema.prisma. Com que no hi ha connexió a cap base de dades des d'on tu treballes, els canvis d'esquema de Prisma s'han d'acompanyar sempre d'un fitxer de migració SQL escrit a mà a backend/prisma/migrations/<timestamp>_<nom>/migration.sql (timestamp amb format AAAAMMDDHHMMSS, posterior al de l'última migració existent), seguint exactament l'estil de les migracions existents.
- frontend/: aplicació web (PWA) amb React + TypeScript + Vite. Pàgines a frontend/src/pages, components a frontend/src/components, crides a l'API a frontend/src/services.
- Tota la interfície i els noms de camps/variables estan en català.
- Patrons habituals: middleware requireAuth (sessió iniciada) i requireEncarregat (només administradors) a les rutes backend; components RutaProtegida i RutaEncarregat al frontend per protegir pàgines.

La teva feina:
1. Fes servir les eines llistar_fitxers i llegir_fitxer per explorar el codi existent i entendre com estan fets els patrons rellevants (rutes similars, pàgines similars, l'esquema de Prisma, etc.) abans de escriure cap canvi.
2. Quan ja tinguis clar què cal canviar, crida l'eina proposar_canvis UNA SOLA VEGADA, amb el contingut COMPLET I FINAL de cada fitxer que cal crear o modificar (no diffs parcials, el fitxer sencer tal com ha de quedar), seguint l'estil de codi existent (noms en català, mateixos patrons de middleware/validació, mateix estil de formatatge que el fitxer que estàs editant).
3. Si el canvi necessita un model nou o camps nous a la base de dades, inclou també el fitxer de migració SQL corresponent.
4. No inventis fitxers o patrons que no existeixin: comprova sempre el codi real abans de dir que un patró funciona d'una manera concreta.
5. Mantén els canvis al mínim necessari per complir la petició. No reformatis ni refactoritzis codi que no calgui tocar.
6. El resum ha de ser breu i en català, explicant què farà el canvi des del punt de vista de qui l'ha demanat (no detalls tècnics interns).
7. Si la petició és ambigua o molt arriscada (per exemple, esborrar dades, canviar permisos de seguretat de manera perillosa), proposa la versió més segura i raonable, i explica-ho al resum.`;

const eines: Anthropic.Tool[] = [
  {
    name: 'llistar_fitxers',
    description: "Llista els fitxers i directoris dins d'un directori del repositori, a la branca de treball. Passa path buit ('') per veure l'arrel del repositori.",
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: "Directori a llistar, relatiu a l'arrel del repositori. Buit per l'arrel." } },
      required: ['path'],
    },
  },
  {
    name: 'llegir_fitxer',
    description: "Llegeix el contingut complet d'un fitxer del repositori, a la branca de treball.",
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: "Camí del fitxer, relatiu a l'arrel del repositori, per exemple 'backend/src/routes/inventari.routes.ts'." } },
      required: ['path'],
    },
  },
  {
    name: 'proposar_canvis',
    description: 'Finalitza la teva feina proposant el conjunt complet de canvis de fitxers que cal aplicar. Crida aquesta eina una sola vegada, quan ja hagis explorat prou el codi.',
    input_schema: {
      type: 'object',
      properties: {
        resum: { type: 'string', description: 'Resum breu en català, pensat per a qui ha demanat el canvi (no tècnic), del que farà aquest canvi un cop desplegat.' },
        missatgeCommit: { type: 'string', description: 'Missatge de commit de git, curt, en català.' },
        fitxers: {
          type: 'array',
          description: 'Tots els fitxers que cal crear o modificar, amb el seu contingut final complet.',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', description: "Camí del fitxer relatiu a l'arrel del repositori." },
              contingut: { type: 'string', description: 'Contingut final complet del fitxer.' },
            },
            required: ['path', 'contingut'],
          },
        },
      },
      required: ['resum', 'missatgeCommit', 'fitxers'],
    },
  },
];

export interface FitxerProposat { path: string; contingut: string }
export interface PropostaResultat { resum: string; missatgeCommit: string; fitxers: FitxerProposat[] }

async function executarEina(toolUse: Anthropic.ToolUseBlock, branch: string): Promise<string> {
  if (toolUse.name === 'llistar_fitxers') {
    const { path } = (toolUse.input as { path?: string }) || {};
    const llista = await llistarDirectori(path || '', branch);
    if (!llista.length) return '(directori buit o inexistent)';
    return llista.map((f) => (f.tipus === 'dir' ? `[dir] ${f.path}` : f.path)).join('\n');
  }
  if (toolUse.name === 'llegir_fitxer') {
    const { path } = (toolUse.input as { path?: string }) || {};
    if (!path) throw new Error('Cal indicar el camí del fitxer');
    const contingut = await llegirFitxer(path, branch);
    return contingut === null ? 'El fitxer no existeix.' : contingut;
  }
  throw new Error(`Eina desconeguda: ${toolUse.name}`);
}

const MAX_TORNS = 20;

export async function demanarCanvi(prompt: string, branch: string): Promise<PropostaResultat> {
  const model = process.env.IA_MODIFICACIONS_MODEL || 'claude-sonnet-5-5';
  const anthropic = client();
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }];

  for (let torn = 0; torn < MAX_TORNS; torn++) {
    const resposta = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      system: SISTEMA,
      tools: eines,
      messages,
    });
    messages.push({ role: 'assistant', content: resposta.content as unknown as Anthropic.ContentBlockParam[] });

    const usosEina = resposta.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const proposta = usosEina.find((b) => b.name === 'proposar_canvis');
    if (proposta) {
      const input = proposta.input as PropostaResultat;
      if (!input?.fitxers?.length) throw new Error('La IA no ha proposat cap fitxer per canviar.');
      return input;
    }
    if (!usosEina.length) {
      throw new Error('La IA no ha arribat a proposar cap canvi concret. Prova de descriure la petició amb més detall.');
    }

    const resultats: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of usosEina) {
      try {
        resultats.push({ type: 'tool_result', tool_use_id: toolUse.id, content: await executarEina(toolUse, branch) });
      } catch (e) {
        resultats.push({ type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${(e as Error).message}`, is_error: true });
      }
    }
    messages.push({ role: 'user', content: resultats });
  }

  throw new Error('La IA no ha acabat de preparar els canvis (massa passos). Prova amb una petició més concreta i petita.');
}
