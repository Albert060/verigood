import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { superadminApi } from '../../services/api';
import { PageHeader, Badge, SectionLabel } from '../../components/ui';

const ROLE_LABEL = {
  superadmin:  'Superadmin',
  admin_centro:'Admin centro',
  profesor:    'Profesor',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es'); } catch { return '—'; }
};

export default function SuperadminUsers() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  // Catálogo de organizaciones para el filtro.
  const { data: orgsData } = useQuery({
    queryKey: ['superadmin-orgs-all', 'for-filter'],
    queryFn: () => superadminApi.getOrgs({ limit: 200 }).then((r) => r.data),
    staleTime: 60_000,
  });
  const orgs = orgsData?.organizations || [];
  const [organizationId, setOrganizationId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-users', search, role, organizationId],
    queryFn: () => superadminApi.getUsers({
      search: search || undefined,
      role: role || undefined,
      organizationId: organizationId || undefined,
      limit: 100,
    }).then((r) => r.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const users = data?.users || [];
  const total = data?.total ?? 0;

  return (
    <div className="animate-slide-in">
      <PageHeader title="Usuarios globales" subtitle="ADMINS Y PROFESORES · TODOS LOS CENTROS" romanNum="§ IV" />

      {/* Filtros */}
      <div className="bg-card-bg border border-linea shadow-card p-4 mb-5">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-5">
            <label className="font-mono text-[10px] text-marron-soft block mb-1">BUSCAR (NOMBRE O EMAIL)</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ana garcía, profesor@…"
              className="w-full px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
            />
          </div>
          <div className="col-span-3">
            <label className="font-mono text-[10px] text-marron-soft block mb-1">ROL</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
            >
              <option value="">Todos</option>
              <option value="admin_centro">Admin centro</option>
              <option value="profesor">Profesor</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div className="col-span-4">
            <label className="font-mono text-[10px] text-marron-soft block mb-1">ORGANIZACIÓN</label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
            >
              <option value="">Todas</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card-bg border border-linea shadow-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0">RESULTADOS</SectionLabel>
          <span className="font-mono text-[10px] text-marron-soft">
            {isLoading ? 'cargando…' : `${users.length} de ${total}`}
          </span>
        </div>

        {isLoading && (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-marino border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && users.length === 0 && (
          <div className="px-4 py-6 text-center font-mono text-[11px] text-marron-soft">
            Sin usuarios para los filtros actuales.
          </div>
        )}

        {!isLoading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="vg-table">
              <thead>
                <tr>
                  <th>NOMBRE</th><th>EMAIL</th><th>ROL</th>
                  <th>ORGANIZACIÓN</th><th>PLAN</th>
                  <th>ÚLT. ENTRADA</th><th>ALTA</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-tinta">{u.name || '—'}</td>
                    <td className="font-mono text-[11px] text-marron-soft">{u.email}</td>
                    <td className="font-mono text-[11px]">{ROLE_LABEL[u.role] || u.role}</td>
                    <td className="text-tinta">{u.organization_name || '—'}</td>
                    <td>
                      {u.organization_plan ? (
                        <Badge variant={`plan-${u.organization_plan}`}>
                          {u.organization_plan.toUpperCase()}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td className="font-mono text-[11px] text-marron-soft">{formatDate(u.last_login)}</td>
                    <td className="font-mono text-[11px] text-marron-soft">{formatDate(u.created_at)}</td>
                    <td>
                      <Badge variant={u.is_active ? 'active' : 'paused'}>
                        {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
