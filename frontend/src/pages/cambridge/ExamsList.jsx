import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cambridgeApi } from '../../services/api';
import { PageHeader, Button, SectionLabel, Badge } from '../../components/ui';

const LEVEL_COLORS = {
  A1: '#2D6A4F', A2: '#2D6A4F', B1: '#1F2A4D', B2: '#1F2A4D', C1: '#6B1F2A', C2: '#6B1F2A',
};

export default function ExamsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cambridge-exams'],
    queryFn: () => cambridgeApi.getExams(),
    select: (r) => r.data.exams || [],
  });

  const exams = (data || []).filter((e) => {
    const matchSearch = !search || e.topic?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !filterLevel || e.level === filterLevel;
    return matchSearch && matchLevel;
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="animate-slide-in">
      <PageHeader title="Mis exámenes" subtitle="CAMBRIDGE · HISTORIAL" romanNum="§ I.V" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <input
          className="vg-input flex-1"
          placeholder="Buscar por tema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="vg-select w-28"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="">Todos</option>
          {['A1','A2','B1','B2','C1','C2'].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <Button onClick={() => navigate('/cambridge/exams/new')}>
          Nuevo examen →
        </Button>
      </div>

      {isLoading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && exams.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)]">§</div>
          <p className="font-mono text-[11px] text-marron-soft">No hay exámenes todavía</p>
          <button
            onClick={() => navigate('/cambridge/exams/new')}
            className="mt-2 font-mono text-[11px] text-marino border border-marino px-3 py-1.5 hover:bg-[rgba(31,42,77,0.05)] transition-colors"
          >
            Crear primer examen →
          </button>
        </div>
      )}

      {!isLoading && exams.length > 0 && (
        <div className="bg-card-bg border border-linea shadow-card">
          <table className="vg-table w-full">
            <thead>
              <tr>
                <th>NIVEL</th>
                <th>TEMA</th>
                <th className="text-center">PREG.</th>
                <th className="text-center">TIPOS</th>
                <th className="text-center">FUENTE</th>
                <th>FECHA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-[rgba(184,169,136,0.06)] transition-colors">
                  <td>
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
                  </td>
                  <td>
                    <span className="text-[13px] text-tinta">{exam.topic || '—'}</span>
                  </td>
                  <td className="text-center">
                    <span className="font-mono text-[12px] text-tinta">{exam.totalQuestions || '—'}</span>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(exam.exerciseTypes || []).slice(0, 2).map((t) => (
                        <span key={t} className="font-mono text-[9px] text-marron-soft border border-linea px-1 py-0.5">
                          {t.replace('_', ' ')}
                        </span>
                      ))}
                      {(exam.exerciseTypes || []).length > 2 && (
                        <span className="font-mono text-[9px] text-marron-soft">+{exam.exerciseTypes.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                      exam.source === 'ai_only'
                        ? 'text-[#6B1F2A] border-[#6B1F2A] bg-[rgba(107,31,42,0.05)]'
                        : 'text-[#1F2A4D] border-[#1F2A4D] bg-[rgba(31,42,77,0.05)]'
                    }`}>
                      {exam.source === 'ai_only' ? 'IA' : 'Híbrido'}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-[11px] text-marron-soft">{formatDate(exam.createdAt)}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/cambridge/exams/${exam.id}`)}
                      className="font-mono text-[10px] text-marron-soft border border-linea px-2 py-1 hover:border-tinta hover:text-tinta transition-colors"
                    >
                      Ver →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2 border-t border-linea flex items-center justify-between">
            <span className="font-mono text-[10px] text-marron-soft">{exams.length} examen{exams.length !== 1 ? 'es' : ''}</span>
            {data?.length > exams.length && (
              <span className="font-mono text-[10px] text-marron-soft">{data.length - exams.length} filtrados</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
