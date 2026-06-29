import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { modulesApi } from '../../services/api';
import { PageHeader, Badge, SectionLabel } from '../../components/ui';

const STAGE_LABELS = { primaria: 'Primaria', eso: 'ESO', bachillerato: 'Bachillerato' };
const STAGE_ORDER  = ['primaria', 'eso', 'bachillerato'];
const CATEGORY_LABELS = {
  asignatura: 'Asignaturas',
  preparacion_examen: 'Preparación de exámenes',
  religion_valores: 'Religión y valores',
  accion_tutorial: 'Acción tutorial',
};
const CATEGORY_ORDER = ['asignatura', 'preparacion_examen', 'religion_valores', 'accion_tutorial'];

// Vista del admin del centro: SOLO LECTURA del contrato.
// Quien contrata módulos es el superadmin; el admin se limita a ver lo que
// tiene activo y a distribuirlo entre sus profesores (eso vive en /dashboard/users).
export default function InstitutionalModules() {
  const { user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['modules', 'org', orgId],
    queryFn: () => modulesApi.listOrgModules(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  // Sólo los módulos contratados. No hay catálogo global aquí — el admin no
  // debe ver lo que no ha contratado.
  const grouped = useMemo(() => {
    const tree = {};
    (orgData?.modules || []).forEach((m) => {
      if (!tree[m.stage]) tree[m.stage] = {};
      if (!tree[m.stage][m.category]) tree[m.stage][m.category] = [];
      tree[m.stage][m.category].push(m);
    });
    return tree;
  }, [orgData]);

  const total = orgData?.modules?.length || 0;
  const hasAny = total > 0;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Módulos contratados"
        subtitle={`${total} MÓDULOS ACTIVOS · GESTIONADOS POR EL SUPERADMIN`}
        romanNum="§ III"
      />

      {isLoading && (
        <div className="font-mono text-[12px] text-marron-soft py-8 text-center">
          Cargando módulos contratados…
        </div>
      )}

      {!isLoading && !hasAny && (
        <div className="bg-card-bg border border-linea shadow-card card-fold p-6 text-center">
          <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)]">§</div>
          <p className="font-mono text-[12px] text-tinta mt-2">
            Aún no tienes módulos contratados.
          </p>
          <p className="font-mono text-[11px] text-marron-soft mt-1">
            Contacta con el equipo de VeriGood para que el superadmin asigne los módulos a tu centro.
          </p>
        </div>
      )}

      {!isLoading && hasAny && STAGE_ORDER.filter((s) => grouped[s]).map((stage) => (
        <section key={stage} className="mb-8">
          <SectionLabel>{STAGE_LABELS[stage]}</SectionLabel>

          {CATEGORY_ORDER.filter((c) => grouped[stage][c]).map((cat) => (
            <div key={cat} className="mb-5">
              <div className="font-mono text-[10px] tracking-[0.12em] text-marron-soft uppercase mb-2">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="space-y-2">
                {grouped[stage][cat]
                  .slice()
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((mod) => (
                    <ContractedModuleRow key={mod.id} mod={mod} />
                  ))}
              </div>
            </div>
          ))}
        </section>
      ))}

      <div className="mt-4 bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
        <p className="font-mono text-[11px] text-[#7A5A1E]">
          La activación de módulos a nivel de centro la gestiona el superadmin de VeriGood. Si
          necesitas contratar uno nuevo o dar de baja otro, contáctanos. Tú puedes asignar estos
          módulos contratados a tus profesores desde <span className="underline">Usuarios → Módulos</span>.
        </p>
      </div>
    </div>
  );
}

function ContractedModuleRow({ mod }) {
  return (
    <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-0.5 h-10 flex-shrink-0 mt-1"
          style={{ background: mod.category === 'preparacion_examen' ? '#1F2A4D' : '#14182B' }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[14px] text-tinta">{mod.name}</span>
            {mod.category === 'preparacion_examen' && (
              <Badge variant="trial">PREP. EXAMEN</Badge>
            )}
            <Badge variant="active">CONTRATADO</Badge>
          </div>
          <div className="font-mono text-[10px] text-marron-soft">{mod.route_prefix}</div>
        </div>
      </div>
    </div>
  );
}
