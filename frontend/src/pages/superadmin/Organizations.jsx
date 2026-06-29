import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi, modulesApi } from '../../services/api';
import { PageHeader, Badge, Button, Modal, Select, Toggle, SectionLabel } from '../../components/ui';

const MODULE_LABELS = {
  cambridge: 'Cambridge', espanol: 'Lengua', matematicas: 'Mates', medio: 'C.Medio', oposiciones: 'Oposic.',
};

const STAGE_LABELS = { primaria: 'Primaria', eso: 'ESO', bachillerato: 'Bachillerato' };
const STAGE_ORDER  = ['primaria', 'eso', 'bachillerato'];
const CATEGORY_LABELS = {
  asignatura: 'Asignaturas',
  preparacion_examen: 'Preparación de exámenes',
  religion_valores: 'Religión y valores',
  accion_tutorial: 'Acción tutorial',
};
const CATEGORY_ORDER = ['asignatura', 'preparacion_examen', 'religion_valores', 'accion_tutorial'];

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
  const [modulesOrg, setModulesOrg] = useState(null);

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
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setModulesOrg(org)}
                            className="font-mono text-[10px] text-marino hover:text-granate transition-colors"
                          >
                            Módulos
                          </button>
                          <button
                            onClick={() => openEdit(org)}
                            className="font-mono text-[10px] text-marino hover:text-granate transition-colors"
                          >
                            Editar
                          </button>
                        </div>
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

      {/* Modules modal — superadmin asigna módulos contratados al centro */}
      <Modal
        open={!!modulesOrg}
        onClose={() => setModulesOrg(null)}
        title={modulesOrg ? `Módulos · ${modulesOrg.name}` : 'Módulos'}
        footer={
          <Button variant="ghost" onClick={() => setModulesOrg(null)}>Cerrar</Button>
        }
      >
        {modulesOrg && <OrgModulesPanel orgId={modulesOrg.id} />}
      </Modal>
    </div>
  );
}

