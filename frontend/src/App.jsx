import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { modulesApi } from './services/api';

// Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Landing
import LandingPage from './pages/landing/LandingPage';

// Superadmin
import SuperadminLayout from './pages/superadmin/SuperadminLayout';
import SuperadminDashboard from './pages/superadmin/Dashboard';
import SuperadminOrganizations from './pages/superadmin/Organizations';
import SuperadminUsers from './pages/superadmin/Users';
import SuperadminModules from './pages/superadmin/Modules';
import SuperadminBilling from './pages/superadmin/Billing';
import SuperadminSystem from './pages/superadmin/System';

// Institutional (admin colegio)
import InstitutionalLayout from './pages/institutional/InstitutionalLayout';
import InstitutionalDashboard from './pages/institutional/Dashboard';
import InstitutionalUsers from './pages/institutional/Users';
import InstitutionalModules from './pages/institutional/Modules';
import InstitutionalResources from './pages/institutional/Resources';
import InstitutionalResourceDetail from './pages/institutional/ResourceDetail';
import InstitutionalStats from './pages/institutional/Stats';
import InstitutionalBilling from './pages/institutional/Billing';
import AnthropicSetup from './pages/institutional/AnthropicSetup';

// Cambridge
import CambridgeLayout from './pages/cambridge/CambridgeLayout';
import CambridgeHome from './pages/cambridge/Home';
import ExamGenerator from './pages/cambridge/ExamGenerator';
import OcrCorrector from './pages/cambridge/OcrCorrector';
import DynamicsGenerator from './pages/cambridge/DynamicsGenerator';
import PresentationGenerator from './pages/cambridge/PresentationGenerator';
import ExamsList from './pages/cambridge/ExamsList';
import ExamDetail from './pages/cambridge/ExamDetail';

// Lengua
import LenguaLayout from './pages/lengua/LenguaLayout';
import LenguaHome from './pages/lengua/Home';
import LenguaExercises from './pages/lengua/ExerciseGenerator';
import LenguaCorrector from './pages/lengua/EssayCorrector';
import LenguaSyntax from './pages/lengua/SyntaxAnalysis';
import LenguaCommentary from './pages/lengua/TextCommentary';
import LenguaDynamics from './pages/lengua/LenguaDynamics';

// Matemáticas
import MatematicasLayout from './pages/matematicas/MatematicasLayout';
import MatematicasHome from './pages/matematicas/Home';
import MatematicasProblems from './pages/matematicas/ProblemGenerator';
import MatematicasPhoto from './pages/matematicas/PhotoCorrector';
import MatematicasSeries from './pages/matematicas/ExerciseSeries';

// Layout/páginas genéricas para módulos con tools del catálogo nuevo
import ModuleLayout from './pages/module/ModuleLayout';
import ModuleHome from './pages/module/ModuleHome';
import ToolPage from './pages/module/ToolPage';
import ModuleOcrPage from './pages/module/ModuleOcrPage';

// Conocimiento del Medio
import MedioLayout from './pages/medio/MedioLayout';
import MedioHome from './pages/medio/Home';
import MedioSheets from './pages/medio/ThematicSheets';
import MedioQuizzes from './pages/medio/Questionnaires';
import MedioDynamics from './pages/medio/STEMActivities';

