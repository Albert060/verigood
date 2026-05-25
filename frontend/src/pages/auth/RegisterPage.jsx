import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';
import { Button, Input } from '../../components/ui';

export default function RegisterPage() {
  const [form, setForm] = useState({ orgName: '', orgCity: '', adminName: '', adminEmail: '', adminPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.adminPassword.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid-paper bg-papel flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-[28px] font-bold text-tinta">
            Veri<em className="text-granate">good</em>
          </h1>
          <p className="font-mono text-[11px] text-marron-soft tracking-[0.06em] mt-1">REGISTRO DE CENTRO</p>
        </div>

        <div className="bg-card-bg border border-linea shadow-card card-fold p-7">
          <h2 className="font-display text-[17px] font-bold text-tinta mb-1">Registrar colegio</h2>
          <p className="font-mono text-[11px] text-marron-soft mb-5">14 días de prueba gratuita · Sin tarjeta</p>

          {error && (
            <div className="bg-[#FCF0F0] border border-[#D4878A] p-3 mb-4 font-mono text-[12px] text-granate">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="NOMBRE DEL CENTRO" value={form.orgName} onChange={set('orgName')} placeholder="Colegio San Isidro" required />
              <Input label="CIUDAD" value={form.orgCity} onChange={set('orgCity')} placeholder="Madrid" />
            </div>
            <hr className="border-linea opacity-40" />
            <p className="font-mono text-[10px] text-marron-soft tracking-[0.06em]">ADMINISTRADOR DEL CENTRO</p>
            <Input label="TU NOMBRE" value={form.adminName} onChange={set('adminName')} placeholder="María Pérez" required />
            <Input label="EMAIL" type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="maria@colegio.es" required />
            <Input label="CONTRASEÑA" type="password" value={form.adminPassword} onChange={set('adminPassword')} placeholder="Mínimo 8 caracteres" required />
            <Button type="submit" loading={loading} className="w-full mt-2">
              Crear cuenta gratuita
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-linea text-center">
            <span className="font-mono text-[11px] text-marron-soft">¿Ya tienes cuenta?</span>{' '}
            <Link to="/login" className="font-mono text-[11px] text-marino hover:text-granate transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
