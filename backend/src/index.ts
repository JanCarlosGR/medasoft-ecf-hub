import express, { Request, Response } from 'express';
import cors from 'cors';
import invoiceRoutes from './routes/invoiceRoutes';
import dgiiRoutes from './routes/dgiiRoutes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Logger de auditoría para cada petición de comprobante fiscal
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[AUDIT] ${req.method} ${req.originalUrl} -> Status ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rutas API
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dgii', dgiiRoutes);

// Endpoint de Salud
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    system: 'Medasoft e-CF Hub Core API',
    version: '1.0.0',
    compliance: 'DGII Ley 32-23 República Dominicana',
    timestamp: new Date().toISOString()
  });
});

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Medasoft e-CF Hub API iniciada en el puerto ${PORT}`);
  console.log(` Ambiente: PRODUCCIÓN (Certificación DGII)`);
  console.log(` Rutas disponibles:`);
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/dgii/status`);
  console.log(`   - GET  /api/invoices`);
  console.log(`   - GET  /api/invoices/stats`);
  console.log(`   - POST /api/invoices`);
  console.log(`   - POST /api/invoices/validate-ncf`);
  console.log(`=======================================================`);
});

export default app;
