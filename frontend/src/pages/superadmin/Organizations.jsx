import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi } from '../../services/api';
import { PageHeader, Badge, Button, Modal, Select, Toggle, SectionLabel } from '../../components/ui';

const MODULE_LABELS = {
  cambridge: 'Cambridge', espanol: 'Lengua', matematicas: 'Mates', medio: 'C.Medio', oposiciones: 'Oposic.',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es'); } catch { return '—'; }
};

export default function SuperadminOrganizations() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editOrg, setEditOrg] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['superadmin-orgs', search, statusFilter],
    queryFn: () => superadminApi.getOrgs({
      search: search || undefined,
      status: statusFilter || undefined,
      limit: 100,
    }).then((r) => r.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const update = useMutation({
    mutationFn: ({ orgId, payload }) => superadminApi.updateOrg(orgId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-orgs'] });
      setEditOrg(null);
    },
  });

  const orgs = data?.organizations || [];
  const total = data?.total ?? orgs.length;

  const openEdit = (org) => {
    setEditOrg(org);
    setEditForm({ plan: org.plan || 'starter', is_active: !!org.is_active });
  };

  const saveEdit = () => {
    if (!editOrg) return;
    update.mutate({
      orgId: editOrg.id,
      payload: {
        plan: editForm.plan,
        is_active: editForm.is_active,
      },
    });
  };

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Organizaciones"
        subtitle={`${total} CENTROS REGISTRADOS`}
        romanNum="§ II"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          className="vg-input max-w-xs"
          placeholder="Buscar centro o ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="vg-select w-32"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>
        <span className="font-mono text-[11px] text-marron-soft">
          {orgs.length} {orgs.length === 1 ? 'resultado' : 'resultados'}
        </span>
        <button
          onClick={() => refetch()}
          className="ml-auto font-mono text-[10px] text-marron-soft border border-linea px-2 py-1 hover:border-tinta hover:text-tinta transition-colors"
        >
          ↻ Recargar
        </button>
      </div>

      {/* States */}
      {isLoading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="px-4 py-3 border border-granate/40 bg-granate/5 text-granate font-mono text-[12px]">
          Error al cargar las organizaciones. Pulsa "↻ Recargar" para reintentar.
        </div>
      )}

      {!isLoading && !isError && orgs.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)]">§</div>
          <p className="font-mono text-[11px] text-marron-soft">
            {search || statusFilter
              ? 'No hay centros que coincidan con los filtros'
              : 'Aún no hay centros registrados'}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && orgs.length > 0 && (
        <div className="bg-card-bg border border-linea shadow-card">
          <div className="overflow-x-auto">
            <table className="vg-table">
              <thead>
                <tr>
                  <th>CENTRO</th><th>CIUDAD</th><th>PLAN</th><th>MÓDULOS</th>
                  <th>PROFES.</th><th>USO/MES</th><th>ALTA</th><th>ESTADO</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => {
                  const modules = Array.isArray(org.active_modules) ? org.active_modules : [];
                  return (
                    <tr key={org.id}>
                      <td className="font-medium text-tinta">{org.name || '—'}</td>
                      <td className="font-mono text-[11px] text-marron-soft">{org.city || '—'}</td>
                      <td>
                        <Badge variant={`plan-${org.plan || 'starter'}`}>
                          {(org.plan || 'starter').toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        {modules.length === 0 ? (
                          <span className="font-mono text-[10px] text-marron-soft">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {modules.slice(0, 4).map((m) => (
                              <span key={m} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">
                                {MODULE_LABELS[m] || m}
                              </span>
                            ))}
                            {modules.length > 4 && (
                              <span className="font-mono text-[9px] text-marron-soft">+{modules.length - 4}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="font-mono text-[12px]">{org.active_users ?? 0}</td>
                      <td className="font-mono text-[11px]">
                        {Number(org.monthly_usage ?? 0).toLocaleString('es-ES')}
                      </td>
                      <td className="font-mono text-[10px] text-marron-soft">{formatDate(org.created_at)}</td>
                      <td>
                        <Badge variant={org.is_active ? 'active' : 'paused'}>
                          {org.is_active ? 'ACTIVO' : 'SUSP.'}
                        </Badge>
                      </td>
                      <td>
                        <button
                          onClick={() => openEdit(org)}
                          className="font-mono text-[10px] text-marino hover:text-granate transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={!!editOrg}
        onClose={() => setEditOrg(null)}
        title={editOrg?.name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOrg(null)}>Cancelar</Button>
            <Button onClick={saveEdit} loading={update.isPending}>Guardar cambios</Button>
          </>
        }
      >
        {editOrg && (
          <div className="space-y-4">
            <Select
              label="PLAN"
              value={editForm.plan}
              onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
            >
              <option value="starter">Starter — 29 €/mes</option>
              <option value="colegio">Colegio — 149 €/mes</option>
              <option value="enterprise">Enterprise — A medida</option>
            </Select>
            <div className="flex items-center justify-between py-2 border-t border-linea">
              <div>
                <p className="text-[13px] font-medium text-tinta">Organización activa</p>
                <p className="text-[11px] text-marron-soft">Desactivar suspende el acceso a todos los usuarios</p>
              </div>
              <Toggle
                on={editForm.is_active}
                onChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
            <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
              <p className="font-mono text-[11px] text-[#7A5A1E]">
                Ciudad: {editOrg.city || '—'} · Alta: {formatDate(editOrg.created_at)} ·
                Profesores activos: {editOrg.active_users ?? 0}
              </p>
            </div>
            {update.isError && (
              <div className="px-3 py-2 border border-granate/40 bg-granate/5 text-granate font-mono text-[11px]">
                Error al guardar. Reintenta.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
