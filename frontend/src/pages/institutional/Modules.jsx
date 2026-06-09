import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { modulesApi } from '../../services/api';
import { PageHeader, Toggle, Badge, SectionLabel } from '../../components/ui';

const STAGE_LABELS = { primaria: 'Primaria', eso: 'ESO', bachillerato: 'Bachillerato' };
const STAGE_ORDER = ['primaria', 'eso', 'bachillerato'];
const CATEGORY_LABELS = {
  asignatura: 'Asignaturas',
  preparacion_examen: 'Preparación de exámenes',
  religion_valores: 'Religión y valores',
  accion_tutorial: 'Acción tutorial',
};
const CATEGORY_ORDER = [
  'asignatura',
  'preparacion_examen',
  'religion_valores',
  'accion_tutorial',
];

export default function InstitutionalModules() {
  const { user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;
  const qc = useQueryClient();

  const { data: catalogData, isLoading: loadingCatalog } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
  });

  const { data: orgData, isLoading: loadingOrg } = useQuery({
    queryKey: ['modules', 'org', orgId],
    queryFn: () => modulesApi.listOrgModules(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const activeSet = useMemo(
    () => new Set((orgData?.modules || []).map((m) => m.id)),
    [orgData]
  );

  const activate = useMutation({
    mutationFn: (moduleId) => modulesApi.activate(orgId, moduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules', 'org', orgId] }),
  });

  const deactivate = useMutation({
    mutationFn: (moduleId) => modulesApi.deactivate(orgId, moduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules', 'org', orgId] }),
  });

  const handleToggle = (moduleId, currentlyOn) => {
    if (activate.isPending || deactivate.isPending) return;
    (currentlyOn ? deactivate : activate).mutate(moduleId);
  };

  // Agrupado: stage -> category -> modules[]
  const grouped = useMemo(() => {
    const tree = {};
    (catalogData?.modules || []).forEach((m) => {
      if (!tree[m.stage]) tree[m.stage] = {};
      if (!tree[m.stage][m.category]) tree[m.stage][m.category] = [];
      tree[m.stage][m.category].push(m);
    });
    return tree;
  }, [catalogData]);

  const loading = loadingCatalog || loadingOrg;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Módulos"
        subtitle="ACTIVAR Y DESACTIVAR POR ETAPA Y ASIGNATURA"
        romanNum="§ III"
      />

      {loading && (
        <div className="font-mono text-[12px] text-marron-soft py-8 text-center">
          Cargando catálogo…
        </div>
      )}

      {!loading && STAGE_ORDER.filter((s) => grouped[s]).map((stage) => (
        <section key={stage} className="mb-8">
          <SectionLabel>{STAGE_LABELS[stage]}</SectionLabel>

          {CATEGORY_ORDER.filter((c) => grouped[stage][c]).map((cat) => (
            <div key={cat} className="mb-5">
              <div className="font-mono text-[10px] tracking-[0.12em] text-marron-soft uppercase mb-2">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="space-y-2">
                {grouped[stage][cat]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((mod) => (
                    <ModuleRow
                      key={mod.id}
                      mod={mod}
                      isOn={activeSet.has(mod.id)}
                      pending={
                        (activate.isPending && activate.variables === mod.id) ||
                        (deactivate.isPending && deactivate.variables === mod.id)
                      }
                      onToggle={() => handleToggle(mod.id, activeSet.has(mod.id))}
                    />
                  ))}
              </div>
            </div>
          ))}
        </section>
      ))}

      <div className="mt-4 bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
        <p className="font-mono text-[11px] text-[#7A5A1E]">
          Los módulos desactivados ocultan las herramientas a todos los profesores del centro.
          Inglés (asignatura ordinaria) y Cambridge (preparación específica) se activan por separado.
        </p>
      </div>
    </div>
  );
}

function ModuleRow({ mod, isOn, pending, onToggle }) {
  return (
    <div
      className={`bg-card-bg border shadow-card card-fold p-4 transition-all duration-200 ${
        isOn ? 'border-linea' : 'border-[rgba(184,169,136,0.4)] opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className="w-0.5 h-10 flex-shrink-0 mt-1"
            style={{
              background: mod.category === 'preparacion_examen' ? '#1F2A4D' : '#14182B',
              opacity: isOn ? 1 : 0.3,
            }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[14px] text-tinta">{mod.name}</span>
              {mod.category === 'preparacion_examen' && (
                <Badge variant="trial">PREP. EXAMEN</Badge>
              )}
            </div>
            <div className="font-mono text-[10px] text-marron-soft">
              {mod.route_prefix}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {pending && (
            <span className="font-mono text-[10px] text-marron-soft">guardando…</span>
          )}
          <Toggle on={isOn} onChange={onToggle} disabled={pending} />
        </div>
      </div>
    </div>
  );
}
