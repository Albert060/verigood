import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { anthropicApi } from '../../services/api';
import { PageHeader, SectionLabel, Button, Input } from '../../components/ui';

// Página de configuración de la clave de Anthropic para el centro.
// Ruta: /dashboard/anthropic.
// Solo accesible para admin_centro / superadmin.
//
// Flujo en 3 pasos:
//   1. El admin ve qué es y por qué hace falta.
//   2. Sigue la guía paso a paso para generar la clave en console.anthropic.com.
//   3. Pega la clave; el backend la verifica con Anthropic, la cifra y la guarda.
//
// Cuando está activa, muestra el "hint" (sk-ant-…ABC1) y la fecha de activación,
// además del botón para reemplazar la clave o desactivarla.

const STEPS = [
  {
    n: 1,
    title: 'Crea o entra en tu cuenta de Anthropic',
    body: (
      <>
        Ve a{' '}
        <a
          href="https://console.anthropic.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-marino underline hover:text-granate"
        >
          console.anthropic.com
        </a>
        {' '}y crea una cuenta de empresa o entra con la que ya tengas. La cuenta debe estar a nombre del centro.
      </>
    ),
  },
  {
    n: 2,
    title: 'Añade un método de pago',
    body: (
      <>
        En el menú lateral entra en <strong>Settings → Billing</strong> y registra una tarjeta. Anthropic cobra por uso (pay-as-you-go); no hay cuota fija. Los precios actuales están en{' '}
        <a
          href="https://www.anthropic.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-marino underline hover:text-granate"
        >
          anthropic.com/pricing
        </a>.
      </>
    ),
  },
  {
    n: 3,
    title: 'Genera una API key',
    body: (
      <>
        En <strong>Settings → API Keys</strong> pulsa <strong>"Create Key"</strong>. Ponle un nombre identificable (ej. <em>"VeriGood — Colegio San Isidro"</em>) y cópiala inmediatamente — Anthropic NO la vuelve a mostrar.
      </>
    ),
  },
  {
    n: 4,
    title: 'Pégala abajo y activa la IA',
    body: (
      <>
        Introduce la clave en el campo de abajo y pulsa <strong>"Probar y activar"</strong>. Verificaremos que es válida llamando a Anthropic con un ping; si pasa, la ciframos (AES-256-GCM) y la guardamos. Anthropic será quien te facture el consumo directamente.
      </>
    ),
  },
];

