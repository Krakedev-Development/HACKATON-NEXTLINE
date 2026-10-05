'use client';

import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/shared/ui/spinner';
import { useRouter } from 'next/navigation';
import {
  isLoggedIn,
  getMe,
  getContactsList,
  getContactIds,
  exportContacts,
  getOrgUsers,
  getAgentContactMap,
  getTags,
  getCrmStatus,
  sendReportToCrm,
  type Tag,
  type ContactItem,
  type MeResponse,
} from '@/lib/api';
import { formatPhoneDisplay } from '@/lib/format';

const PAGE_SIZE = 50;

// ── Icons ──────────────────────────────────────────────

function SearchIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function DownloadIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CheckIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '10px', height: '10px', ...style }} viewBox="0 0 10 10" fill="none">
      <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Column preview icons (SVG, red-themed)
function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function FormIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.06z" />
    </svg>
  );
}
function AgentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

type ColumnKey = 'date' | 'form' | 'email' | 'name' | 'phone' | 'agent' | 'platform' | 'tag' | 'tagId' | 'contactId' | 'crmLeadId' | 'agentId';

const COLUMNS: Array<{ key: ColumnKey; label: string; desc: string; icon: React.ReactElement }> = [
  { key: 'date', label: 'Fecha', desc: 'Fecha de registro', icon: <CalendarIcon /> },
  { key: 'form', label: 'Formulario', desc: 'WSP KRAKE DEV', icon: <FormIcon /> },
  { key: 'email', label: 'Correo', desc: 'Email del contacto', icon: <MailIcon /> },
  { key: 'name', label: 'Nombre', desc: 'Nombre registrado', icon: <UserIcon /> },
  { key: 'phone', label: 'Teléfono', desc: 'Número WhatsApp', icon: <PhoneIcon /> },
  { key: 'agent', label: 'Agente', desc: 'Agente asignado', icon: <AgentIcon /> },
  { key: 'platform', label: 'Plataforma', desc: 'Origen Nextline', icon: <FormIcon /> },
  { key: 'tag', label: 'Etiqueta', desc: 'Etiqueta actual', icon: <InfoIcon /> },
  { key: 'tagId', label: 'ID etiqueta', desc: 'Identificador de etiqueta', icon: <InfoIcon /> },
  { key: 'contactId', label: 'ID contacto Nextline', desc: 'Identificador del contacto', icon: <UserIcon /> },
  { key: 'crmLeadId', label: 'ID lead CRM', desc: 'Lead vinculado al CRM', icon: <UserIcon /> },
  { key: 'agentId', label: 'ID agente Nextline', desc: 'Identificador del agente', icon: <AgentIcon /> },
];

const COLUMN_EXPORT_MAP: Record<ColumnKey, { header: string; width: number; value: (r: { form_name: string; email: string; name: string; phone: string; agent: string; createdAt: number; contactId: string; crmLeadId: string; tagId: string; tagName: string; agentId: string }) => string }> = {
  date: { header: 'Fecha de Registro', width: 24, value: (r) => new Date(r.createdAt).toISOString() },
  form: { header: 'Formulario', width: 20, value: (r) => r.form_name },
  email: { header: 'Correo Electrónico', width: 30, value: (r) => r.email },
  name: { header: 'Nombre', width: 25, value: (r) => r.name },
  phone: { header: 'Número de Teléfono', width: 20, value: (r) => r.phone },
  agent: { header: 'Agente', width: 25, value: (r) => r.agent },
  platform: { header: 'Plataforma', width: 16, value: () => 'Nextline' },
  tag: { header: 'Etiqueta', width: 25, value: (r) => r.tagName },
  tagId: { header: 'ID etiqueta Nextline', width: 28, value: (r) => r.tagId },
  contactId: { header: 'ID contacto Nextline', width: 28, value: (r) => r.contactId },
  crmLeadId: { header: 'ID lead CRM', width: 28, value: (r) => r.crmLeadId },
  agentId: { header: 'ID agente Nextline', width: 28, value: (r) => r.agentId },
};

// ── Main Page ──────────────────────────────────────────

