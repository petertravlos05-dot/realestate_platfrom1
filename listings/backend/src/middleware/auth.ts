import { Request, Response, NextFunction } from 'express';
import { getSession } from 'next-auth/react';

interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

declare module 'next-auth' {
  interface Session {
    user: User;
  }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const session = await getSession({ req });
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const session = await getSession({ req });
  
  if (!session?.user || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}; 