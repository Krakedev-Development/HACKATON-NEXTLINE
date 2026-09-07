'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/shared/ui/spinner';
import { useRouter } from 'next/navigation';
import {
  isLoggedIn,
  getMe,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  type Tag,
} from '@/lib/api';

export default function TagsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadTags = async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar etiquetas');
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    (async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await getMe();
        setMyRole(profile.role);
        await loadTags();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    })();
  }, [mounted, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createTag({ name: name.trim() });
      setName('');
      setSuccess('Etiqueta creada correctamente.');
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear etiqueta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setSavingEdit(true);
    setError('');
    setSuccess('');
    try {
      await updateTag(id, { name: editingName.trim() });
      setSuccess('Etiqueta renombrada correctamente.');
      setEditingId(null);
      setEditingName('');
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al renombrar etiqueta');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta etiqueta? Los contactos que la tengan quedarán sin etiqueta.')) return;
    setError('');
    setSuccess('');
    try {
      await deleteTag(id);
      setSuccess('Etiqueta eliminada correctamente.');
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar etiqueta');
    }
  };

  if (!mounted || !isLoggedIn()) return null;

  return (
    <div className="page-container" style={{ width: '100%', padding: '2rem 3rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#F2F2F2', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          Etiquetas
        </h1>
        <p style={{ color: '#8C8C8C', fontSize: '0.9rem' }}>
          Administra el catálogo de etiquetas usado en Contactos, Chat y Masivos.
        </p>
      </header>

      {error && <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, color: '#EF4444', marginBottom: '1.5rem', fontSize: '0.85rem' }}>{error}</div>}
      {success && <div style={{ padding: '1rem', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 12, color: '#4ADE80', marginBottom: '1.5rem', fontSize: '0.85rem' }}>{success}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8rem 0', gap: '1.5rem' }}>
          <div className="pulse-heartbeat">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="#EF4444">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#222', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Sincronizando Etiquetas</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* Formulario de Creación (Solo ORG_ADMIN) */}
          {myRole === 'ORG_ADMIN' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(64,64,64,0.3)', borderRadius: 16, padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F2F2F2', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Crear Nueva Etiqueta
              </h3>
              <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 220 }}>
                  <label htmlFor="tag-name" style={{ fontSize: '0.8rem', color: '#8C8C8C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nombre de la Etiqueta
                  </label>
                  <input
                    id="tag-name"
                    type="text"
                    required
                    placeholder="Ej: Cliente VIP"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(64,64,64,0.3)',
                      borderRadius: 10,
                      padding: '0.85rem 1rem',
                      color: '#F2F2F2',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.85rem 2rem',
                    background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                    border: 'none',
                    borderRadius: 12,
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {submitting ? <><Spinner size={14} /> Creando...</> : 'Crear Etiqueta'}
                </button>
              </form>
            </div>
          )}

          {/* Catálogo de Etiquetas */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(64,64,64,0.3)', borderRadius: 16, padding: '1.5rem', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F2F2F2', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Catálogo de Etiquetas
            </h3>

            {tags.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                No hay etiquetas creadas para esta organización.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1rem', color: '#8C8C8C', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                      <th style={{ padding: '1rem', color: '#8C8C8C', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contactos</th>
                      <th style={{ padding: '1rem', color: '#8C8C8C', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha de Creación</th>
                      {myRole === 'ORG_ADMIN' && <th style={{ padding: '1rem', color: '#8C8C8C', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((t) => {
                      const isEditing = editingId === t.id;
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 700, color: '#F2F2F2' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                autoFocus
                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#F2F2F2', fontSize: '0.9rem', outline: 'none' }}
                              />
                            ) : (
                              t.name
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#8C8C8C' }}>
                            {t.contactCount}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#666' }}>
                            {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          {myRole === 'ORG_ADMIN' && (
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.75rem' }}>
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveEdit(t.id)}
                                      disabled={savingEdit}
                                      style={{
                                        padding: '0.4rem 1rem',
                                        background: 'rgba(74, 222, 128, 0.1)',
                                        border: '1px solid #4ADE80',
                                        borderRadius: '8px',
                                        color: '#4ADE80',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: savingEdit ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                      }}
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      style={{
                                        padding: '0.4rem 1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#8C8C8C',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                      }}
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(t)}
                                      style={{
                                        padding: '0.4rem 1rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#F2F2F2',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                      }}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDelete(t.id)}
                                      style={{
                                        padding: '0.4rem 1rem',
                                        background: 'rgba(239, 68, 68, 0.05)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        color: '#EF4444',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#FFF'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.color = '#EF4444'; }}
                                    >
                                      Eliminar
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
