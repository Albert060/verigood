import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';

export default function Topbar({ moduleLabel, moduleColor }) {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken); } catch (_) {}
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'VG';

  return (
    <header className="h-16 flex items-center justify-between px-7 border-b border-linea bg-sidebar-bg flex-shrink-0 z-10">
      {/* Left: logo + module */}
      <div className="flex items-center gap-4">
        <span
          className="font-display text-[20px] font-bold text-marino cursor-pointer"
          onClick={() => navigate('/')}
        >
          Veri<em className="text-granate">good</em>
        </span>
        {moduleLabel && (
          <>
            <span className="text-marron-soft text-base">/</span>
            <span
              className="font-mono text-[13px] tracking-[0.05em] px-3 py-1 border rounded-full font-medium"
              style={{ color: moduleColor || 'var(--marino)', borderColor: moduleColor || 'var(--marino)', background: moduleColor ? `${moduleColor}12` : 'rgba(31,42,77,0.06)' }}
            >
              {moduleLabel}
            </span>
          </>
        )}
      </div>

      {/* Right: org badge + avatar */}
      <div className="flex items-center gap-4">
        {user?.orgName && (
          <span className="font-mono text-[13px] text-marron-soft hidden md:block truncate max-w-[220px]">
            {user.orgName}
          </span>
        )}
        <div className="relative group">
          <div className="w-10 h-10 bg-granate text-papel rounded-full flex items-center justify-center font-mono text-[13px] font-bold cursor-pointer shadow-soft">
            {initials}
          </div>
          {/* Dropdown */}
          <div className="absolute right-0 top-12 w-56 bg-papel border border-linea shadow-card-hover rounded-xl hidden group-hover:block z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-linea">
              <p className="text-[14px] font-semibold text-tinta truncate">{user?.name}</p>
              <p className="text-[12px] text-marron-soft font-mono truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-[14px] text-tinta hover:bg-papel-hover transition-colors font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
