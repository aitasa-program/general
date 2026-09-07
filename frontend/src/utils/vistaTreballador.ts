import { useSyncExternalStore } from 'react';
const KEY = 'aitasa_vista_treballador';
const EVENT = 'aitasa-vista-change';
function read() { return localStorage.getItem(KEY) === '1'; }
function subscribe(callback: () => void) {
 window.addEventListener(EVENT, callback);
 window.addEventListener('storage', callback);
 return () => { window.removeEventListener(EVENT, callback); window.removeEventListener('storage', callback); };
}
export function useVistaTreballador(): [boolean, (actiu: boolean) => void] {
 const actiu = useSyncExternalStore(subscribe, read);
 return [actiu, (nou) => { localStorage.setItem(KEY, nou ? '1' : '0'); window.dispatchEvent(new Event(EVENT)); }];
}
