import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { queryClient } from './queryClient';

// Una vez iniciado el logout, el interceptor NO debe volver a refrescar
// el token ni reescribir el estado (evita la re-autenticación automática).
let loggedOut = false;

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach token ──────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-refresh on 401 ──────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si ya estamos cerrando sesión, no intentes refrescar: deja pasar el error.
    if (error.response?.data?.error === 'TOKEN_EXPIRED' && !originalRequest._retry && !loggedOut) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        // Sin refresh token (ya deslogueado) no hay nada que renovar.
        if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        // El logout pudo dispararse mientras esperábamos: no reescribas el estado.
        if (loggedOut) return Promise.reject(error);

        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await doLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Logout centralizado ──────────────────────────────────────
// Único punto de cierre de sesión: invalida el refresh token vigente en
// backend, limpia estado global + persistencia + caché de React Query y
// redirige de forma dura para descartar cualquier petición en vuelo.
export async function doLogout() {
  if (loggedOut) return;
  loggedOut = true;

  const { refreshToken, logout } = useAuthStore.getState();

  // Invalida en backend el token rotativo ACTUAL (best-effort).
  if (refreshToken) {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch (_) {}
  }

  logout();           // limpia Zustand + localStorage (persist)
  queryClient.clear(); // descarta toda la caché de datos del usuario

  // Redirección dura: mata flags del interceptor y peticiones pendientes.
  window.location.assign('/login');
}

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// ── Organizations ────────────────────────────────────────────
export const orgApi = {
  get: (orgId) => api.get(`/organizations/${orgId}`),
  update: (orgId, data) => api.patch(`/organizations/${orgId}`, data),
  getStats: (orgId) => api.get(`/organizations/${orgId}/stats`),
  updateModules: (orgId, modules) => api.patch(`/organizations/${orgId}/modules`, { activeModules: modules }),
  getOnboardingState: (orgId) => api.get(`/organizations/${orgId}/onboarding-state`),
  completeOnboarding: (orgId) => api.post(`/organizations/${orgId}/onboarding-state/complete`),
};

// ── Modules (catálogo + activación por organización) ─────────
export const modulesApi = {
  listCatalog: () => api.get('/modules'),
  listOrgModules: (orgId) => api.get(`/organizations/${orgId}/modules`),
  activate: (orgId, moduleId) => api.post(`/organizations/${orgId}/modules/${moduleId}/activate`),
  deactivate: (orgId, moduleId) => api.delete(`/organizations/${orgId}/modules/${moduleId}`),
};

// ── Module tools (catálogo de herramientas + ejecución) ──────
export const moduleToolsApi = {
  list: (moduleId) => api.get(`/modules/${moduleId}/tools`),
  run: (moduleId, toolKey, input) =>
    api.post(`/modules/${moduleId}/tools/${toolKey}/run`, { input }, { timeout: 90000 }),
};

// ── Users ────────────────────────────────────────────────────
export const usersApi = {
  getAll: (orgId, params) => api.get(`/organizations/${orgId}/users`, { params }),
  create: (orgId, data) => api.post(`/organizations/${orgId}/users`, data),
  update: (userId, data) => api.patch(`/users/${userId}`, data),
  delete: (userId) => api.delete(`/users/${userId}`),
};

// ── Cambridge ────────────────────────────────────────────────
export const cambridgeApi = {
  generateExam: (data) => api.post('/cambridge/exams/generate', data),
  saveExam: (data) => api.post('/cambridge/exams/save', data),
  getExams: (params) => api.get('/cambridge/exams', { params }),
  correctOcr: (formData) =>
    api.post('/cambridge/ocr/correct', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }),
  generateDynamics: (data) => api.post('/cambridge/dynamics/generate', data),
  generatePresentation: (data) => api.post('/cambridge/presentations/generate', data),
};

// ── Lengua ───────────────────────────────────────────────────
export const lenguaApi = {
  generateExercises: (data) => api.post('/lengua/exercises/generate', data),
  correctEssay: (data) => api.post('/lengua/essays/correct', data),
  analyzeSyntax: (data) => api.post('/lengua/syntax/analyze', data),
  generateCommentary: (data) => api.post('/lengua/commentary/generate', data),
  generateDynamics: (data) => api.post('/lengua/dynamics/generate', data),
};

// ── Matemáticas ──────────────────────────────────────────────
export const matematicasApi = {
  generateProblems: (data) => api.post('/matematicas/problems/generate', data),
  correctPhoto: (formData) =>
    api.post('/matematicas/correct/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }),
  generateSeries: (data) => api.post('/matematicas/series/generate', data),
};

// ── Conocimiento del Medio ────────────────────────────────────
export const medioApi = {
  generateSheet: (data) => api.post('/medio/sheets/generate', data),
  generateQuiz: (data) => api.post('/medio/quizzes/generate', data),
  generateDynamics: (data) => api.post('/medio/dynamics/generate', data),
};

// ── Stripe ───────────────────────────────────────────────────
export const stripeApi = {
  getPlans: () => api.get('/stripe/plans'),
  checkout: (plan) => api.post('/stripe/checkout', { plan }),
  portal: () => api.post('/stripe/portal'),
};

// ── PDF / Demo status ────────────────────────────────────────
export const pdfApi = {
  status: () => api.get('/pdf/status'),
  render: ({ type, data, title, subtitle, moduleKey, filename }) =>
    api.post(
      '/pdf/render',
      { type, data, title, subtitle, moduleKey, filename },
      { responseType: 'blob', timeout: 60000 }
    ),
  download: async ({ type, data, title, subtitle, moduleKey, filename }) => {
    const res = await pdfApi.render({ type, data, title, subtitle, moduleKey, filename });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(filename || type || 'verigood').replace(/[^a-z0-9_\-]/gi, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },
};

// ── Superadmin ───────────────────────────────────────────────
export const superadminApi = {
  getOrgs: (params) => api.get('/superadmin/organizations', { params }),
  updateOrg: (orgId, data) => api.patch(`/superadmin/organizations/${orgId}`, data),
  getStats: () => api.get('/superadmin/stats'),
};

export default api;
