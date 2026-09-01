import ChecklistsView from '../components/ChecklistsView';

export default function Comptadors() {
  return (
    <ChecklistsView
      categoria="COMPTADOR"
      titol="Comptadors"
      nomBotoNou="+ Nou comptador"
      placeholderItems={'Comptador de palets zona A\nComptador de palets zona B\nComptador d\'entrades'}
    />
  );
}
