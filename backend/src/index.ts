import mostresRoutes from './routes/mostres.routes';
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
import fotosProductesRoutes from './routes/fotosProductes.routes';
import pushRoutes from './routes/push.routes';
import retenRoutes from './routes/reten.routes';
import quinzenaRoutes from './routes/quinzena.routes';
import quinzenaBRoutes from './routes/quinzenaB.routes';
import comptadorsRoutes from './routes/comptadors.routes';
import vehiclesRoutes from './routes/vehicles.routes';
import fitxatgeRoutes from './routes/fitxatge.routes';
import registreRetenRoutes from './routes/registreReten.routes';
import controlsRoutes from './routes/controls.routes';
import documentacioRoutes from './routes/documentacio.routes';
import iaModificacionsRoutes from './routes/iaModificacions.routes';
import configPdfRoutes from './routes/configPdf.routes';
import notesPersonalsRoutes from './routes/notesPersonals.routes';
import avariesRoutes from './routes/avaries.routes';
import { iniciarPlanificadorRecordatoris } from './services/scheduler.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
// Els adjunts tenen un límit propi i requereixen autenticació abans de llegir-los.
app.use('/api/documentacio', documentacioRoutes);
app.use('/api/controls', controlsRoutes);
app.use('/api/fotos-productes', fotosProductesRoutes);
app.use('/api/ia-modificacions', iaModificacionsRoutes);
app.use('/api/config-pdf', configPdfRoutes);
app.use('/api/notes-personals', notesPersonalsRoutes);
app.use('/api/avaries', avariesRoutes);
app.use(express.json());
app.use('/api/mostres', mostresRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/usuaris', usuarisRoutes);
app.use('/api/tasques', tasquesRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/recordatoris', recordatorisRoutes);
app.use('/api/formularis', formularisRoutes);
app.use('/api/inventari', inventariRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/reten', retenRoutes);
app.use('/api/quinzena', quinzenaRoutes);
app.use('/api/quinzena-b', quinzenaBRoutes);
app.use('/api/comptadors', comptadorsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/fitxatge', fitxatgeRoutes);
app.use('/api/registre-reten', registreRetenRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor AITASA backend escoltant al port ${PORT}`);
  iniciarPlanificadorRecordatoris();
  console.log('Planificador de recordatoris iniciat (revisió cada minut)');
});
