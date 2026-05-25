import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Landing
import LandingPage from './pages/landing/LandingPage';

// Superadmin
import SuperadminLayout from './pages/superadmin/SuperadminLayout';
import SuperadminDashboard from './pages/superadmin/Dashboard';
import SuperadminOrganizations from './pages/superadmin/Organizations';
import SuperadminBilling from './pages/superadmin/Billing';
import SuperadminSystem from './pages/superadmin/System';

// Institutional (admin colegio)
import InstitutionalLayout from './pages/institutional/InstitutionalLayout';
import InstitutionalDashboard from './pages/institutional/Dashboard';
import InstitutionalUsers from './pages/institutional/Users';
import InstitutionalModules from './pages/institutional/Modules';
import InstitutionalResources from './pages/institutional/Resources';
import InstitutionalStats from './pages/institutional/Stats';
import InstitutionalBilling from './pages/institutional/Billing';

// Cambridge
import CambridgeLayout from './pages/cambridge/CambridgeLayout';
import CambridgeHome from './pages/cambridge/Home';
import ExamGenerator from './pages/cambridge/ExamGenerator';
import OcrCorrector from './pages/cambridge/OcrCorrector';
import DynamicsGenerator from './pages/cambridge/DynamicsGenerator';
import PresentationGenerator from './pages/cambridge/PresentationGenerator';
import ExamsList from './pages/cambridge/ExamsList';

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

// Conocimiento del Medio
import MedioLayout from './pages/medio/MedioLayout';
import MedioHome from './pages/medio/Home';
import MedioSheets from './pages/medio/ThematicSheets';
import MedioQuizzes from './pages/medio/Questionnaires';
import MedioDynamics from './pages/medio/STEMActivities';

// ── Protected route ───────────────────────────────────────────
function ProtectedRoute({ children, roles = [], module }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  if (module && !user?.activeModules?.includes(module)) return <Navigate to="/dashboard" replace />;
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
          <Route path="stats" element={<ProtectedRoute roles={['admin_centro']}><InstitutionalStats /></ProtectedRoute>} />
          <Route path="billing" element={<ProtectedRoute roles={['admin_centro']}><InstitutionalBilling /></ProtectedRoute>} />
        </Route>

        {/* Cambridge */}
        <Route
          path="/cambridge"
          element={<ProtectedRoute module="cambridge"><CambridgeLayout /></ProtectedRoute>}
        >
          <Route index element={<CambridgeHome />} />
          <Route path="exams/new" element={<ExamGenerator />} />
          <Route path="exams" element={<ExamsList />} />
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
