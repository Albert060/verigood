import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stripeApi } from '../../services/api';
import { PageHeader, Button, SectionLabel, Modal, Badge } from '../../components/ui';

// Página de gestión de suscripción accesible desde el CTA "Gestionar
// suscripción" de /dashboard/billing. Tres bloques:
//   1. Cambiar de plan   → checkout session (existente)
//   2. Método de pago    → Customer Portal de Stripe (existente)
//   3. Cancelar          → POST /stripe/subscription/cancel (nuevo)
//
// Cuando Stripe no está configurado en el entorno (stripeAvailable=false)
// la página se muestra completa pero todos los CTAs salen disabled con un
// banner explicativo arriba. Sin sorpresas, sin clics silenciosos.

const PLAN_META = {
  starter:    { name: 'Starter',    price: 29,  blurb: '1 profesor · ideal para probar' },
  colegio:    { name: 'Colegio',    price: 149, blurb: 'Hasta 15 profesores · todos los módulos' },
  enterprise: { name: 'Enterprise', price: null, blurb: 'Sin límite · SSO · multi-sede' },
};
const PLAN_ORDER = ['starter', 'colegio', 'enterprise'];

export default function ManageBilling() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['stripe-status'],
    queryFn: () => stripeApi.status().then((r) => r.data),
  });

  const checkoutMut = useMutation({
    mutationFn: (plan) => stripeApi.checkout(plan),
    onSuccess: (r) => { if (r.data?.url) window.location.href = r.data.url; },
  });
  const portalMut = useMutation({
    mutationFn: () => stripeApi.portal(),
    onSuccess: (r) => { if (r.data?.url) window.location.href = r.data.url; },
  });
  const cancelMut = useMutation({
    mutationFn: () => stripeApi.cancelSubscription(),
    onSuccess: () => {
      setConfirmingCancel(false);
      qc.invalidateQueries({ queryKey: ['stripe-status'] });
    },
  });
  const resumeMut = useMutation({
    mutationFn: () => stripeApi.resumeSubscription(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stripe-status'] }),
  });

  const configured = !!status?.configured;
  const currentPlan = status?.plan || 'colegio';
  const sub = status?.subscription;
  const cancellingAtPeriodEnd = !!sub?.cancel_at_period_end;
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Gestión de suscripción"
        subtitle="CAMBIA PLAN · ACTUALIZA PAGO · CANCELA"
        romanNum="§ VI"
        actions={<Button variant="ghost" onClick={() => navigate('/dashboard/billing')}>← Volver a facturación</Button>}
      />

      {!isLoading && !configured && (
        <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-3 mb-5">
          <p className="font-mono text-[11px] text-[#7A5A1E]">
            Stripe no está configurado en este entorno. La página de gestión es funcional
            pero los CTAs quedan deshabilitados — se activarán automáticamente al
            desplegar con las claves de Stripe en producción.
          </p>
        </div>
      )}

      {cancellingAtPeriodEnd && (
        <div className="bg-[rgba(107,31,42,0.06)] border border-granate p-3 mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-tinta font-medium">Cancelación programada</p>
            <p className="font-mono text-[11px] text-marron-soft">
              Tu suscripción terminará el {periodEnd?.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}. Hasta entonces sigues teniendo acceso completo.
            </p>
          </div>
          <Button
            variant="ghost"
            loading={resumeMut.isPending}
            onClick={() => resumeMut.mutate()}
            disabled={!configured}
          >
            Reactivar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── 1. CAMBIAR DE PLAN ─────────────────────────── */}
        <section className="bg-card-bg border border-linea shadow-card p-5">
          <SectionLabel className="mb-3">§ I · CAMBIAR DE PLAN</SectionLabel>
          <p className="font-mono text-[11px] text-marron-soft mb-4">
            Selecciona un plan. Te llevamos a la pasarela de Stripe para confirmar el cambio.
          </p>
          <div className="space-y-2">
            {PLAN_ORDER.map((key) => {
              const m = PLAN_META[key];
              const isCurrent = key === currentPlan;
              const pending = checkoutMut.isPending && checkoutMut.variables === key;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between border p-3 ${
                    isCurrent ? 'border-marino bg-[rgba(31,42,77,0.04)]' : 'border-linea'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-tinta">{m.name}</span>
                      {isCurrent && <Badge variant="active">ACTUAL</Badge>}
                    </div>
                    <div className="font-mono text-[10px] text-marron-soft mt-0.5">{m.blurb}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[13px] text-tinta">
                      {m.price ? `${m.price} €/mes` : 'A medida'}
                    </span>
                    <Button
                      size="sm"
                      variant={isCurrent ? 'ghost' : 'primary'}
                      disabled={isCurrent || !configured || pending}
                      loading={pending}
                      onClick={() => checkoutMut.mutate(key)}
                    >
                      {isCurrent ? '—' : 'Cambiar'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {checkoutMut.isError && (
            <p className="font-mono text-[10px] text-granate mt-3">
              {checkoutMut.error?.response?.data?.error || 'No se pudo iniciar el cambio de plan.'}
            </p>
          )}
        </section>

        {/* ── 2. MÉTODO DE PAGO ──────────────────────────── */}
        <section className="bg-card-bg border border-linea shadow-card p-5 flex flex-col">
          <SectionLabel className="mb-3">§ II · MÉTODO DE PAGO</SectionLabel>
          <p className="font-mono text-[11px] text-marron-soft mb-4 flex-1">
            Te llevamos al portal seguro de Stripe para actualizar tarjeta, dirección de
            facturación o NIF. Es la misma sesión que usarías para descargar facturas oficiales.
          </p>
          <Button
            loading={portalMut.isPending}
            disabled={!configured || !status?.hasCustomer}
            onClick={() => portalMut.mutate()}
          >
            Abrir portal de Stripe
          </Button>
          {portalMut.isError && (
            <p className="font-mono text-[10px] text-granate mt-3">
              {portalMut.error?.response?.data?.error || 'No se pudo abrir el portal.'}
            </p>
          )}
          {configured && !status?.hasCustomer && (
            <p className="font-mono text-[10px] text-marron-soft mt-3">
              El portal se activa tras la primera suscripción a un plan.
            </p>
          )}
        </section>

        {/* ── 3. CANCELAR SUSCRIPCIÓN ────────────────────── */}
        <section className="bg-card-bg border border-linea shadow-card p-5 flex flex-col">
          <SectionLabel className="mb-3">§ III · CANCELAR SUSCRIPCIÓN</SectionLabel>
          <p className="font-mono text-[11px] text-marron-soft mb-4 flex-1">
            Mantenemos tu acceso hasta el final del periodo ya facturado. No emitiremos
            cargos posteriores. Puedes reactivar antes de esa fecha sin perder nada.
          </p>
          <Button
            variant="danger"
            disabled={!configured || !status?.hasCustomer || cancellingAtPeriodEnd}
            onClick={() => setConfirmingCancel(true)}
          >
            {cancellingAtPeriodEnd ? 'Cancelación programada' : 'Cancelar suscripción'}
          </Button>
        </section>
      </div>

      <Modal
        open={confirmingCancel}
        onClose={() => setConfirmingCancel(false)}
        title="Confirmar cancelación"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>Volver atrás</Button>
            <Button
              variant="danger"
              loading={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
            >
              Sí, cancelar al final del periodo
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-tinta">
            Tu suscripción se cancelará al final del periodo de facturación actual.
            Hasta entonces el centro mantiene acceso completo a todos los módulos
            activados y a la biblioteca.
          </p>
          <p className="font-mono text-[11px] text-marron-soft">
            Si cambias de idea antes de esa fecha, puedes reactivar desde esta misma pantalla.
            Después del corte, los profesores conservarán sus datos pero perderán acceso a las
            herramientas de IA.
          </p>
          {cancelMut.isError && (
            <p className="font-mono text-[10px] text-granate">
              {cancelMut.error?.response?.data?.error || 'No se pudo cancelar la suscripción.'}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
