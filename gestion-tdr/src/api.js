import { createContext, useContext } from 'react';

async function requete(methode, url, corps) {
  const r = await fetch(url, {
    method: methode,
    headers: corps ? { 'Content-Type': 'application/json' } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.erreur || `Erreur ${r.status}`);
  return data;
}

export const api = {
  get: (u) => requete('GET', u),
  post: (u, b) => requete('POST', u, b ?? {}),
  put: (u, b) => requete('PUT', u, b),
  del: (u) => requete('DELETE', u),
};

export const RefContext = createContext(null);
export const useRef_ = () => useContext(RefContext);
