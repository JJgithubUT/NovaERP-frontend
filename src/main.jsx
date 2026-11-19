import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { queryClient } from './core/query/query-client';
import { arrancarSesion } from './core/auth/auth.service';
import { arrancarSesionPlataforma } from './core/plataforma/plataforma.service';
import { registroPwa } from './core/pwa/pwa-registro';
import { router } from './app/router';
/*
 * Refresca el contexto de las dos superficies antes del primer render, sin
 * esperarlo: el shell se pinta al instante con el `me` cacheado y los
 * roles/módulos se actualizan cuando la respuesta llegue. Es lo que hace que el
 * usuario vea la app, no un spinner, aunque el backend tarde o no esté.
 */
arrancarSesion();
arrancarSesionPlataforma();
/*
 * El SW se registra aquí y no dentro del shell: así también queda instalado en
 * las pantallas públicas, y la primera visita al login ya precachea la app.
 */
registroPwa.iniciar();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);