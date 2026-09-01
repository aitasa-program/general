import { Navigate } from 'react-router-dom';
import Capcalera from './Capcalera';

export default function RutaProtegida({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Capcalera />
      {children}
    </>
  );
}