// Panel de distribución de permisos iniciales para una organización.
// El superadmin marca qué módulos del catálogo quedan contratados por el
// centro (organization_modules). El admin de ese centro solo podrá asignar
// a sus profesores los que aquí queden activos. Al desactivar un módulo el
// backend elimina en cascada las filas de user_modules correspondientes.
//
// Usa modulesApi.activate/deactivate (autorizados ya para `superadmin`).
// Para "Activar todos" se hacen llamadas en paralelo a las pendientes.
function OrgModulesPanel({ orgId }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [bulkPending, setBulkPending] = useState(false);

  const { data: catalogData, isLoading: loadingCatalog, isError: catalogError } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: orgData, isLoading: loadingOrg } = useQuery({
    queryKey: ['modules', 'org', orgId],
    queryFn: () => modulesApi.listOrgModules(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const catalog = catalogData?.modules || [];
  const activeSet = useMemo(
    () => new Set((orgData?.modules || []).map((m) => m.id)),
    [orgData]
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['modules', 'org', orgId] });
  const activate   = useMutation({ mutationFn: (moduleId) => modulesApi.activate(orgId, moduleId),   onSuccess: invalidate });
  const deactivate = useMutation({ mutationFn: (moduleId) => modulesApi.deactivate(orgId, moduleId), onSuccess: invalidate });

  const handleToggle = (moduleId, currentlyOn) => {
    if (activate.isPending || deactivate.isPending || bulkPending) return;
    (currentlyOn ? deactivate : activate).mutate(moduleId);
  };

  // Bulk: aplica una operación sobre un subconjunto del catálogo, en paralelo.
  // Si `turnOn` es true activa los que faltan; si false desactiva los activos.
  const applyBulk = async (modules, turnOn) => {
    setBulkPending(true);
    try {
      const ops = modules
        .filter((m) => activeSet.has(m.id) !== turnOn)
        .map((m) => (turnOn
          ? modulesApi.activate(orgId, m.id)
          : modulesApi.deactivate(orgId, m.id)
        ));
      await Promise.allSettled(ops);
      invalidate();
    } finally {
      setBulkPending(false);
    }
  };

  // Filtro de búsqueda aplicado al catálogo entero (sobre name, stage, route_prefix).
  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.trim().toLowerCase();
    return catalog.filter((m) =>
      [m.name, STAGE_LABELS[m.stage], m.route_prefix].some((v) =>
        String(v || '').toLowerCase().includes(q)
      )
    );
  }, [catalog, search]);

  // Agrupado stage → category → modules para el render.
  const grouped = useMemo(() => {
    const tree = {};
    filtered.forEach((m) => {
      if (!tree[m.stage]) tree[m.stage] = {};
      if (!tree[m.stage][m.category]) tree[m.stage][m.category] = [];
      tree[m.stage][m.category].push(m);
    });
    return tree;
  }, [filtered]);

  const totalCatalog = catalog.length;
  const totalActive  = catalog.filter((m) => activeSet.has(m.id)).length;
  const busy = activate.isPending || deactivate.isPending || bulkPending;

  if (loadingCatalog || loadingOrg) {
    return <div className="font-mono text-[12px] text-marron-soft py-6 text-center">Cargando catálogo…</div>;
  }

  if (catalogError) {
    return (
      <div className="px-3 py-3 border border-granate/40 bg-granate/5 text-granate font-mono text-[11px]">
        Error al cargar el catálogo de módulos.
      </div>
    );
  }

  if (totalCatalog === 0) {
    return (
      <div className="font-mono text-[11px] text-marron-soft py-6 text-center">
        El catálogo de módulos está vacío. Ejecuta el seed
        <span className="block mt-1">backend/src/seeds/001_modules_catalog.sql</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabecera con contador y acciones globales */}
      <div className="bg-card-bg border border-linea p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SectionLabel className="mb-0.5">PERMISOS INICIALES</SectionLabel>
            <div className="font-mono text-[11px] text-tinta">
              <span className="font-bold">{totalActive}</span> de {totalCatalog} módulos contratados
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyBulk(catalog, true)}
              disabled={busy || totalActive === totalCatalog}
              className="font-mono text-[10px] px-2 py-1 border border-marino text-marino hover:bg-marino hover:text-papel disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Activar todos
            </button>
            <button
              onClick={() => applyBulk(catalog, false)}
              disabled={busy || totalActive === 0}
              className="font-mono text-[10px] px-2 py-1 border border-granate text-granate hover:bg-granate hover:text-papel disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Desactivar todos
            </button>
          </div>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar módulo (matemáticas, eso, /primaria…)"
          className="w-full px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
        />
      </div>

      {/* Catálogo agrupado */}
      <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
        {STAGE_ORDER.filter((s) => grouped[s]).map((stage) => {
          const stageModules = Object.values(grouped[stage]).flat();
          const stageActive = stageModules.filter((m) => activeSet.has(m.id)).length;
          return (
            <section key={stage}>
              <div className="flex items-center justify-between mb-2">
                <SectionLabel className="mb-0">
                  {STAGE_LABELS[stage]} · {stageActive}/{stageModules.length}
                </SectionLabel>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => applyBulk(stageModules, true)}
                    disabled={busy || stageActive === stageModules.length}
                    className="font-mono text-[9px] uppercase text-marino hover:text-granate disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Activar etapa
                  </button>
                  <span className="text-marron-soft">·</span>
                  <button
                    onClick={() => applyBulk(stageModules, false)}
                    disabled={busy || stageActive === 0}
                    className="font-mono text-[9px] uppercase text-granate hover:text-tinta disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Limpiar etapa
                  </button>
                </div>
              </div>

              {CATEGORY_ORDER.filter((c) => grouped[stage][c]).map((cat) => (
                <div key={cat} className="mb-3">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-marron-soft uppercase mb-1.5">
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <div className="space-y-1.5">
                    {grouped[stage][cat]
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((mod) => {
                        const on = activeSet.has(mod.id);
                        const pending =
                          (activate.isPending && activate.variables === mod.id) ||
                          (deactivate.isPending && deactivate.variables === mod.id);
                        return (
                          <div
                            key={mod.id}
                            className={`flex items-center justify-between gap-3 px-3 py-2 border ${
                              on ? 'border-linea bg-card-bg' : 'border-[rgba(184,169,136,0.4)] opacity-70'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-tinta truncate">{mod.name}</span>
                                {mod.category === 'preparacion_examen' && (
                                  <Badge variant="trial">PREP. EXAMEN</Badge>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-marron-soft">{mod.route_prefix}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {pending && <span className="font-mono text-[10px] text-marron-soft">…</span>}
                              <Toggle on={on} onChange={() => handleToggle(mod.id, on)} disabled={pending || bulkPending} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </section>
          );
        })}

        {filtered.length === 0 && (
          <div className="font-mono text-[11px] text-marron-soft text-center py-6">
            Sin módulos para “{search}”.
          </div>
        )}
      </div>

      {/* Nota final */}
      <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
        <p className="font-mono text-[11px] text-[#7A5A1E]">
          Lo que actives aquí es lo que el centro tiene contratado. El admin del centro solo podrá
          asignar a sus profesores los módulos activos en esta lista. Al desactivar un módulo se
          eliminan también las asignaciones a profesores que lo tuvieran.
        </p>
      </div>
    </div>
  );
}
