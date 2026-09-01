import { Tasca } from '../services/tasques';
import { Checklist } from '../services/checklists';

// Mateix criteri que fa servir el backend per decidir què veu un treballador,
// per poder-lo aplicar al frontend quan un encarregat activa la vista de treballador.
export function tasquesMeves(tasques: Tasca[], usuariId: string): Tasca[] {
  return tasques.filter(
    (t) =>
      t.assignatsA.some((u) => u.id === usuariId) ||
      (t.assignatAlReten && t.retenResolt?.id === usuariId) ||
      (t.assignatAQuinzena && t.quinzenaResolt?.id === usuariId) ||
      (t.assignatAQuinzenaB && t.quinzenaBResolt?.id === usuariId)
  );
}

export function checklistsMeves(checklists: Checklist[], usuariId: string): Checklist[] {
  return checklists.filter(
    (c) =>
      c.assignatAId === usuariId ||
      (c.assignatAlReten && c.retenResolt?.id === usuariId) ||
      (c.assignatAQuinzena && c.quinzenaResolt?.id === usuariId) ||
      (c.assignatAQuinzenaB && c.quinzenaBResolt?.id === usuariId)
  );
}
