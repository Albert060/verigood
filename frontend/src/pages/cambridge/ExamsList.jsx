import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cambridgeApi } from '../../services/api';
import { PageHeader, Button, SectionLabel } from '../../components/ui';

const LEVEL_COLORS = {
  A1: '#2D6A4F', A2: '#2D6A4F', B1: '#1F2A4D', B2: '#1F2A4D', C1: '#6B1F2A', C2: '#6B1F2A',
};

const MODULE_LABELS = { cambridge: 'Cambridge', espanol: 'Lengua', matematicas: 'Matemáticas', medio: 'C. del Medio' };

export default function ExamsList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cambridge-exams'],
    queryFn: () => cambridgeApi.getExams(),
    select: (r) => r.data.exams || [],
  });

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: (id) => cambridgeApi.deleteExam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cambridge-exams'] }),
  });

  const allExams = data || [];

  // Tipos disponibles inferidos de los datos: evita hardcodear y se mantiene
  // siempre alineado con lo que realmente hay en BD.
  const availableTypes = useMemo(() => {
    const s = new Set();
    allExams.forEach((e) => (e.exerciseTypes || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [allExams]);

  const availableModules = useMemo(() => {
    const s = new Set();
    allExams.forEach((e) => e.module && s.add(e.module));
    return Array.from(s).sort();
  }, [allExams]);

  const exams = allExams.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      const hit = (e.title || '').toLowerCase().includes(q) || (e.topic || '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (filterLevel && e.level !== filterLevel) return false;
    if (filterType && !(e.exerciseTypes || []).includes(filterType)) return false;
    if (filterModule && e.module !== filterModule) return false;
    if (filterFrom && new Date(e.createdAt) < new Date(filterFrom)) return false;
    if (filterTo) {
      // Incluimos el día completo "hasta"
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(e.createdAt) > to) return false;
    }
    return true;
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const resetFilters = () => {
    setSearch(''); setFilterLevel(''); setFilterType('');
    setFilterModule(''); setFilterFrom(''); setFilterTo('');
  };

  const anyFilter = search || filterLevel || filterType || filterModule || filterFrom || filterTo;

  return (
    <div className="animate-slide-in">
      <PageHeader title="Mis exámenes" subtitle="CAMBRIDGE · HISTORIAL" romanNum="§ I.V" />

      {/* Search bar + acción primaria */}
      <div className="flex items-center gap-3 mb-3">
        <input
          className="vg-input flex-1"
          placeholder="Buscar por título o tema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => navigate('/cambridge/exams/new')}>Nuevo examen →</Button>
      </div>

      {/* Filtros */}
      <div className="bg-card-bg border border-linea shadow-card p-3 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <SectionLabel>FILTROS</SectionLabel>
          {anyFilter && (
            <button
              onClick={resetFilters}
              className="font-mono text-[10px] text-marron-soft hover:text-granate transition-colors"
            >
              Limpiar →
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-3">
          <label className="block">
            <span className="block font-mono text-[10px] text-marron-soft mb-1 tracking-[0.1em]">NIVEL</span>
            <select className="vg-select w-full" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="">Todos</option>
              {['A1','A2','B1','B2','C1','C2'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] text-marron-soft mb-1 tracking-[0.1em]">TIPO</span>
            <select className="vg-select w-full" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todos</option>
              {availableTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] text-marron-soft mb-1 tracking-[0.1em]">MÓDULO</span>
            <select className="vg-select w-full" value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
              <option value="">Todos</option>
              {availableModules.map((m) => <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] text-marron-soft mb-1 tracking-[0.1em]">DESDE</span>
            <input type="date" className="vg-input w-full" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] text-marron-soft mb-1 tracking-[0.1em]">HASTA</span>
            <input type="date" className="vg-input w-full" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && exams.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)]">§</div>
          <p className="font-mono text-[11px] text-marron-soft">
            {anyFilter ? 'No hay exámenes que coincidan con los filtros' : 'No hay exámenes todavía'}
          </p>
          {!anyFilter && (
            <button
              onClick={() => navigate('/cambridge/exams/new')}
              className="mt-2 font-mono text-[11px] text-marino border border-marino px-3 py-1.5 hover:bg-[rgba(31,42,77,0.05)] transition-colors"
            >
              Crear primer examen →
            </button>
          )}
        </div>
      )}

      {!isLoading && exams.length > 0 && (
        <div className="bg-card-bg border border-linea shadow-card">
          <table className="vg-table w-full">
            <thead>
              <tr>
                <th>NIVEL</th>
                <th>TÍTULO / TEMA</th>
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
                    <div className="text-[13px] text-tinta truncate max-w-[280px]">{exam.title || '—'}</div>
                    {exam.topic && exam.topic !== exam.title && (
                      <div className="font-mono text-[10px] text-marron-soft truncate max-w-[280px]">{exam.topic}</div>
                    )}
                  </td>
                  <td className="text-center">
                    <span className="font-mono text-[12px] text-tinta">{exam.totalQuestions || '—'}</span>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(exam.exerciseTypes || []).slice(0, 2).map((t) => (
                        <span key={t} className="font-mono text-[9px] text-marron-soft border border-linea px-1 py-0.5">
                          {t.replace(/_/g, ' ')}
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
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => navigate(`/cambridge/exams/${exam.id}`)}
                        className="font-mono text-[10px] text-marron-soft border border-linea px-2 py-1 hover:border-tinta hover:text-tinta transition-colors"
                      >
                        Ver →
                      </button>
                      <button
                        disabled={deleting}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este examen?')) doDelete(exam.id);
                        }}
                        className="font-mono text-[10px] text-marron-soft border border-linea px-2 py-1 hover:border-granate hover:text-granate transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2 border-t border-linea flex items-center justify-between">
            <span className="font-mono text-[10px] text-marron-soft">
              {exams.length} examen{exams.length !== 1 ? 'es' : ''}
            </span>
            {allExams.length > exams.length && (
              <span className="font-mono text-[10px] text-marron-soft">
                {allExams.length - exams.length} filtrados
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
