import { Navigate } from 'react-router-dom';
import { getUsuariActual } from '../services/api';
import Capcalera from './Capcalera';

export default function RutaEncarregat({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  const usuari = getUsuariActual();
  if (usuari?.rol !== 'ENCARREGAT') {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <Capcalera />
      {children}
    </>
  );
}
