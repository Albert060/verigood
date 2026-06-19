import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleToolsApi, libraryApi } from '../../services/api';
import { PageHeader, Button } from '../ui';
import DynamicForm from './DynamicForm';
import ResultRenderer from './results/ResultRenderer';
import DownloadPdfButton from '../ui/DownloadPdfButton';

// Construye el estado inicial del form a partir de los defaults del schema.
const buildInitialInput = (schema) => {
  const init = {};
  ((schema && schema.fields) || []).forEach((f) => {
    if (f.default !== undefined) init[f.key] = f.default;
  });
  return init;
};

// Convierte la respuesta de error del backend en un map { fieldKey: mensaje }
// para pasarlo a DynamicForm.
const parseValidationErrors = (err) => {
  const details = err?.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, d) => {
    const msg = {
      REQUIRED: 'Campo obligatorio',
      NOT_A_NUMBER: 'Debe ser un número',
      BELOW_MIN: `Mínimo permitido: ${d.min}`,
      ABOVE_MAX: `Máximo permitido: ${d.max}`,
      INVALID_OPTION: 'Opción no válida',
      NOT_A_STRING: 'Texto no válido',
    }[d.error] || d.error;
    acc[d.field] = msg;
    return acc;
  }, {});
};

// El backend pdfService ahora entiende cada output_kind directamente, así que
// no hace falta mapeo: pasamos el kind tal cual y el renderer correcto se
// invoca según el `switch` de buildPdf.

// Heurística para sacar un título legible del input + tool.
const buildDefaultTitle = (tool, input) => {
  const parts = [tool.name];
  const candidates = ['topic','theme','focus','concept','course','level','skill','sentence','work'];
  for (const k of candidates) {
    const v = input?.[k];
    if (typeof v === 'string' && v.trim()) {
      parts.push(v.trim().slice(0, 40));
      break;
    }
  }
  return parts.join(' · ');
};

