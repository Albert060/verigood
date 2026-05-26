import { QueryClient } from '@tanstack/react-query';

// Singleton compartido: se crea aquí para poder limpiar la caché
// desde el flujo de logout (api.js) sin depender de main.jsx.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