// ── Protected route ───────────────────────────────────────────
// Para la comprobación de módulo activo NO usamos `user.activeModules`
// (vive en el JWT y no se refresca al toggle desde el panel admin).
// Usamos la misma queryKey que la sidebar y el panel: una sola fuente
// de verdad, refresco instantáneo tras activar/desactivar.
function ProtectedRoute({ children, roles = [], module }) {
  const { isAuthenticated, user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['modules', 'org', orgId],
    queryFn: () => modulesApi.listOrgModules(orgId).then((r) => r.data),
    enabled: !!orgId && !!module,
    staleTime: 60_000,
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (module) {
    // Mientras carga, evitamos el flash de redirect.
    if (isLoading) return null;
    const ids = new Set((data?.modules || []).map((m) => m.id));
    if (!ids.has(module)) return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ── Root redirect ─────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/bienvenida" replace />;
  if (user?.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/bienvenida" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Superadmin */}
        <Route
          path="/superadmin"
          element={<ProtectedRoute roles={['superadmin']}><SuperadminLayout /></ProtectedRoute>}
        >
          <Route index element={<SuperadminDashboard />} />
          <Route path="organizations" element={<SuperadminOrganizations />} />
          <Route path="users" element={<SuperadminUsers />} />
          <Route path="modules" element={<SuperadminModules />} />
          <Route path="billing" element={<SuperadminBilling />} />
          <Route path="system" element={<SuperadminSystem />} />
        </Route>

        {/* Institutional (admin_centro) */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute roles={['admin_centro', 'profesor']}><InstitutionalLayout /></ProtectedRoute>}
        >
          <Route index element={<InstitutionalDashboard />} />
          <Route path="users" element={<ProtectedRoute roles={['admin_centro']}><InstitutionalUsers /></ProtectedRoute>} />
          <Route path="modules" element={<ProtectedRoute roles={['admin_centro']}><InstitutionalModules /></ProtectedRoute>} />
          <Route path="resources" element={<InstitutionalResources />} />
          <Route path="resources/:id" element={<InstitutionalResourceDetail />} />
          <Route path="stats" element={<ProtectedRoute roles={['admin_centro']}><InstitutionalStats /></ProtectedRoute>} />
          <Route path="billing" element={<ProtectedRoute roles={['admin_centro']}><InstitutionalBilling /></ProtectedRoute>} />
          <Route path="anthropic" element={<ProtectedRoute roles={['admin_centro']}><AnthropicSetup /></ProtectedRoute>} />
        </Route>

        {/* Cambridge */}
        <Route
          path="/cambridge"
          element={<ProtectedRoute module="cambridge"><CambridgeLayout /></ProtectedRoute>}
        >
          <Route index element={<CambridgeHome />} />
          <Route path="exams/new" element={<ExamGenerator />} />
          <Route path="exams" element={<ExamsList />} />
          <Route path="exams/:id" element={<ExamDetail />} />
          <Route path="ocr" element={<OcrCorrector />} />
          <Route path="dynamics" element={<DynamicsGenerator />} />
          <Route path="presentations" element={<PresentationGenerator />} />
        </Route>

        {/* Lengua */}
        <Route
          path="/lengua"
          element={<ProtectedRoute module="espanol"><LenguaLayout /></ProtectedRoute>}
        >
          <Route index element={<LenguaHome />} />
          <Route path="ejercicios" element={<LenguaExercises />} />
          <Route path="redaccion" element={<LenguaCorrector />} />
          <Route path="sintaxis" element={<LenguaSyntax />} />
          <Route path="comentario" element={<LenguaCommentary />} />
          <Route path="dinamicas" element={<LenguaDynamics />} />
        </Route>

        {/* Matemáticas */}
        <Route
          path="/matematicas"
          element={<ProtectedRoute module="matematicas"><MatematicasLayout /></ProtectedRoute>}
        >
          <Route index element={<MatematicasHome />} />
          <Route path="problemas" element={<MatematicasProblems />} />
          <Route path="corrector" element={<MatematicasPhoto />} />
          <Route path="series" element={<MatematicasSeries />} />
        </Route>

        {/* Conocimiento del Medio */}
        <Route
          path="/medio"
          element={<ProtectedRoute module="medio"><MedioLayout /></ProtectedRoute>}
        >
          <Route index element={<MedioHome />} />
          <Route path="fichas" element={<MedioSheets />} />
          <Route path="cuestionarios" element={<MedioQuizzes />} />
          <Route path="stem" element={<MedioDynamics />} />
        </Route>

        {/* Alias: la sidebar enlaza Cambridge desde /eso/cambridge */}
        <Route path="/eso/cambridge" element={<Navigate to="/cambridge" replace />} />

        {/* Módulos del catálogo sin layout propio (placeholder).
            Cuando un módulo gane su layout real, sustituir su línea aquí. */}
        {/* Módulos con tools del catálogo nuevo → ModuleLayout genérico.
            Cada uno expone una landing (ModuleHome) y una sub-ruta :toolKey
            renderizada por ToolPage. La protección por módulo activo la hace
            el propio backend en cada /run; aquí solo guardamos por rol. */}
        <Route path="/primaria/ingles"     element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="ingles_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/plastica"   element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="plastica_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/musica"     element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="musica_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/religion"   element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="religion_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/ciudadania" element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="ciudadania_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/ingles"          element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="ingles_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/geh"             element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="geo_historia_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/byg"             element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="bio_geo_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/fyq"             element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="fis_quim_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/religion"        element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="religion_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>

        {/* Resto de módulos del catálogo con tools → ModuleLayout genérico. */}
        <Route path="/primaria/matematicas"  element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="matematicas_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/lengua"       element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="lengua_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/medio"        element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="medio_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/ed-fisica"    element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="ed_fisica_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/primaria/ed-artistica" element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="ed_artistica_primaria" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/lengua"            element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="lengua_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/matematicas"       element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="matematicas_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/ed-fisica"         element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="ed_fisica_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/tecno-digital"     element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="tecno_digital_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/epva"              element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="epva_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/valores-eticos"    element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="valores_eticos_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>
        <Route path="/eso/tutorias"          element={<ProtectedRoute roles={['admin_centro', 'profesor']}><ModuleLayout moduleId="tutorias_eso" /></ProtectedRoute>}>
          <Route index element={<ModuleHome />} />
          <Route path="ocr" element={<ModuleOcrPage />} />
          <Route path=":toolKey" element={<ToolPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
