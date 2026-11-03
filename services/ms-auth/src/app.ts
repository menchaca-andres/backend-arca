import express from 'express';
import cors from 'cors';
import { errorHandler, healthHandler, notFoundHandler, requestId } from '@arca/shared';
import { AppDataSource } from './data-source';
import { authRouter } from './routes/auth.routes';

export const app = express();

app.disable('x-powered-by');
app.use(requestId);
app.use(cors());
app.use(express.json());

app.get('/health', healthHandler({ service: 'ms-auth', dataSource: AppDataSource }));

/**
 * El gateway monta el proxy en /api y quita ese prefijo, así que el servicio
 * recibe /auth/login y /auth/me.
 */
app.use('/auth', authRouter);

app.use(notFoundHandler);
app.use(errorHandler);
