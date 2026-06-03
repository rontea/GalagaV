import { Request, Response, NextFunction } from 'express';

export class TodosMiddleware {
  static validateContributors(req: Request, res: Response, next: NextFunction) {
    const contributor = req.body;
    if (!contributor || !contributor.name) {
      res.status(400).json({ success: false, message: 'Contributor name is required' });
      return;
    }
    next();
  }
}
