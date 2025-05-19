import { StudentJwtPayload } from '../../../Student/auth';
import { TeacherJwtPayload } from '../../../Teacher/auth';

declare global {
  namespace Express {
    interface Request {
      student?: StudentJwtPayload;
      teacher?: TeacherJwtPayload;
    }
  }
}