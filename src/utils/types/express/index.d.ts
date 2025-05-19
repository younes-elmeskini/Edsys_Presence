import { JwtPayload } from '../../../middlewares/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}