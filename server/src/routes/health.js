import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    name: 'Cendekia Muda API',
    stage: 'foundation',
    endpoints: { health: '/api/health' },
    database: 'not_connected'
  });
});

healthRouter.get('/health', (req, res) => {
  // Liveness only: no database connection has been implemented yet.
  res.json({
    status: 'ok',
    service: 'cendekia-muda-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});
