import { Request, Response, NextFunction } from 'express';

export function requireAHAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.ahTokens) {
    res.status(401).json({ error: 'Niet ingelogd bij Albert Heijn' });
    return;
  }
  next();
}
