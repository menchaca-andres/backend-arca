import { Router } from 'express';
import { FuncionarioInternalController } from '../controllers/funcionario.internal.controller';

export function createFuncionarioInternalRouter(controller = new FuncionarioInternalController()) {
  const router = Router();
  router.get('/funcionarios', controller.listar);
  router.get('/funcionarios/:id', controller.obtener);
  return router;
}

export const funcionarioInternalRouter = createFuncionarioInternalRouter();
