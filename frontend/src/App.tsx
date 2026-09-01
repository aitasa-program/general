import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GestioUsuaris from './pages/GestioUsuaris';
import Checklists from './pages/Checklists';
import Tasques from './pages/Tasques';
import Recordatoris from './pages/Recordatoris';
import Formularis from './pages/Formularis';
import Inventari from './pages/Inventari';
import RutaProtegida from './components/RutaProtegida';
import RutaEncarregat from './components/RutaEncarregat';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RutaProtegida>
              <Dashboard />
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
      </Routes>
    </BrowserRouter>
  );
}
