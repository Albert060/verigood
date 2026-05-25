import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { usersApi } from '../../services/api';
import { PageHeader, Badge, Button, Modal, Input, Select, Toggle, SectionLabel } from '../../components/ui';

const MOCK_USERS = [
  { id: '1', name: 'María Pérez', email: 'admin@verigood.com', role: 'admin_centro', is_active: true, last_login: '2026-04-30', exam_count: 12 },
  { id: '2', name: 'Juan García', email: 'profesor@verigood.com', role: 'profesor', is_active: true, last_login: '2026-04-30', exam_count: 34 },
  { id: '3', name: 'Ana Martín', email: 'ana.martin@sanisidro.es', role: 'profesor', is_active: true, last_login: '2026-04-29', exam_count: 21 },
  { id: '4', name: 'Luis Torres', email: 'luis.torres@sanisidro.es', role: 'profesor', is_active: true, last_login: '2026-04-28', exam_count: 8 },
  { id: '5', name: 'Carmen Ruiz', email: 'carmen.ruiz@sanisidro.es', role: 'profesor', is_active: false, last_login: '2026-03-10', exam_count: 5 },
];

export default function InstitutionalUsers() {
  const { user } = useAuthStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'profesor' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => { setSaving(false); setInviteOpen(false); setForm({ name: '', email: '', role: 'profesor' }); }, 800);
  };

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Profesores"
        subtitle={`${MOCK_USERS.filter(u => u.is_active).length} ACTIVOS · PLAN COLEGIO (MÁX. 15)`}
        romanNum="§ II"
        actions={
          <Button onClick={() => setInviteOpen(true)}>Invitar profesor</Button>
        }
      />

      {/* Usage bar */}
      <div className="bg-card-bg border border-linea shadow-card card-fold p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel className="mb-0">CAPACIDAD DEL PLAN</SectionLabel>
          <span className="font-mono text-[11px] text-tinta">
            {MOCK_USERS.filter(u => u.is_active).length} / 15 profesores
          </span>
        </div>
        <div className="h-1.5 bg-[rgba(184,169,136,0.3)] overflow-hidden">
          <div
            className="h-full bg-marino transition-all duration-500"
            style={{ width: `${(MOCK_USERS.filter(u => u.is_active).length / 15) * 100}%` }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-linea shadow-card">
        <table className="vg-table">
          <thead>
            <tr><th>NOMBRE</th><th>EMAIL</th><th>ROL</th><th>EXÁMENES</th><th>ÚLTIMA CONEXIÓN</th><th>ESTADO</th><th></th></tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-tinta">{u.name}</td>
                <td className="font-mono text-[11px] text-marron-soft">{u.email}</td>
                <td>
                  <span className={`font-mono text-[10px] px-2 py-0.5 border ${
                    u.role === 'admin_centro'
                      ? 'bg-[rgba(31,42,77,0.08)] text-marino border-marino'
                      : 'bg-papel text-marron-soft border-linea'
                  }`}>
                    {u.role === 'admin_centro' ? 'ADMIN' : 'PROFESOR'}
                  </span>
                </td>
                <td className="font-mono text-[12px]">{u.exam_count}</td>
                <td className="font-mono text-[11px] text-marron-soft">
                  {new Date(u.last_login).toLocaleDateString('es')}
                </td>
                <td><Badge variant={u.is_active ? 'active' : 'paused'}>{u.is_active ? 'ACTIVO' : 'INACTIVO'}</Badge></td>
                <td>
                  <button className="font-mono text-[10px] text-marron-soft hover:text-granate transition-colors">
                    {u.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invitar profesor"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleInvite}>Crear cuenta</Button>
          </>
        }
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input label="NOMBRE COMPLETO" value={form.name} onChange={set('name')} placeholder="Ana García" required />
          <Input label="EMAIL" type="email" value={form.email} onChange={set('email')} placeholder="ana@colegio.es" required />
          <Select label="ROL" value={form.role} onChange={set('role')}>
            <option value="profesor">Profesor</option>
            <option value="admin_centro">Administrador</option>
          </Select>
          <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
            <p className="font-mono text-[11px] text-[#7A5A1E]">
              Se enviará un email con las credenciales temporales. El profesor deberá cambiar la contraseña en su primer acceso.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
