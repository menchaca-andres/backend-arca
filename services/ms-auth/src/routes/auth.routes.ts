import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { loginSchema } from '../schemas/auth.schema';

export const authRouter = Router();

const controller = new AuthController();

authRouter.post('/login', validateBody(loginSchema), controller.login);
authRouter.get('/me', controller.me);
