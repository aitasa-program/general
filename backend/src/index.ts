import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import usuarisRoutes from './routes/usuaris.routes';
import tasquesRoutes from './routes/tasques.routes';
import checklistsRoutes from './routes/checklists.routes';
import recordatorisRoutes from './routes/recordatoris.routes';
import formularisRoutes from './routes/formularis.routes';
import inventariRoutes from './routes/inventari.routes';
import pushRoutes from './routes/push.routes';
import retenRoutes from './routes/reten.routes';
import { iniciarPlanificadorRecordatoris } from './services/scheduler.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuaris', usuarisRoutes);
app.use('/api/tasques', tasquesRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/recordatoris', recordatorisRoutes);
app.use('/api/formularis', formularisRoutes);
app.use('/api/inventari', inventariRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/reten', retenRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor AITASA backend escoltant al port ${PORT}`);
  iniciarPlanificadorRecordatoris();
  console.log('Planificador de recordatoris iniciat (revisió cada minut)');
});
