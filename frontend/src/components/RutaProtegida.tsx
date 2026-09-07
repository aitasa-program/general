import { Navigate } from 'react-router-dom';
import AppShell from './AppShell';

export default function RutaProtegida({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <AppShell>{children}</AppShell>
  );
}
