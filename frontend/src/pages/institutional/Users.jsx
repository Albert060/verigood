import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { usersApi, modulesApi } from '../../services/api';
import { PageHeader, Badge, Button, Modal, Input, Select, Toggle, SectionLabel } from '../../components/ui';

const STAGE_LABELS = { primaria: 'Primaria', eso: 'ESO', bachillerato: 'Bachillerato' };
const STAGE_ORDER = ['primaria', 'eso', 'bachillerato'];

export default function InstitutionalUsers() {
  const { user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;
  const qc = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'profesor' });
  const [createdInfo, setCreatedInfo] = useState(null);
  const [modulesTarget, setModulesTarget] = useState(null); // { id, name }
  const [editTarget, setEditTarget] = useState(null);       // { id, name, role }
  const [deleteTarget, setDeleteTarget] = useState(null);   // user completo

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', orgId],
    queryFn: () => usersApi.getAll(orgId).then((r) => r.data),
    enabled: !!orgId,
  });
  const users = usersData?.users || [];
  const activeCount = users.filter((u) => u.is_active).length;

  const createMut = useMutation({
    mutationFn: () => usersApi.create(orgId, form).then((r) => r.data),
    onSuccess: (data) => {
      setCreatedInfo(data);
      setForm({ name: '', email: '', role: 'profesor' });
      qc.invalidateQueries({ queryKey: ['users', orgId] });
    },
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ userId, is_active }) => usersApi.update(userId, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', orgId] }),
  });

  const editMut = useMutation({
    mutationFn: ({ userId, payload }) => usersApi.update(userId, payload),
    onSuccess: () => {
      setEditTarget(null);
      qc.invalidateQueries({ queryKey: ['users', orgId] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (userId) => usersApi.delete(userId),
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['users', orgId] });
    },
  });

  const handleInvite = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    createMut.mutate();
  };

  const closeInvite = () => {
    setInviteOpen(false);
    setCreatedInfo(null);
    setForm({ name: '', email: '', role: 'profesor' });
    createMut.reset();
  };

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Profesores"
        subtitle={`${activeCount} ACTIVOS${usersData?.total ? ` · ${usersData.total} TOTAL` : ''}`}
        romanNum="§ II"
        actions={<Button onClick={() => setInviteOpen(true)}>Invitar profesor</Button>}
      />

      {isLoading && (
        <div className="font-mono text-[12px] text-marron-soft py-8 text-center">
          Cargando profesores…
        </div>
      )}

      {!isLoading && (
        <div className="bg-card-bg border border-linea shadow-card">
          <table className="vg-table">
            <thead>
              <tr>
                <th>NOMBRE</th><th>EMAIL</th><th>ROL</th><th>ESTADO</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-tinta">{u.name}</td>
                  <td className="font-mono text-[11px] text-marron-soft">{u.email}</td>
                  <td>
                    <span className={`font-mono text-[10px] px-2 py-0.5 border ${
                      u.role === 'admin_centro'
                        ? 'bg-[rgba(31,42,77,0.08)] text-marino border-marino'
                        : 'bg-papel text-marron-soft border-linea'
                    }`}>
                      {u.role === 'admin_centro' ? 'ADMIN' : 'PROFESOR'}
                    </span>
                  </td>
                  <td>
                    <Badge variant={u.is_active ? 'active' : 'paused'}>
                      {u.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                  </td>
                  <td className="text-right">
                    {/* Auto-protección: el admin no puede editarse / desactivarse /
                        eliminarse a sí mismo desde esta vista. El backend también
                        lo bloquea (CANNOT_SELF_*), pero ocultamos los CTAs para
                        evitar el clic inútil. */}
                    {(() => {
                      const isSelf = u.id === user?.id;
                      return (
                        <div className="flex justify-end gap-3">
                          {u.role === 'profesor' && (
                            <button
                              className="font-mono text-[10px] text-marino hover:underline"
                              onClick={() => setModulesTarget(u)}
                            >
                              Módulos
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              className="font-mono text-[10px] text-marron-soft hover:text-marino"
                              onClick={() => setEditTarget({ id: u.id, name: u.name, role: u.role })}
                            >
                              Editar
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              className="font-mono text-[10px] text-marron-soft hover:text-granate"
                              onClick={() => toggleActiveMut.mutate({ userId: u.id, is_active: !u.is_active })}
                              disabled={toggleActiveMut.isPending}
                            >
                              {u.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              className="font-mono text-[10px] text-granate hover:underline"
                              onClick={() => setDeleteTarget(u)}
                            >
                              Eliminar
                            </button>
                          )}
                          {isSelf && (
                            <span className="font-mono text-[10px] text-marron-soft italic">tú</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 font-mono text-[12px] text-marron-soft">
                  Sin profesores. Invita al primero.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
        <p className="font-mono text-[11px] text-[#7A5A1E]">
          Cada profesor solo verá y podrá usar los módulos que le asignes desde "Módulos".
          Los profesores invitados arrancan sin ningún módulo asignado.
        </p>
      </div>

      {/* ── Invitar ─────────────────────────────────────────── */}
      <Modal
        open={inviteOpen}
        onClose={closeInvite}
        title={createdInfo ? 'Profesor creado' : 'Invitar profesor'}
        footer={
          createdInfo ? (
            <Button onClick={closeInvite}>Cerrar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={closeInvite}>Cancelar</Button>
              <Button loading={createMut.isPending} onClick={handleInvite}>Crear cuenta</Button>
            </>
          )
        }
      >
        {createdInfo ? (
          <div className="space-y-3">
            <p className="text-[13px] text-tinta">
              Cuenta creada para <strong>{createdInfo.user.name}</strong>.
            </p>
            {createdInfo.tempPassword && (
              <div className="bg-papel border border-linea p-3 font-mono text-[12px]">
                Contraseña temporal: <strong>{createdInfo.tempPassword}</strong>
              </div>
            )}
            <p className="font-mono text-[11px] text-marron-soft">
              Aún no tiene módulos asignados. Pulsa "Módulos" en la fila para asignárselos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <Input label="NOMBRE COMPLETO" value={form.name} onChange={set('name')} placeholder="Ana García" required />
            <Input label="EMAIL" type="email" value={form.email} onChange={set('email')} placeholder="ana@colegio.es" required />
            <Select label="ROL" value={form.role} onChange={set('role')}>
              <option value="profesor">Profesor</option>
              <option value="admin_centro">Administrador</option>
            </Select>
            {createMut.isError && (
              <div className="bg-[rgba(107,31,42,0.08)] border border-granate p-2 font-mono text-[11px] text-granate">
                {createMut.error?.response?.data?.error || 'Error al crear el profesor.'}
              </div>
            )}
            <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
              <p className="font-mono text-[11px] text-[#7A5A1E]">
                Se generará una contraseña temporal. El profesor podrá cambiarla en su primer acceso.
              </p>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Editar profesor ─────────────────────────────────── */}
      {editTarget && (
        <EditUserModal
          target={editTarget}
          onChange={setEditTarget}
          onClose={() => { setEditTarget(null); editMut.reset(); }}
          onSave={() => editMut.mutate({
            userId: editTarget.id,
            payload: { name: editTarget.name, role: editTarget.role },
          })}
          saving={editMut.isPending}
          error={editMut.error?.response?.data?.error}
        />
      )}

      {/* ── Eliminar profesor ───────────────────────────────── */}
      {deleteTarget && (
        <Modal
          open
          onClose={() => { setDeleteTarget(null); deleteMut.reset(); }}
          title="Eliminar profesor"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); deleteMut.reset(); }}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTarget.id)}
              >
                Eliminar definitivamente
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-[13px] text-tinta">
              Vas a eliminar a <strong>{deleteTarget.name}</strong> ({deleteTarget.email}).
            </p>
            <p className="font-mono text-[11px] text-marron-soft">
              Solo es posible si el profesor no tiene actividad registrada. Si ha generado
              recursos, exámenes u OCR, deberás usar "Desactivar" para conservar el
              historial conforme a RGPD.
            </p>
            {deleteMut.isError && (
              <div className="bg-[rgba(107,31,42,0.08)] border border-granate p-2 font-mono text-[11px] text-granate">
                {deleteMut.error?.response?.data?.error || 'Error al eliminar.'}
                {deleteMut.error?.response?.data?.code === 'HAS_ACTIVITY' && (() => {
                  const c = deleteMut.error.response.data.counts || {};
                  const parts = [];
                  if (c.usage_count)    parts.push(`${c.usage_count} usos`);
                  if (c.exams_count)    parts.push(`${c.exams_count} exámenes`);
                  if (c.attempts_count) parts.push(`${c.attempts_count} correcciones`);
                  if (c.library_count)  parts.push(`${c.library_count} recursos`);
                  return parts.length ? <div className="mt-1 text-marron-soft">{parts.join(' · ')}</div> : null;
                })()}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Asignación de módulos ───────────────────────────── */}
      {modulesTarget && (
        <UserModulesModal
          target={modulesTarget}
          orgId={orgId}
          onClose={() => setModulesTarget(null)}
        />
      )}
    </div>
  );
}

function EditUserModal({ target, onChange, onClose, onSave, saving, error }) {
  const update = (k) => (e) => onChange({ ...target, [k]: e.target.value });
  return (
    <Modal
      open
      onClose={onClose}
      title="Editar profesor"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            loading={saving}
            disabled={!target.name?.trim()}
            onClick={onSave}
          >
            Guardar cambios
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
        className="space-y-4"
      >
        <Input
          label="NOMBRE COMPLETO"
          value={target.name}
          onChange={update('name')}
          required
        />
        <Select label="ROL" value={target.role} onChange={update('role')}>
          <option value="profesor">Profesor</option>
          <option value="admin_centro">Administrador</option>
        </Select>
        {error && (
          <div className="bg-[rgba(107,31,42,0.08)] border border-granate p-2 font-mono text-[11px] text-granate">
            {error}
          </div>
        )}
        <p className="font-mono text-[11px] text-marron-soft">
          El email es identificador de login y no se puede cambiar desde esta pantalla.
        </p>
      </form>
    </Modal>
  );
}

function UserModulesModal({ target, orgId, onClose }) {
  const qc = useQueryClient();

  const { data: orgData, isLoading: loadingOrg } = useQuery({
    queryKey: ['modules', 'org', orgId],
    queryFn: () => modulesApi.listOrgModules(orgId).then((r) => r.data),
    enabled: !!orgId,
  });
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['modules', 'user', target.id],
    queryFn: () => modulesApi.listUserModules(target.id).then((r) => r.data),
  });

  const assignedSet = useMemo(
    () => new Set((userData?.modules || []).map((m) => m.id)),
    [userData]
  );

  const assignMut = useMutation({
    mutationFn: (moduleId) => modulesApi.assignUserModule(target.id, moduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules', 'user', target.id] }),
  });
  const unassignMut = useMutation({
    mutationFn: (moduleId) => modulesApi.unassignUserModule(target.id, moduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modules', 'user', target.id] }),
  });

  const handleToggle = (moduleId, on) => {
    if (assignMut.isPending || unassignMut.isPending) return;
    (on ? unassignMut : assignMut).mutate(moduleId);
  };

  const stages = useMemo(() => {
    const modules = orgData?.modules || [];
    const byStage = {};
    modules.forEach((m) => {
      if (!byStage[m.stage]) byStage[m.stage] = [];
      byStage[m.stage].push(m);
    });
    return STAGE_ORDER
      .filter((s) => byStage[s]?.length)
      .map((s) => ({
        key: s,
        label: STAGE_LABELS[s] || s,
        modules: byStage[s].sort((a, b) => a.sort_order - b.sort_order),
      }));
  }, [orgData]);

  const loading = loadingOrg || loadingUser;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Módulos de ${target.name}`}
      footer={<Button onClick={onClose}>Cerrar</Button>}
    >
      {loading ? (
        <div className="font-mono text-[12px] text-marron-soft py-4">Cargando…</div>
      ) : stages.length === 0 ? (
        <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
          <p className="font-mono text-[11px] text-[#7A5A1E]">
            El centro aún no tiene módulos contratados. Los módulos los activa el superadmin
            de VeriGood — contacta con el equipo para contratar los que necesites antes de
            asignárselos a tus profesores.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {stages.map((s) => (
            <section key={s.key}>
              <SectionLabel>{s.label}</SectionLabel>
              <div className="space-y-2">
                {s.modules.map((m) => {
                  const on = assignedSet.has(m.id);
                  const pending =
                    (assignMut.isPending && assignMut.variables === m.id) ||
                    (unassignMut.isPending && unassignMut.variables === m.id);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between border px-3 py-2 ${
                        on ? 'border-linea bg-card-bg' : 'border-[rgba(184,169,136,0.4)] opacity-80'
                      }`}
                    >
                      <div>
                        <div className="text-[13px] text-tinta font-medium">{m.name}</div>
                        <div className="font-mono text-[10px] text-marron-soft">{m.route_prefix}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {pending && <span className="font-mono text-[10px] text-marron-soft">…</span>}
                        <Toggle on={on} onChange={() => handleToggle(m.id, on)} disabled={pending} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