export default function ToolRunner({ moduleId, tool }) {
  const qc = useQueryClient();
  const [input, setInput] = useState(() => buildInitialInput(tool.input_schema));
  const [savedId, setSavedId] = useState(null);

  const run = useMutation({
    mutationFn: () => moduleToolsApi.run(moduleId, tool.key, input).then((r) => r.data),
    onMutate: () => setSavedId(null),
    onSuccess: () => {
      // El dispatcher backend ya auto-persiste en library_items y escribe en
      // usage_logs. Invalidamos las queries que muestran ambos para que la
      // próxima vez que el usuario las abra (Dashboard, Biblioteca, Home del
      // módulo) vea su acción reflejada sin esperar al refetchInterval.
      qc.invalidateQueries({ queryKey: ['org-stats'] });
      qc.invalidateQueries({ queryKey: ['library-items'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const save = useMutation({
    mutationFn: () => libraryApi.create({
      moduleId,
      toolKey: tool.key,
      kind: run.data?.output_kind,
      title: buildDefaultTitle(tool, input),
      payload: run.data?.output,
      metadata: { input, toolName: tool.name },
    }).then((r) => r.data),
    onSuccess: (data) => setSavedId(data.id),
  });

  const validationErrors = useMemo(
    () => (run.error ? parseValidationErrors(run.error) : {}),
    [run.error]
  );

  const topLevelError = useMemo(() => {
    if (!run.error) return null;
    const code = run.error?.response?.data?.code;
    const msg  = run.error?.response?.data?.error;
    if (code === 'INVALID_INPUT') return null;
    if (code === 'TOOL_NOT_IMPLEMENTED') {
      return 'Esta herramienta está declarada pero aún no tiene implementación. Pronto.';
    }
    if (code === 'MODULE_INACTIVE') {
      return 'Tu colegio no tiene este módulo activado.';
    }
    if (code === 'BAD_AI_RESPONSE') {
      return 'La IA devolvió un resultado no válido. Pulsa "Generar" para volver a intentarlo.';
    }
    if (code === 'AI_NOT_CONFIGURED') {
      return 'La integración con la API de IA no está configurada en este servidor. Pide al administrador del centro que configure ANTHROPIC_API_KEY.';
    }
    if (code === 'AI_INVALID_KEY') {
      return 'La clave de la API de IA no es válida o ha caducado. Avisa al administrador del centro para actualizarla.';
    }
    if (code === 'AI_RATE_LIMITED') {
      return 'Has alcanzado el límite de la API de IA. Espera unos segundos y reintenta.';
    }
    if (code === 'AI_UNAVAILABLE') {
      return 'La API de IA está temporalmente saturada. Reintenta en unos segundos.';
    }
    if (run.error?.code === 'ECONNABORTED' || /timeout/i.test(run.error?.message || '')) {
      return 'La generación está tardando demasiado. Reduce el tamaño (menos preguntas, menos hitos…) y vuelve a intentarlo.';
    }
    if (!run.error?.response) {
      return 'No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo.';
    }
    // Si el mensaje del backend trae un body de Anthropic crudo, lo escondemos:
    // no aporta nada útil al profesor y revela detalles de implementación.
    if (typeof msg === 'string' && msg.includes('authentication_error')) {
      return 'La clave de la API de IA no es válida o ha caducado. Avisa al administrador del centro.';
    }
    return msg || 'Error al ejecutar la herramienta.';
  }, [run.error]);

  const pdfType = run.data?.output_kind || null;
  const defaultTitle = buildDefaultTitle(tool, input);

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={tool.name}
        subtitle={tool.description}
        romanNum="§"
      />

      <div className="mt-6 max-w-2xl">
        <DynamicForm
          schema={tool.input_schema}
          value={input}
          onChange={setInput}
          disabled={run.isPending}
          errors={validationErrors}
        />

        <div className="mt-7 flex items-center gap-3">
          <Button
            variant="primary"
            disabled={run.isPending}
            loading={run.isPending}
            onClick={() => run.mutate()}
          >
            {run.isPending ? 'Generando…' : 'Generar'}
          </Button>
          {run.data && (
            <Button variant="ghost" onClick={() => { run.reset(); setSavedId(null); }}>
              Limpiar resultado
            </Button>
          )}
        </div>

        {topLevelError && (
          <div className="mt-4 px-4 py-3 border border-granate/40 bg-granate/5 text-granate font-mono text-[12px]">
            {topLevelError}
          </div>
        )}
      </div>

      {run.data && (
        <div className="mt-10">
          {run.data.demo && (
            <div className="mb-4 px-4 py-3 border border-amarillo/60 bg-amarillo/20 text-tinta font-mono text-[11px] leading-relaxed">
              MODO DEMO · resultado de muestra (sin clave de IA configurada). Avisa al administrador del centro para activar la generación real.
            </div>
          )}
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-marron-soft">
              Resultado · {run.data.output_kind}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {pdfType && (
                <DownloadPdfButton
                  type={pdfType}
                  data={run.data.output}
                  title={defaultTitle}
                  subtitle={tool.name}
                  moduleKey={moduleId}
                  filename={`${tool.key.replace(/\./g, '-')}-${Date.now()}`}
                  variant="ghost"
                  size="sm"
                  label="PDF"
                />
              )}
              {run.data.autoSaved ? (
                <span className="font-mono text-[11px] text-marron-soft border border-linea px-2.5 py-1.5">
                  ✓ Guardado en biblioteca
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={save.isPending}
                  disabled={!!savedId}
                  onClick={() => save.mutate()}
                >
                  {savedId ? '✓ Guardado en biblioteca' : '☐ Guardar en biblioteca'}
                </Button>
              )}
            </div>
          </div>
          {save.error && (
            <div className="mb-3 px-3 py-2 border border-granate/40 bg-granate/5 text-granate font-mono text-[11px]">
              No se pudo guardar en la biblioteca: {save.error?.response?.data?.error || save.error.message}
            </div>
          )}
          <ResultRenderer kind={run.data.output_kind} data={run.data.output} />
        </div>
      )}
    </div>
  );
}
