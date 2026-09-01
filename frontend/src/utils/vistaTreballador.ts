import { useState } from 'react';

const KEY = 'aitasa_vista_treballador';

export function useVistaTreballador(): [boolean, (actiu: boolean) => void] {
  const [actiu, setActiu] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  function canviar(nou: boolean) {
    setActiu(nou);
    try {
      localStorage.setItem(KEY, nou ? '1' : '0');
    } catch {
      // localStorage no disponible; el toggle només dura la sessió de la pestanya
    }
  }

  return [actiu, canviar];
}
