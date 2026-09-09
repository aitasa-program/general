import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const GestioUsuaris = lazy(() => import('./pages/GestioUsuaris'));
const Checklists = lazy(() => import('./pages/Checklists'));
const Tasques = lazy(() => import('./pages/Tasques'));
const Recordatoris = lazy(() => import('./pages/Recordatoris'));
const Formularis = lazy(() => import('./pages/Formularis'));
const Inventari = lazy(() => import('./pages/Inventari'));
const Comptadors = lazy(() => import('./pages/Comptadors'));
const DiaADia = lazy(() => import('./pages/DiaADia'));
const TasquesReten = lazy(() => import('./pages/TasquesReten'));
const TasquesQuinzenals = lazy(() => import('./pages/TasquesQuinzenals'));
const TasquesQuinzenalsB = lazy(() => import('./pages/TasquesQuinzenalsB'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Fitxatge = lazy(() => import('./pages/Fitxatge'));
const RegistresControl = lazy(() => import('./pages/RegistresControl'));
const Mostres = lazy(() => import('./pages/Mostres'));
const Documentacio = lazy(() => import('./pages/Documentacio'));
import RutaProtegida from './components/RutaProtegida';
import RutaEncarregat from './components/RutaEncarregat';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loading-state" role="status">Carregant…</div>}><Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registres-control" element={<RutaProtegida><RegistresControl /></RutaProtegida>} />
        <Route path="/mostres" element={<RutaProtegida><Mostres /></RutaProtegida>} />
        <Route path="/documentacio" element={<RutaProtegida><Documentacio /></RutaProtegida>} />
        <Route
          path="/"
          element={
            <RutaProtegida>
              <Navigate to="/dia-a-dia" replace />
            </RutaProtegida>
          }
        />
        <Route
          path="/usuaris"
          element={
            <RutaEncarregat>
              <GestioUsuaris />
            </RutaEncarregat>
          }
        />
        <Route
          path="/checklists"
          element={
            <RutaProtegida>
              <Checklists />
            </RutaProtegida>
          }
        />
        <Route
          path="/tasques"
          element={
            <RutaProtegida>
              <Tasques />
            </RutaProtegida>
          }
        />
        <Route
          path="/recordatoris"
          element={
            <RutaProtegida>
              <Recordatoris />
            </RutaProtegida>
          }
        />
        <Route
          path="/formularis"
          element={
            <RutaProtegida>
              <Formularis />
            </RutaProtegida>
          }
        />
        <Route
          path="/inventari"
          element={
            <RutaProtegida>
              <Inventari />
            </RutaProtegida>
          }
        />
        <Route
          path="/comptadors"
          element={
            <RutaProtegida>
              <Comptadors />
            </RutaProtegida>
          }
        />
        <Route
          path="/dia-a-dia"
          element={
            <RutaProtegida>
              <DiaADia />
            </RutaProtegida>
          }
        />
        <Route
          path="/tasques-reten"
          element={
            <RutaEncarregat>
              <TasquesReten />
            </RutaEncarregat>
          }
        />
        <Route
          path="/tasques-quinzenals"
          element={
            <RutaEncarregat>
              <TasquesQuinzenals />
            </RutaEncarregat>
          }
        />
        <Route
          path="/tasques-quinzenals-b"
          element={
            <RutaEncarregat>
              <TasquesQuinzenalsB />
            </RutaEncarregat>
          }
        />
        <Route
          path="/vehicles"
          element={
            <RutaEncarregat>
              <Vehicles />
            </RutaEncarregat>
          }
        />
        <Route
          path="/fitxatge"
          element={
            <RutaProtegida>
              <Fitxatge />
            </RutaProtegida>
          }
        />
      <Route path="/menu" element={<RutaProtegida><Dashboard /></RutaProtegida>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>
    </BrowserRouter>
  );
}
