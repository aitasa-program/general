import { Link } from 'react-router-dom';

export default function BotoTornar() {
  return (
    <Link to="/" style={{ display: 'inline-block', marginBottom: 12, color: '#555', textDecoration: 'none' }}>
      ← Tornar
    </Link>
  );
}
