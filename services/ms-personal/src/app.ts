import express from 'express';
import cors from 'cors';
import { errorHandler, healthHandler, notFoundHandler, requestId } from '@arca/shared';
import { AppDataSource } from './data-source';

export const app = express();

app.disable('x-powered-by');
app.use(requestId);
app.use(cors());
app.use(express.json());

app.get('/health', healthHandler({ service: 'ms-personal', dataSource: AppDataSource }));

app.use(notFoundHandler);
app.use(errorHandler);
