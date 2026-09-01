import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'canvia_aquest_secret';

export interface AuthRequest extends Request {
  usuari?: { id: string; rol: 'TREBALLADOR' | 'ENCARREGAT' };
}

// Comprova que hi ha un token vàlid i afegeix l'usuari a la request
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const capçalera = req.headers.authorization;
  if (!capçalera || !capçalera.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionat' });
  }
  const token = capçalera.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; rol: 'TREBALLADOR' | 'ENCARREGAT' };
    req.usuari = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invàlid o caducat' });
  }
}

// Permet l'accés només a encarregats
export function requireEncarregat(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.usuari?.rol !== 'ENCARREGAT') {
    return res.status(403).json({ error: 'Acció reservada a encarregats' });
  }
  next();
}
