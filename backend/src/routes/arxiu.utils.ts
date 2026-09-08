import { NextFunction, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../prisma';

export function endpoint(fn: (req: AuthRequest, res: Response) => Promise<unknown>) {
  return (req: AuthRequest, res: Response, _next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch((error: unknown) => {
      if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues.map(i => i.message).join('. ') });
      if ((error as { code?: string })?.code === 'P2002') return res.status(409).json({ error: 'Aquest element ja existeix. Actualitza la pàgina abans de continuar.' });
      console.error('Error de l’arxiu:', error instanceof Error ? error.name : 'Unknown');
      return res.status(500).json({ error: 'No s’ha pogut completar l’operació. Torna-ho a provar.' });
    });
  };
}

// Les rutes d'arxiu comproven també que el compte encara estigui actiu.
export const compteActiu = (req: AuthRequest, res: Response, next: NextFunction) => {
  prisma.usuari.findUnique({ where: { id: req.usuari!.id }, select: { actiu: true, rol: true } }).then(u => {
    if (!u?.actiu) return res.status(403).json({ error: 'Compte inactiu' });
    req.usuari!.rol = u.rol;
    next();
  }).catch(next);
};

export function enviarFitxer(res: Response, bytes: Buffer, mime: string, filename: string) {
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="document.${filename.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin'}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/'/g, '%27')}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(bytes);
}
