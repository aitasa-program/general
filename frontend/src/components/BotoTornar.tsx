import { Link } from 'react-router-dom';
import Icona from './Icona';
export default function BotoTornar() { return <Link to="/dia-a-dia" className="back-link"><Icona nom="back" size={16} />Dia a dia</Link>; }