export default function InformesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState('');
  const [crmConnected, setCrmConnected] = useState(false);
  const [sendingToCrm, setSendingToCrm] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendError, setSendError] = useState('');
  const [sendResult, setSendResult] = useState<{ created: number; updated: number; duplicates: number; rejected: number } | null>(null);

  const [agents, setAgents] = useState<Array<{ id: string; email: string; displayName: string | null }>>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [agentContactMap, setAgentContactMap] = useState<Record<string, string[]>>({});
  const [agentSearch, setAgentSearch] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState('');
  const [interestStatus, setInterestStatus] = useState('');

  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(
    new Set<ColumnKey>(['date', 'form', 'email', 'name', 'phone', 'agent', 'platform', 'tag', 'tagId', 'contactId', 'crmLeadId', 'agentId'])
  );

  const filteredAgents = agents.filter(a =>
    !agentSearch.trim() ||
    (a.displayName?.toLowerCase().includes(agentSearch.toLowerCase()) ?? false) ||
    a.email.toLowerCase().includes(agentSearch.toLowerCase())
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedQuery, dateFrom, dateTo, selectedTagId, interestStatus]);

  useEffect(() => {
    setSendResult(null);
    setSendError('');
  }, [selectedIds]);

  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn()) { router.replace('/login'); return; }
    (async () => {
      try {
        const meData = await getMe();
        setMe(meData);
        setTags(await getTags());

        // Filtro por agente: solo tiene sentido para ORG_ADMIN (un agente ya ve solo lo suyo)
        if (meData.role === 'ORG_ADMIN') {
          const status = await getCrmStatus().catch(() => null);
          setCrmConnected(Boolean(status?.connected));
          const orgUsers = await getOrgUsers();
          const agentUsers = orgUsers.filter(u => u.role === 'AGENT');
          setAgents(agentUsers);
        }
      } catch (err) { }
    })();
  }, [mounted, router]);

  // El mapa agente → contactos depende del filtro de fecha activo: se recarga cada vez que
  // cambian las fechas para que el conteo y la selección por agente respeten el rango elegido.
  useEffect(() => {
    if (agents.length === 0) return;
    (async () => {
      try {
        const agentIds = agents.map(a => a.id);
        const res = await getAgentContactMap(agentIds, dateFrom, dateTo, interestStatus);
        setAgentContactMap(res.byAgent);
      } catch (err) { }
    })();
  }, [agents, dateFrom, dateTo, interestStatus]);

  async function loadFirstPage(q: string, agentIds: string[], from: string, to: string, tagId: string) {
    setLoading(true);
    try {
      const [page, ids] = await Promise.all([
        getContactsList({ q, agentIds, tagIds: tagId ? [tagId] : undefined, dateFrom: from, dateTo: to, interestStatus, limit: PAGE_SIZE }),
        getContactIds({ q, agentIds, tagIds: tagId ? [tagId] : undefined, dateFrom: from, dateTo: to, interestStatus }),
      ]);
      setContacts(page.contacts);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
      setMatchingIds(ids);
    } catch (err) { } finally { setLoading(false); }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getContactsList({ q: debouncedQuery, agentIds: Array.from(selectedAgentIds), tagIds: selectedTagId ? [selectedTagId] : undefined, dateFrom, dateTo, interestStatus, limit: PAGE_SIZE, cursor: nextCursor });
      setContacts(prev => [...prev, ...page.contacts]);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } catch (err) { } finally { setLoadingMore(false); }
  }

  useEffect(() => {
    if (!mounted || !isLoggedIn()) return;
    loadFirstPage(debouncedQuery, Array.from(selectedAgentIds), dateFrom, dateTo, selectedTagId);
  }, [mounted, debouncedQuery, selectedAgentIds, dateFrom, dateTo, selectedTagId, interestStatus]);

  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMore();
    }
  }

  const allSelected = matchingIds.length > 0 && matchingIds.every(id => selectedIds.has(id));

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) {
      matchingIds.forEach(id => next.delete(id));
    } else {
      matchingIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAgent = async (agentId: string) => {
    const nextAgents = new Set(selectedAgentIds);
    const nextContacts = new Set(selectedIds);
    const ids = await getContactIds({
      q: debouncedQuery,
      agentIds: [agentId],
      tagIds: selectedTagId ? [selectedTagId] : undefined,
      dateFrom,
      dateTo,
      interestStatus,
    });

    if (nextAgents.has(agentId)) {
      nextAgents.delete(agentId);
      for (const cid of ids) nextContacts.delete(cid);
    } else {
      nextAgents.add(agentId);
      for (const cid of ids) nextContacts.add(cid);
    }

    setSelectedAgentIds(nextAgents);
    setSelectedIds(nextContacts);
  };

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedIds.size === 0 || selectedColumns.size === 0) return;
    setExporting(true);
    setExportSuccess(false);
    setExportError('');
    try {
      const ids = Array.from(selectedIds);
      const { rows } = await exportContacts(ids);

      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const date = new Date().toISOString().split('T')[0];

      const activeKeys = COLUMNS.filter(c => selectedColumns.has(c.key)).map(c => c.key);
      const headers = activeKeys.map(key => COLUMN_EXPORT_MAP[key].header);
      const widths = activeKeys.map(key => ({ wch: COLUMN_EXPORT_MAP[key].width }));
      const worksheetData = [
        headers,
        ...rows.map(r => activeKeys.map(key => COLUMN_EXPORT_MAP[key].value(r))),
      ];
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      ws['!cols'] = widths;
      XLSX.utils.book_append_sheet(wb, ws, 'Contactos');

      XLSX.writeFile(wb, `informe_contactos_${date}.xlsx`);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportError('Error al exportar. Intenta de nuevo.');
      setTimeout(() => setExportError(''), 4000);
    } finally {
      setExporting(false);
    }
  };

  const handleSendToCrm = async () => {
    if (!selectedIds.size || sendingToCrm) return;
    setSendingToCrm(true);
    setSendError('');
    setSendResult(null);
    setSendProgress(0);
    const ids = Array.from(selectedIds);
    const totals = { created: 0, updated: 0, duplicates: 0, rejected: 0 };
    let processed = 0;
    try {
      for (let start = 0; start < ids.length; start += 30) {
        const result = await sendReportToCrm(ids.slice(start, start + 30));
        totals.created += result.created;
        totals.updated += result.updated;
        totals.duplicates += result.duplicates;
        totals.rejected += result.rejected;
        processed = Math.min(start + 30, ids.length);
        setSendProgress(processed);
      }
      setSendResult(totals);
    } catch (error) {
      setSendResult(processed ? totals : null);
      setSendError(`${processed} de ${ids.length} contactos procesados. ${error instanceof Error ? error.message : 'No se pudo enviar el informe al CRM.'}`);
    } finally {
      setSendingToCrm(false);
    }
  };

  if (!mounted) return null;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#040404', color: '#F2F2F2', overflow: 'hidden' }}>

      {/* ── Left sidebar: contact list ── */}
      <aside style={{
        width: '320px', flexShrink: 0, height: '100vh', display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)', background: '#060606',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>Contactos</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: '#444', fontWeight: 600 }}>
                {loading ? 'Cargando...' : `${total} total · ${selectedIds.size} seleccionados`}
              </p>
            </div>
            <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', color: '#EF4444' }}>
              <UsersIcon />
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <SearchIcon style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.7rem 1rem 0.7rem 2.6rem', color: 'white', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Select all row */}
          {total > 0 && (
            <div
              onClick={toggleAll}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.15s ease', userSelect: 'none' }}
            >
              <div style={{ width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, border: `2px solid ${allSelected ? '#EF4444' : 'rgba(255,255,255,0.15)'}`, background: allSelected ? '#EF4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                {allSelected && <CheckIcon />}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#777', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Seleccionar todos ({total})
              </span>
            </div>
          )}

          {/* Date range filter */}
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Filtrar por fecha de registro
              </p>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  title="Limpiar fechas"
                  style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', flexShrink: 0 }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase' }}>Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.4rem 0.5rem', color: 'white', outline: 'none', fontSize: '0.72rem', boxSizing: 'border-box', colorScheme: 'dark' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase' }}>Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.4rem 0.5rem', color: 'white', outline: 'none', fontSize: '0.72rem', boxSizing: 'border-box', colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          {/* Agent filter (solo ORG_ADMIN) */}
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
            <label htmlFor="report-interest" style={{ display: 'block', fontSize: '0.65rem', color: '#777', marginBottom: 8 }}>Interés en diplomado</label>
            <select id="report-interest" value={interestStatus} onChange={(e) => setInterestStatus(e.target.value)} style={{ width: '100%', background: '#111', color: 'white', padding: '0.5rem', borderRadius: 8 }}>
              <option value="">Todos</option>
              <option value="INTERESTED">Interesados</option>
              <option value="NOT_INTERESTED">No interesados</option>
              <option value="UNANSWERED">Sin respuesta</option>
            </select>
          </div>

          {/* Agent filter (solo ORG_ADMIN) */}
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label htmlFor="report-tag" style={{ display: 'block', fontSize: '0.65rem', color: '#555', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Etiqueta</label>
            <select id="report-tag" value={selectedTagId} onChange={(e) => { setSelectedTagId(e.target.value); setSelectedIds(new Set()); }} style={{ width: '100%', background: '#111', color: '#F2F2F2', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.5rem' }}>
              <option value="">Todas las etiquetas</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name} ({tag.contactCount})</option>)}
            </select>
          </div>

          {/* Agent filter (solo ORG_ADMIN) */}
          {me?.role === 'ORG_ADMIN' && agents.length > 0 && (
            <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Filtrar por agente
              </p>

              {/* Search dentro del filtro */}
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <SearchIcon style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#444', width: '0.75rem', height: '0.75rem' }} />
                <input
                  type="text"
                  placeholder="Buscar agente..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.4rem 0.5rem 0.4rem 1.6rem', color: 'white', outline: 'none', fontSize: '0.72rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Lista de agentes filtrada */}
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {filteredAgents.length === 0 ? (
                  <p style={{ fontSize: '0.7rem', color: '#555', padding: '0.5rem 0', textAlign: 'center' }}>
                    {agentSearch ? 'Sin resultados' : 'Sin agentes'}
                  </p>
                ) : filteredAgents.map(a => {
                  const isAgentSelected = selectedAgentIds.has(a.id);
                  const contactCount = agentContactMap[a.id]?.length || 0;
                  return (
                    <div
                      key={a.id}
                      onClick={() => toggleAgent(a.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.25rem', borderRadius: '6px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: `2px solid ${isAgentSelected ? '#EF4444' : 'rgba(255,255,255,0.15)'}`, background: isAgentSelected ? '#EF4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                        {isAgentSelected && <CheckIcon />}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isAgentSelected ? '#FFF' : '#AAA', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.displayName || a.email}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: '#555' }}>{contactCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Contact list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }} className="custom-scrollbar" onScroll={handleListScroll}>
          {loading ? (
            <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Spinner />
              <span style={{ fontSize: '0.72rem', color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cargando contactos...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#333' }}>
              <p style={{ fontSize: '0.85rem' }}>No se encontraron contactos.</p>
            </div>
          ) : (
            <>
              {contacts.map(c => {
                const sel = selectedIds.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleOne(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 0.9rem', borderRadius: '12px', marginBottom: '0.2rem', cursor: 'pointer', background: sel ? 'rgba(239,68,68,0.06)' : 'transparent', border: `1px solid ${sel ? 'rgba(239,68,68,0.18)' : 'transparent'}`, transition: 'all 0.15s ease', userSelect: 'none' }}
                  >
                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, border: `2px solid ${sel ? '#EF4444' : 'rgba(255,255,255,0.12)'}`, background: sel ? '#EF4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                      {sel && <CheckIcon />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: sel ? 'white' : '#D0D0D0', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name || formatPhoneDisplay(c.phone)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#555' }}>{formatPhoneDisplay(c.phone)}</span>
                    </div>
                    {c.email && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', flexShrink: 0, opacity: 0.6 }} title="Tiene email" />
                    )}
                  </div>
                );
              })}
              {loadingMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                  <Spinner size={18} />
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── Main panel ── */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '2.5rem' }} className="custom-scrollbar">

        {/* Header */}
        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>Informes</h1>
              <p style={{ margin: '0.25rem 0 0', color: '#555', fontSize: '0.88rem' }}>
                Selecciona contactos para enviarlos al CRM o descargar un reporte en Excel.
              </p>
            </div>
          </div>
        </header>

        {me?.role === 'ORG_ADMIN' && (
          <div style={{ background: '#080808', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 24, padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: 'white', fontSize: '1.1rem', margin: '0 0 0.35rem' }}>Enviar a CRM</h2>
                <p style={{ color: '#888', fontSize: '0.82rem', margin: 0 }}>
                  {crmConnected
                    ? `${selectedIds.size} contactos seleccionados. Se enviarán sus etiquetas, agentes y fechas de registro.`
                    : 'Vincula el CRM desde Integraciones para habilitar el envío.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendToCrm}
                disabled={!crmConnected || !selectedIds.size || sendingToCrm}
                style={{ padding: '0.85rem 1.4rem', border: 0, borderRadius: 12, fontWeight: 800, color: 'white', background: '#C52929', opacity: !crmConnected || !selectedIds.size || sendingToCrm ? 0.4 : 1, cursor: !crmConnected || !selectedIds.size || sendingToCrm ? 'not-allowed' : 'pointer' }}
              >
                {sendingToCrm ? `Enviando ${sendProgress}/${selectedIds.size}...` : 'Enviar a CRM'}
              </button>
            </div>
            {sendResult && <p role="status" style={{ color: '#22C55E', marginBottom: 0, fontSize: '0.85rem' }}>
              CRM: {sendResult.created} creados, {sendResult.updated} actualizados, {sendResult.duplicates} duplicados, {sendResult.rejected} rechazados.
            </p>}
            {sendError && <p role="alert" style={{ color: '#EF4444', marginBottom: 0, fontSize: '0.85rem' }}>{sendError}</p>}
          </div>
        )}

        {/* Export card */}
        <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2.5rem', marginBottom: '1.5rem' }}>

          {/* Top row: title + button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: '0 0 0.4rem' }}>Exportar a Excel</h2>
              <p style={{ margin: 0, color: '#555', fontSize: '0.85rem' }}>
                {selectedIds.size === 0
                  ? 'Selecciona al menos un contacto de la lista para continuar.'
                  : selectedColumns.size === 0
                    ? 'Selecciona al menos una columna para exportar.'
                    : `${selectedIds.size} contacto${selectedIds.size > 1 ? 's' : ''} listo${selectedIds.size > 1 ? 's' : ''} para exportar.`}
              </p>
              <p style={{ margin: '0.5rem 0 0', color: '#777', fontSize: '0.75rem' }}>
                El Excel conserva los campos de Nextline para consultas o importaciones manuales.
              </p>
            </div>

            <button
              id="btn-export-excel"
              onClick={handleExport}
              disabled={selectedIds.size === 0 || selectedColumns.size === 0 || exporting}
              style={{
                padding: '0.9rem 2rem',
                background: exporting
                  ? 'rgba(255,255,255,0.05)'
                  : exportSuccess
                    ? 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)'
                    : selectedIds.size > 0 && selectedColumns.size > 0
                      ? 'linear-gradient(135deg, #EF4444 0%, #991B1B 100%)'
                      : 'rgba(255,255,255,0.04)',
                border: 'none',
                borderRadius: '14px',
                color: (selectedIds.size > 0 && selectedColumns.size > 0) || exporting ? 'white' : '#2A2A2A',
                fontWeight: 800,
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: selectedIds.size === 0 || selectedColumns.size === 0 || exporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                transition: 'all 0.3s ease',
                boxShadow: selectedIds.size > 0 && selectedColumns.size > 0 && !exporting && !exportSuccess ? '0 8px 20px rgba(239,68,68,0.25)' : 'none',
                opacity: (selectedIds.size === 0 || selectedColumns.size === 0) && !exporting ? 0.35 : 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {exporting ? (
                <><Spinner /> Exportando...</>
              ) : exportSuccess ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> ¡Descargado!</>
              ) : (
                <><DownloadIcon /> Exportar Excel</>
              )}
            </button>
          </div>

          {/* Error banner */}
          {exportError && (
            <div style={{ marginBottom: '1.5rem', padding: '0.9rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span style={{ fontSize: '0.85rem', color: '#EF4444', fontWeight: 600 }}>{exportError}</span>
            </div>
          )}

          {/* Column preview */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2A2A2A', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '0.4rem' }}>
              Columnas del archivo generado
            </p>
            <p style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
              Hacé clic en cada columna para incluirla o excluirla del reporte.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {COLUMNS.map(col => {
                const isColSelected = selectedColumns.has(col.key);
                return (
                  <div
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    style={{
                      background: isColSelected ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isColSelected ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '14px', padding: '1.1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
                      cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ color: isColSelected ? '#EF4444' : '#444' }}>{col.icon}</div>
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: `2px solid ${isColSelected ? '#EF4444' : 'rgba(255,255,255,0.15)'}`, background: isColSelected ? '#EF4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                        {isColSelected && <CheckIcon />}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isColSelected ? '#EF4444' : '#666' }}>{col.label}</span>
                    <span style={{ fontSize: '0.7rem', color: '#333' }}>{col.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role note */}
          <div style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.08)', borderRadius: '14px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ flexShrink: 0, marginTop: '0.1rem' }}><InfoIcon /></div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#555', lineHeight: '1.55' }}>
              {me?.role === 'AGENT'
                ? 'Como agente, solo puedes exportar los contactos que tienes asignados. El agente registrado en el Excel será tu nombre.'
                : 'Como administrador, puedes exportar cualquier contacto. Cada fila incluirá el agente al que ese contacto está vinculado.'}
            </p>
          </div>
        </div>

        {/* Selected summary card */}
        {selectedIds.size > 0 && (
          <div style={{ background: '#080808', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '18px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UsersIcon />
              </div>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', display: 'block' }}>
                  {selectedIds.size} contacto{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#555' }}>Listos para exportar al Excel</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ padding: '0.45rem 0.9rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#555', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CloseIcon /> Limpiar
            </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #EF4444; }
      `}</style>
    </div>
  );
}
