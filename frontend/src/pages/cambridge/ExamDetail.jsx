import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cambridgeApi } from '../../services/api';
import { PageHeader, Button, SectionLabel, Card } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const LEVEL_COLORS = {
  A1: '#2D6A4F', A2: '#2D6A4F', B1: '#1F2A4D', B2: '#1F2A4D', C1: '#6B1F2A', C2: '#6B1F2A',
};

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: exam, isLoading } = useQuery({
    queryKey: ['cambridge-exam', id],
    queryFn: () => cambridgeApi.getExam(id).then((r) => r.data.exam),
    enabled: !!id,
  });

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: () => cambridgeApi.deleteExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cambridge-exams'] });
      navigate('/cambridge/exams');
    },
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="animate-slide-in">
        <PageHeader title="Examen no encontrado" subtitle="CAMBRIDGE" romanNum="§" />
        <Button variant="ghost" onClick={() => navigate('/cambridge/exams')}>← Volver a Mis exámenes</Button>
      </div>
    );
  }

  const questions = Array.isArray(exam.questions) ? exam.questions : [];

  // El PDF se regenera on-demand desde los datos del examen — sin storage de blobs.
  const pdfData = {
    title: exam.title,
    level: exam.level,
    topic: exam.topic,
    questions,
  };

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={exam.title || 'Examen'}
        subtitle={`CAMBRIDGE · ${exam.level || ''} · ${formatDate(exam.createdAt || exam.created_at)}`}
        romanNum="§ I.V"
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Button variant="ghost" onClick={() => navigate('/cambridge/exams')}>← Volver</Button>
        <DownloadPdfButton
          type="exam"
          data={pdfData}
          title={exam.title}
          subtitle={`Cambridge · ${exam.level || ''}`}
          moduleKey="cambridge"
          filename={`examen-${exam.level || 'cambridge'}-${(exam.topic || 'general').slice(0, 30)}`}
        />
        <Button
          variant="ghost"
          loading={deleting}
          onClick={() => {
            if (window.confirm('¿Eliminar este examen de la biblioteca? Esta acción no se puede deshacer.')) {
              doDelete();
            }
          }}
        >
          Eliminar
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="font-mono text-[11px] font-bold px-1.5 py-0.5 border"
            style={{
              color: LEVEL_COLORS[exam.level] || '#B8A988',
              borderColor: LEVEL_COLORS[exam.level] || '#B8A988',
              background: `${LEVEL_COLORS[exam.level] || '#B8A988'}10`,
            }}
          >
            {exam.level}
          </span>
          <span className="font-mono text-[10px] text-marron-soft">{questions.length} preguntas</span>
        </div>
      </div>

      <Card className="p-5 mb-4">
        <SectionLabel className="mb-3">RESUMEN</SectionLabel>
        <div className="grid grid-cols-2 gap-y-2 text-[12.5px]">
          <div className="text-marron-soft font-mono text-[11px]">Tema</div>
          <div className="text-tinta">{exam.topic || '—'}</div>
          <div className="text-marron-soft font-mono text-[11px]">Profesor</div>
          <div className="text-tinta">{exam.teacherName || exam.teacher_name || '—'}</div>
          <div className="text-marron-soft font-mono text-[11px]">Creado</div>
          <div className="text-tinta">{formatDate(exam.createdAt || exam.created_at)}</div>
        </div>
      </Card>

      <SectionLabel className="mb-3">PREGUNTAS</SectionLabel>
      <div className="space-y-3">
        {questions.length === 0 && (
          <p className="font-mono text-[11px] text-marron-soft">Este examen no tiene preguntas guardadas.</p>
        )}
        {questions.map((q, i) => (
          <Card key={q.id || i} className="p-4">
            <div className="flex items-start gap-3">
              <span className="font-mono text-[11px] text-marron-soft pt-0.5">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-tinta leading-relaxed mb-2">{q.question || q.prompt || '—'}</div>
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {q.options.map((opt, j) => (
                      <div key={j} className="font-mono text-[11px] text-marron-soft">
                        <span className="text-tinta">{String.fromCharCode(65 + j)})</span> {opt}
                      </div>
                    ))}
                  </div>
                )}
                {q.answer && (
                  <div className="font-mono text-[11px] text-marino">→ {q.answer}</div>
                )}
                {q.explanation && (
                  <div className="font-caveat text-[13px] text-marron-soft mt-1">{q.explanation}</div>
                )}
              </div>
              {q.type && (
                <span className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5 flex-shrink-0">
                  {q.type.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
