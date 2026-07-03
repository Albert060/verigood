import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminApi, modulesApi } from '../../services/api';
import { PageHeader, SectionLabel, Badge, Toggle, ProgressBar } from '../../components/ui';

const STAGE_LABELS = { primaria: 'Primaria', eso: 'ESO', bachillerato: 'Bachillerato' };
const STAGE_ORDER  = ['primaria', 'eso', 'bachillerato'];
const CATEGORY_LABELS = {
  asignatura: 'Asignaturas',
  preparacion_examen: 'Preparación de exámenes',
  religion_valores: 'Religión y valores',
  accion_tutorial: 'Acción tutorial',
};

export default function SuperadminModules() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [orgSearch, setOrgSearch] = useState('');

  // Catálogo global de módulos.
  const { data: catalogData, isLoading: loadingCatalog } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // Listado global de organizaciones con sus module_ids reales (organization_modules).
  const { data: orgsData, isLoading: loadingOrgs } = useQuery({
    queryKey: ['superadmin-orgs-modules'],
    queryFn: () => superadminApi.getOrgs({ limit: 200 }).then((r) => r.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const catalog = catalogData?.modules || [];
  const orgs = orgsData?.organizations || [];

  // Adopción por módulo: en cuántos centros está activado.
  const adoptionByModule = useMemo(() => {
    const map = new Map();
    orgs.forEach((o) => {
      (o.module_ids || []).forEach((mid) => {
        map.set(mid, (map.get(mid) || 0) + 1);
      });
    });
    return map;
  }, [orgs]);

  // Agrupado por etapa para la columna izquierda.
  const grouped = useMemo(() => {
    const tree = {};
    catalog.forEach((m) => {
      if (!tree[m.stage]) tree[m.stage] = [];
      tree[m.stage].push(m);
    });
    return tree;
  }, [catalog]);

  const selected = catalog.find((m) => m.id === selectedId) || null;

  // Mutaciones reutilizadas — el backend acepta superadmin en ambos endpoints.
  const invalidateOrgs = () => qc.invalidateQueries({ queryKey: ['superadmin-orgs-modules'] });
  const activate   = useMutation({
    mutationFn: ({ orgId, moduleId }) => modulesApi.activate(orgId, moduleId),
    onSuccess: invalidateOrgs,
  });
  const deactivate = useMutation({
    mutationFn: ({ orgId, moduleId }) => modulesApi.deactivate(orgId, moduleId),
    onSuccess: invalidateOrgs,
  });

  const handleToggle = (org, currentlyOn) => {
    if (!selected) return;
    if (activate.isPending || deactivate.isPending) return;
    const payload = { orgId: org.id, moduleId: selected.id };
    (currentlyOn ? deactivate : activate).mutate(payload);
  };

  const filteredOrgs = orgs.filter((o) => {
    if (!orgSearch) return true;
    const q = orgSearch.toLowerCase();
    return (o.name || '').toLowerCase().includes(q) || (o.city || '').toLowerCase().includes(q);
  });

  const loading = loadingCatalog || loadingOrgs;
  const maxAdoption = Math.max(...Array.from(adoptionByModule.values()), 1);

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Módulos del catálogo"
        subtitle="DISTRIBUYE PERMISOS A LOS CENTROS"
        romanNum="§ V"
      />

      {loading && (
        <div className="font-mono text-[12px] text-marron-soft py-8 text-center">
          Cargando catálogo…
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Catálogo */}
          <div className="lg:col-span-5 space-y-5">
            {STAGE_ORDER.filter((s) => grouped[s]).map((stage) => (
              <section key={stage}>
                <SectionLabel className="mb-2">{STAGE_LABELS[stage]}</SectionLabel>
                <div className="space-y-1.5">
                  {grouped[stage]
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((mod) => {
                      const adoption = adoptionByModule.get(mod.id) || 0;
                      const isSel = selectedId === mod.id;
                      return (
                        <button
                          key={mod.id}
                          onClick={() => setSelectedId(mod.id)}
                          className={`w-full text-left px-3 py-2 border transition-colors ${
                            isSel
                              ? 'border-marino bg-card-bg shadow-card'
                              : 'border-linea bg-card-bg hover:border-tinta'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[13px] font-medium text-tinta truncate">
                                {mod.name}
                              </span>
                              {mod.category === 'preparacion_examen' && (
                                <Badge variant="trial">PREP. EXAMEN</Badge>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-marron-soft flex-shrink-0">
                              {adoption}/{orgs.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <ProgressBar value={adoption} max={maxAdoption} className="flex-1" />
                            <span className="font-mono text-[9px] text-marron-soft uppercase">
                              {CATEGORY_LABELS[mod.category] || mod.category}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>

          {/* Panel de distribución */}
          <div className="lg:col-span-7">
            {!selected ? (
              <div className="bg-card-bg border border-linea shadow-card card-fold p-6 h-full flex flex-col items-center justify-center gap-2">
                <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)]">§</div>
                <p className="font-mono text-[11px] text-marron-soft text-center">
                  Selecciona un módulo del catálogo para distribuirlo a los centros.
                </p>
              </div>
            ) : (
              <div className="bg-card-bg border border-linea shadow-card card-fold">
                <div className="px-4 py-3 border-b border-linea">
                  <SectionLabel className="mb-1">MÓDULO SELECCIONADO</SectionLabel>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-semibold text-tinta">{selected.name}</div>
                      <div className="font-mono text-[10px] text-marron-soft">{selected.route_prefix}</div>
                    </div>
                    <span className="font-mono text-[10px] text-marron-soft">
                      {adoptionByModule.get(selected.id) || 0} de {orgs.length} centros lo tienen activado
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-linea">
                  <input
                    type="text"
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder="Buscar centro…"
                    className="w-full px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
                  />
                </div>

                <div className="max-h-[55vh] overflow-y-auto">
                  {filteredOrgs.length === 0 && (
                    <div className="px-4 py-6 text-center font-mono text-[11px] text-marron-soft">
                      Sin centros para esta búsqueda.
                    </div>
                  )}

                  {filteredOrgs.map((org) => {
                    const on = (org.module_ids || []).includes(selected.id);
                    const pending =
                      ((activate.isPending && activate.variables?.orgId === org.id) ||
                       (deactivate.isPending && deactivate.variables?.orgId === org.id)) &&
                      ((activate.variables?.moduleId === selected.id) ||
                       (deactivate.variables?.moduleId === selected.id));
                    return (
                      <div
                        key={org.id}
                        className="flex items-center justify-between gap-3 px-4 py-2 border-b border-linea last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-tinta truncate">{org.name}</div>
                          <div className="font-mono text-[10px] text-marron-soft">
                            {org.city || '—'} ·{' '}
                            <span className="uppercase">{org.plan || 'starter'}</span>
                            {!org.is_active && (
                              <span className="ml-2 text-granate">SUSPENDIDO</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {pending && <span className="font-mono text-[10px] text-marron-soft">…</span>}
                          <Toggle
                            on={on}
                            onChange={() => handleToggle(org, on)}
                            disabled={pending || !org.is_active}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
        <p className="font-mono text-[11px] text-[#7A5A1E]">
          Lo que actives aquí es lo que cada centro tiene contratado. El admin de ese centro solo
          podrá asignar a sus profesores los módulos activos. Al desactivar un módulo se eliminan
          también las asignaciones a profesores que lo tuvieran.
        </p>
      </div>
    </div>
  );
}
