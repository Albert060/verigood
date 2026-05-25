import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';
import { Button, Input } from '../../components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      setAuth(data.user, data.accessToken, data.refreshToken);
      if (data.user.role === 'superadmin') navigate('/superadmin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid-paper bg-papel flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-[40px] font-bold text-tinta">
            Veri<em className="text-granate">good</em>
          </h1>
          <p className="font-mono text-[13px] text-marron-soft tracking-[0.08em] mt-2 font-semibold">IA PARA COLEGIOS</p>
        </div>

        {/* Card */}
        <div className="bg-card-bg border border-linea shadow-card rounded-2xl p-10">
          <h2 className="font-display text-[26px] font-bold text-tinta mb-7">Iniciar sesión</h2>

          {error && (
            <div className="bg-[#FCF0F0] border border-[#D4878A] p-4 mb-5 font-mono text-[14px] text-granate rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="EMAIL"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@colegio.es"
              required
              autoFocus
            />
            <Input
              label="CONTRASEÑA"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-3">
              Entrar
            </Button>
          </form>

          <div className="mt-7 pt-5 border-t border-linea text-center">
            <span className="font-mono text-[14px] text-marron-soft">¿Nuevo en VeriGood?</span>{' '}
            <Link to="/register" className="font-mono text-[14px] text-marino hover:text-granate transition-colors font-semibold">
              Registrar colegio
            </Link>
          </div>
        </div>

        {/* Demo hint */}
        <div className="mt-5 bg-[rgba(232,216,154,0.3)] border border-amarillo p-5 rounded-xl">
          <p className="font-mono text-[13px] text-[#7A5A1E] leading-relaxed">
            DEMO — admin@verigood.com / demo1234<br />
            profesor@verigood.com / demo1234
          </p>
        </div>
      </div>
    </div>
  );
}