export default function AnthropicSetup() {
  const { user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['anthropic-status', orgId],
    queryFn: () => anthropicApi.getStatus(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  const saveMut = useMutation({
    mutationFn: (key) => anthropicApi.setKey(orgId, key),
    onSuccess: () => {
      setApiKey('');
      qc.invalidateQueries({ queryKey: ['anthropic-status', orgId] });
    },
  });

  const clearMut = useMutation({
    mutationFn: () => anthropicApi.clear(orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anthropic-status', orgId] }),
  });

  const handleSave = (e) => {
    e?.preventDefault();
    const cleaned = apiKey.trim();
    if (!cleaned) return;
    saveMut.mutate(cleaned);
  };

  const configured = !!status?.configured;
  const encReady = status ? status.encryption_ready : true;

  return (
    <div className="animate-slide-in max-w-3xl">
      <PageHeader
        title="Configurar Anthropic"
        subtitle="ACTIVA LA IA PARA TODAS LAS HERRAMIENTAS DEL CENTRO"
        romanNum="§ VII"
      />

      {/* Estado actual */}
      {!isLoading && (
        <div
          className={`mb-6 border p-4 ${
            configured
              ? 'bg-[rgba(45,106,79,0.07)] border-[#7DC49B]'
              : 'bg-[rgba(232,216,154,0.15)] border-amarillo'
          }`}
        >
          {configured ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] text-tinta font-medium mb-1">
                  IA activa para tu centro
                </p>
                <p className="font-mono text-[11px] text-marron-soft">
                  Clave: <span className="text-tinta">{status.hint}</span>
                  {status.activated_at && (
                    <>
                      {' · '}Activada el{' '}
                      {new Date(status.activated_at).toLocaleDateString('es-ES', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                loading={clearMut.isPending}
                onClick={() => {
                  if (window.confirm('¿Seguro que quieres desactivar la IA? Las herramientas volverán a devolver contenido demo hasta que pegues otra clave.')) {
                    clearMut.mutate();
                  }
                }}
              >
                Desactivar
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-[#7A5A1E] leading-relaxed">
              Tu centro aún no tiene clave de Anthropic configurada. Las
              herramientas funcionan en <strong>modo demo</strong>: devuelven contenido
              de muestra del banco curado y de los fixtures, sin llamar a la IA real.
              Sigue los pasos de abajo para activarla.
            </p>
          )}
        </div>
      )}

      {!encReady && (
        <div className="mb-6 bg-[rgba(107,31,42,0.06)] border border-granate p-3">
          <p className="font-mono text-[11px] text-granate">
            El cifrado del servidor no está configurado. El operador debe añadir
            <code className="mx-1 px-1 bg-papel">ENCRYPTION_KEY</code>
            al <code>.env</code> del backend antes de que puedas guardar tu clave.
          </p>
        </div>
      )}

      {/* Guía */}
      <SectionLabel className="mb-3">CÓMO GENERAR TU CLAVE</SectionLabel>
      <ol className="space-y-4 mb-8">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-card-bg border border-linea p-4 flex gap-4">
            <span className="font-display text-[22px] text-marino font-semibold leading-none flex-shrink-0 w-8">
              {s.n}
            </span>
            <div className="flex-1">
              <p className="text-[14px] text-tinta font-medium mb-1">{s.title}</p>
              <p className="text-[13px] text-marron-soft leading-relaxed">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Form para pegar la clave */}
      <SectionLabel className="mb-3">
        {configured ? 'REEMPLAZAR LA CLAVE' : 'PEGA TU CLAVE'}
      </SectionLabel>
      <form
        onSubmit={handleSave}
        className="bg-card-bg border border-linea p-5 space-y-4"
      >
        <div>
          <Input
            label="API KEY DE ANTHROPIC"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            autoComplete="off"
            spellCheck={false}
            required
          />
          <div className="flex items-center justify-between mt-2">
            <label className="font-mono text-[10.5px] text-marron-soft flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showKey}
                onChange={(e) => setShowKey(e.target.checked)}
              />
              Mostrar la clave mientras la pego
            </label>
            <span className="font-mono text-[10.5px] text-marron-soft">
              Debe empezar por <code>sk-ant-</code>
            </span>
          </div>
        </div>

        {saveMut.isError && (
          <div className="bg-[rgba(107,31,42,0.08)] border border-granate p-2 font-mono text-[11px] text-granate">
            {saveMut.error?.response?.data?.error || 'No se pudo guardar la clave.'}
          </div>
        )}
        {saveMut.isSuccess && (
          <div className="bg-[rgba(45,106,79,0.08)] border border-[#7DC49B] p-2 font-mono text-[11px] text-[#1A5C35]">
            Clave verificada con Anthropic y guardada cifrada. La IA ya está activa.
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10.5px] text-marron-soft flex-1">
            Verificamos la clave con un ping a Anthropic antes de guardarla.
            La almacenamos cifrada con AES-256-GCM.
          </p>
          <Button
            type="submit"
            loading={saveMut.isPending}
            disabled={!apiKey.trim() || !encReady}
          >
            {configured ? 'Reemplazar y verificar' : 'Probar y activar'}
          </Button>
        </div>
      </form>

      <p className="font-mono text-[10.5px] text-marron-soft mt-4 leading-relaxed">
        Anthropic factura el consumo directamente a la tarjeta que registraste en su panel.
        VeriGood no procesa esos pagos. Puedes revocar la clave en
        {' '}<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-marino underline">console.anthropic.com/settings/keys</a>{' '}
        en cualquier momento — al revocar quedará desactivada en VeriGood automáticamente.
      </p>
    </div>
  );
}
