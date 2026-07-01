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
  listUserModules: (userId) => api.get(`/users/${userId}/modules`),
  assignUserModule: (userId, moduleId) => api.post(`/users/${userId}/modules/${moduleId}`),
  unassignUserModule: (userId, moduleId) => api.delete(`/users/${userId}/modules/${moduleId}`),
};

// ── Syllabus (Temario del módulo — Fase D) ───────────────────
export const syllabusApi = {
  get:              (moduleId) => api.get(`/modules/${moduleId}/syllabus`),
  createSection:    (moduleId, data) => api.post(`/modules/${moduleId}/syllabus/sections`, data),
  updateSection:    (sectionId, data) => api.patch(`/syllabus/sections/${sectionId}`, data),
  deleteSection:    (sectionId) => api.delete(`/syllabus/sections/${sectionId}`),
  createItem:       (sectionId, data) => api.post(`/syllabus/sections/${sectionId}/items`, data),
  getItem:          (itemId) => api.get(`/syllabus/items/${itemId}`),
  listCorrections:  (itemId) => api.get(`/syllabus/items/${itemId}/corrections`),
  updateItem:       (itemId, data) => api.patch(`/syllabus/items/${itemId}`, data),
  deleteItem:       (itemId) => api.delete(`/syllabus/items/${itemId}`),
};

// ── Module tools (catálogo de herramientas + ejecución) ──────
export const moduleToolsApi = {
  list: (moduleId) => api.get(`/modules/${moduleId}/tools`),
  run: (moduleId, toolKey, input) =>
    api.post(`/modules/${moduleId}/tools/${toolKey}/run`, { input }, { timeout: 90000 }),
};

// ── Notifications (in-app) ───────────────────────────────────
export const notificationsApi = {
  list:          (params) => api.get('/notifications', { params }),
  unreadCount:   () => api.get('/notifications/unread-count'),
  markRead:      (id) => api.post(`/notifications/${id}/read`),
  markAllRead:   () => api.post('/notifications/read-all'),
  remove:        (id) => api.delete(`/notifications/${id}`),
};

// ── Library (biblioteca unificada de outputs) ────────────────
export const libraryApi = {
  list:   (params) => api.get('/library/items', { params }),
  get:    (id)     => api.get(`/library/items/${id}`),
  create: (data)   => api.post('/library/items', data),
  update: (id, data) => api.patch(`/library/items/${id}`, data),
  remove: (id)     => api.delete(`/library/items/${id}`),
};

// ── Module OCR (corrector OCR por asignatura) ────────────────
export const moduleOcrApi = {
  getConfig: (moduleId) => api.get(`/modules/${moduleId}/ocr/config`),
  correct: (moduleId, formData) =>
    api.post(`/modules/${moduleId}/ocr/correct`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    }),
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
  getExam: (id) => api.get(`/cambridge/exams/${id}`),
  deleteExam: (id) => api.delete(`/cambridge/exams/${id}`),
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
  getInvoices: () => api.get('/stripe/invoices'),
  getInvoice: (id) => api.get(`/stripe/invoices/${id}`),
};

// ── Anthropic (clave por organización) ───────────────────────
export const anthropicApi = {
  getStatus: (orgId) => api.get(`/organizations/${orgId}/anthropic`),
  setKey:    (orgId, apiKey) => api.put(`/organizations/${orgId}/anthropic`, { apiKey }),
  clear:     (orgId) => api.delete(`/organizations/${orgId}/anthropic`),
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
  getBilling: () => api.get('/superadmin/billing'),
  getOrgBilling: (orgId) => api.get(`/superadmin/billing/${orgId}`),
  getUsers: (params) => api.get('/superadmin/users', { params }),
};

export default api;
