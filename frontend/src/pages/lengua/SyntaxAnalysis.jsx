import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { lenguaApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '4primaria', label: '4º P.' }, { value: '5primaria', label: '5º P.' },
  { value: '6primaria', label: '6º P.' }, { value: '1eso', label: '1º ESO' },
  { value: '2eso', label: '2º ESO' }, { value: '3eso', label: '3º ESO' },
  { value: '4eso', label: '4º ESO' },
];

const ANALYSIS_DEPTH = [
  { value: 'basic', label: 'Básico' },
  { value: 'full', label: 'Completo' },
  { value: 'morpho', label: '+ Morfología' },
];

// Tag colors per syntactic function
const FUNC_COLORS = {
  SN: '#1F2A4D', SV: '#6B1F2A', Suj: '#1F2A4D', Pred: '#6B1F2A',
  Det: '#2D6A4F', N: '#2D4A6A', Adj: '#7A5A1E', V: '#6B1F2A',
  CD: '#2D4A6A', CI: '#3D3D3D', CC: '#1A5C35', Atr: '#7A5A1E',
  default: '#B8A988',
};

function SyntaxTag({ label, func }) {
  const color = FUNC_COLORS[func] || FUNC_COLORS.default;
  return (
    <span
      className="inline-flex flex-col items-center gap-0.5 mx-0.5"
    >
      <span className="text-[13px] text-tinta">{label}</span>
      <span
        className="font-mono text-[8px] px-1 py-0.5 border leading-none"
        style={{ color, borderColor: color, background: `${color}10` }}
      >
        {func}
      </span>
    </span>
  );
}

export default function SyntaxAnalysis() {
  const [sentence, setSentence] = useState('');
  const [form, setForm] = useState({ course: ['6primaria'], depth: ['full'] });
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => lenguaApi.analyzeSyntax({
      sentence,
      course: form.course[0],
      depth: form.depth[0],
    }),
    onSuccess: (res) => setResult(res.data),
  });

  const EXAMPLE_SENTENCES = [
    'El perro negro corrió por el parque.',
    'María compró un libro interesante en la librería.',
    'Los niños jugaban felizmente en el jardín de la escuela.',
  ];

  return (
    <div className="animate-slide-in">
      <PageHeader title="Análisis sintáctico" subtitle="LENGUA · ÁRBOL + ETIQUETADO" romanNum="§ II.III" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">ORACIÓN</SectionLabel>
            <textarea
              className="vg-textarea w-full h-20 text-[13px]"
              placeholder="Introduce la oración a analizar..."
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
            <div className="mt-2">
              <div className="font-mono text-[10px] text-marron-soft mb-1.5">EJEMPLOS RÁPIDOS</div>
              <div className="space-y-1">
                {EXAMPLE_SENTENCES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSentence(s)}
                    className="w-full text-left text-[11px] text-marron-soft hover:text-tinta transition-colors truncate"
                  >
                    — {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">PROFUNDIDAD</SectionLabel>
            <TagCloud options={ANALYSIS_DEPTH} selected={form.depth} onChange={(v) => setForm((f) => ({ ...f, depth: v }))} multi={false} />
          </div>

          <Button
            className="w-full"
            loading={isPending}
            disabled={sentence.trim().length < 5}
            onClick={() => mutate()}
          >
            Analizar →
          </Button>
        </div>

        {/* Result */}
        <div className="col-span-3">
          {!result && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[40px] text-[rgba(184,169,136,0.3)] mb-2">§ III</div>
                <p className="font-mono text-[11px] text-marron-soft">Introduce una oración para analizarla</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-granate border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Analizando estructura sintáctica...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Sentence with tags */}
              <div className="bg-card-bg border border-linea shadow-card p-5">
                <SectionLabel className="mb-3">ETIQUETADO</SectionLabel>
                <div className="flex flex-wrap gap-1 items-end">
                  {result.tokens?.map((tok, i) => (
                    <SyntaxTag key={i} label={tok.word} func={tok.function} />
                  ))}
                </div>
              </div>

              {/* Tree structure */}
              {result.tree && (
                <div className="bg-card-bg border border-linea shadow-card p-5">
                  <SectionLabel className="mb-3">ÁRBOL SINTÁCTICO</SectionLabel>
                  <div className="font-mono text-[11px] text-tinta whitespace-pre leading-relaxed overflow-x-auto">
                    {result.tree}
                  </div>
                </div>
              )}

              {/* Breakdown */}
              {result.breakdown && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">ANÁLISIS DETALLADO</SectionLabel>
                  <div className="space-y-2">
                    {Object.entries(result.breakdown).map(([func, data]) => (
                      <div key={func} className="flex gap-3 text-[12px]">
                        <span
                          className="font-mono text-[10px] px-1.5 py-0.5 border w-16 flex-shrink-0 text-center"
                          style={{
                            color: FUNC_COLORS[func] || FUNC_COLORS.default,
                            borderColor: FUNC_COLORS[func] || FUNC_COLORS.default,
                          }}
                        >
                          {func}
                        </span>
                        <div className="flex-1">
                          <span className="text-tinta font-medium">{data.text}</span>
                          {data.explanation && (
                            <span className="text-marron-soft ml-2">— {data.explanation}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Morphology */}
              {result.morphology?.length > 0 && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">ANÁLISIS MORFOLÓGICO</SectionLabel>
                  <div className="space-y-1.5">
                    {result.morphology.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 text-[12px]">
                        <span className="font-medium text-tinta w-24 flex-shrink-0">{m.word}</span>
                        <span className="font-mono text-[10px] text-marron-soft border border-linea px-1 py-0.5">{m.category}</span>
                        <span className="text-marron-soft text-[11px]">{m.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="syntax"
                  data={result}
                  title="Análisis sintáctico"
                  subtitle={result.sentence}
                  moduleKey="espanol"
                  filename={`sintaxis-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); setSentence(''); }}>Nueva oración</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
