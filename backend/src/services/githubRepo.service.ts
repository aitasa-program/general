// Accés mínim a l'API de GitHub (contents + git data) per llegir fitxers del
// repositori i aplicar-hi un commit amb diversos fitxers de cop, sense
// necessitar un checkout local de git al servidor.

const GITHUB_API = 'https://api.github.com';

class GithubApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function env(nom: string): string {
  const valor = process.env[nom];
  if (!valor) throw new Error(`Falta la variable d'entorn ${nom}`);
  return valor;
}

export function repoConfigurat(): boolean {
  return !!(process.env.IA_GITHUB_TOKEN && process.env.IA_GITHUB_REPO);
}

function repoInfo() {
  const repo = env('IA_GITHUB_REPO');
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error('IA_GITHUB_REPO ha de tenir el format "propietari/repositori"');
  return { owner, name };
}

export function brancaDestinacio(): string {
  return process.env.IA_GITHUB_BRANCH || 'main';
}

async function crida(path: string, init?: RequestInit): Promise<unknown> {
  const token = env('IA_GITHUB_TOKEN');
  const resposta = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!resposta.ok) {
    const text = await resposta.text().catch(() => '');
    throw new GithubApiError(resposta.status, `GitHub API ${resposta.status} a ${path}: ${text.slice(0, 500)}`);
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}

interface EntradaContingut { path: string; type: 'file' | 'dir' | 'symlink' | 'submodule' }
interface FitxerContingut { content: string; encoding: string }

export async function llistarDirectori(path: string, branch: string): Promise<{ path: string; tipus: 'file' | 'dir' }[]> {
  const { owner, name } = repoInfo();
  const net = path.replace(/^\/+/, '');
  try {
    const dades = (await crida(`/repos/${owner}/${name}/contents/${net}?ref=${encodeURIComponent(branch)}`)) as EntradaContingut | EntradaContingut[];
    const llista = Array.isArray(dades) ? dades : [dades];
    return llista.map((f) => ({ path: f.path, tipus: f.type === 'dir' ? 'dir' : 'file' }));
  } catch (e) {
    if (e instanceof GithubApiError && e.status === 404) return [];
    throw e;
  }
}

export async function llegirFitxer(path: string, branch: string): Promise<string | null> {
  const { owner, name } = repoInfo();
  const net = path.replace(/^\/+/, '');
  try {
    const dades = (await crida(`/repos/${owner}/${name}/contents/${net}?ref=${encodeURIComponent(branch)}`)) as FitxerContingut | EntradaContingut[];
    if (Array.isArray(dades)) throw new Error(`${path} és un directori, no un fitxer`);
    return Buffer.from(dades.content, 'base64').toString('utf-8');
  } catch (e) {
    if (e instanceof GithubApiError && e.status === 404) return null;
    throw e;
  }
}

export interface CanviFitxer { path: string; contingut: string | null }

// Crea un únic commit amb tots els canvis de fitxers indicats (afegir/modificar
// amb contingut, o eliminar amb contingut null) i avança la branca indicada.
// Retorna el sha del commit nou.
export async function aplicarCommit(fitxers: CanviFitxer[], missatge: string, branch: string): Promise<string> {
  const { owner, name } = repoInfo();
  const base = `/repos/${owner}/${name}`;

  const ref = (await crida(`${base}/git/ref/heads/${encodeURIComponent(branch)}`)) as { object: { sha: string } };
  const commitActual = (await crida(`${base}/git/commits/${ref.object.sha}`)) as { tree: { sha: string } };

  const treeEntries = await Promise.all(
    fitxers.map(async (f) => {
      const path = f.path.replace(/^\/+/, '');
      if (f.contingut === null) {
        return { path, mode: '100644', type: 'blob', sha: null };
      }
      const blob = (await crida(`${base}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: f.contingut, encoding: 'utf-8' }),
      })) as { sha: string };
      return { path, mode: '100644', type: 'blob', sha: blob.sha };
    })
  );

  const treeNou = (await crida(`${base}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: commitActual.tree.sha, tree: treeEntries }),
  })) as { sha: string };

  const commitNou = (await crida(`${base}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: missatge, tree: treeNou.sha, parents: [ref.object.sha] }),
  })) as { sha: string };

  await crida(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commitNou.sha }),
  });

  return commitNou.sha;
}
