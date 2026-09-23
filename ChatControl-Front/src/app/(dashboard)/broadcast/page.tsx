'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  isLoggedIn,
  getMe,
  getBroadcastContacts,
  getBroadcastContactIds,
  getBroadcastTemplates,
  generateBroadcastMessage,
  getCrmBroadcastLists,
  previewBroadcastLists,
  getTags,
  importExcelContacts,
  uploadBroadcastTemplateMedia,
  getBroadcastTemplateMedia,
  getSettings,
  getBroadcastRuns,
  getBroadcastRunContacts,
  assignTagToBroadcastRun,
  createTag,
  type BroadcastListPreview,
  type BroadcastContact,
  type BroadcastTemplate,
  type BroadcastMessageType,
  type BroadcastListItem,
  type ImportExcelContactsResult,
  type SettingsData,
  type BroadcastRun,
  type BroadcastRunContact,
  type MeResponse,
  type Tag,
  type AssignRunTagResult,
} from '@/lib/api';
import { formatPhoneDisplay, humanizeTemplateName } from '@/lib/format';
import { Spinner } from '@/shared/ui/spinner';
import { FileDropzone } from '@/shared/ui/molecules/file-dropzone';
import { TagPicker } from '@/shared/ui/molecules/tag-picker';
import { useBroadcastProgress } from '@/widgets/broadcast-progress/BroadcastProgressProvider';

const PAGE_SIZE = 50;
const TEMPLATE_PAGE_SIZE = 3;
const TAG_PAGE_SIZE = 20;

// --- Icons ---
function PersonIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.2rem', height: '1.2rem', ...style }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function SearchIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function AudiencePreviewPanel({ preview }: { preview: BroadcastListPreview }) {
  return (
    <div style={{
      marginTop: 10,
      padding: '0.75rem',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      fontSize: '0.7rem',
      color: '#8C8C8C',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 6,
    }}>
      <span>Total: <strong style={{ color: '#F2F2F2' }}>{preview.total}</strong></span>
      <span>Únicos: <strong style={{ color: '#22c55e' }}>{preview.unique}</strong></span>
      <span>Duplicados: <strong style={{ color: '#f59e0b' }}>{preview.duplicates}</strong></span>
      <span>Inválidos: <strong style={{ color: '#ef4444' }}>{preview.invalid}</strong></span>
      <span style={{ gridColumn: '1 / -1' }}>Bloqueados: <strong style={{ color: '#ef4444' }}>{preview.blocked}</strong></span>
    </div>
  );
}

function ChevronDownIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.2rem', height: '1.2rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SparklesIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function AuditIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.2rem', height: '1.2rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

function BackIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.2rem', height: '1.2rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
    </svg>
  );
}

const RUN_TYPE_LABELS: Record<string, string> = {
  manual: 'Texto Libre',
  template: 'Plantilla',
  ia: 'Asistente IA',
};

const RUN_REASON_FILTERS: Array<{ status?: 'sent' | 'failed'; category?: string; label: string }> = [
  { status: undefined, category: undefined, label: 'Todos' },
  { status: 'sent', category: undefined, label: 'Enviados' },
  { status: 'failed', category: 'SPAM_BLOCKED', label: 'Spam' },
  { status: 'failed', category: 'META_EXPERIMENT', label: 'Experimento' },
  { status: 'failed', category: 'NO_WHATSAPP', label: 'Sin WhatsApp' },
  { status: 'failed', category: 'OUT_OF_WINDOW', label: 'Fuera de ventana' },
  { status: 'failed', category: 'SANDBOX_BLOCKED', label: 'Sandbox' },
  { status: 'failed', category: 'OTHER', label: 'Otro' },
];

function formatRunDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function renderTemplatePreviewNodes(
  body: string,
  vars: Record<string, string>,
  modes: Record<string, 'fixed' | 'contact_name'>,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{body.slice(lastIndex, match.index)}</span>);
    }
    const varName = match[1];
    const isAutoName = modes[varName] === 'contact_name';
    const value = vars[varName];
    nodes.push(
      <span
        key={key++}
        style={{
          background: isAutoName ? 'rgba(59,130,246,0.15)' : value ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          color: isAutoName ? '#3B82F6' : value ? '#22C55E' : '#EF4444',
          borderRadius: '4px',
          padding: '0 4px',
          fontWeight: 700,
        }}
      >
        {isAutoName ? 'Nombre del contacto' : value || `{{${varName}}}`}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < body.length) {
    nodes.push(<span key={key++}>{body.slice(lastIndex)}</span>);
  }
  return nodes;
}

export default function BroadcastPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [contacts, setContacts] = useState<BroadcastContact[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [templates, setTemplates] = useState<BroadcastTemplate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messageType, setMessageType] = useState<BroadcastMessageType>('manual');
  const [broadcastLists, setBroadcastLists] = useState<BroadcastListItem[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [listPreview, setListPreview] = useState<BroadcastListPreview | null>(null);
  const [contactSource, setContactSource] = useState<'manual' | 'crm_lists' | 'tags' | 'excel_import'>('manual');
  const [loadingList, setLoadingList] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagVisibleCount, setTagVisibleCount] = useState(TAG_PAGE_SIZE);
  const [excelPreviewRows, setExcelPreviewRows] = useState<Array<{ name: string; phone: string; tag: string }>>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelImporting, setExcelImporting] = useState(false);
  const [excelImportResult, setExcelImportResult] = useState<ImportExcelContactsResult | null>(null);
  const [excelError, setExcelError] = useState('');
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [dailyUsage, setDailyUsage] = useState<SettingsData | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [templateDropdownPos, setTemplateDropdownPos] = useState<{
    top: number | null; bottom: number | null; left: number; width: number; maxHeight: number;
  } | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateVisibleCount, setTemplateVisibleCount] = useState(TEMPLATE_PAGE_SIZE);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [templateVarModes, setTemplateVarModes] = useState<Record<string, 'fixed' | 'contact_name'>>({});
  const [templateHeaderValue, setTemplateHeaderValue] = useState('');
  const [templateHeaderFileName, setTemplateHeaderFileName] = useState('');
  const [templateHeaderPreviewUrl, setTemplateHeaderPreviewUrl] = useState('');
  const [templateHeaderUploading, setTemplateHeaderUploading] = useState(false);
  const [templateHeaderUploadError, setTemplateHeaderUploadError] = useState('');
  const [usingSavedHeader, setUsingSavedHeader] = useState(false);
  const [loadingSavedHeader, setLoadingSavedHeader] = useState(false);
  // Nombre del archivo actualmente confirmado en el servidor (el que templateHeaderValue apunta).
  // Si una subida nueva falla, se usa para revertir el preview: templateHeaderValue nunca se
  // toca en el catch, así que el envío real sigue usando este archivo aunque el preview mostrara
  // por un instante el archivo nuevo que en realidad no se guardó.
  const [savedHeaderFileName, setSavedHeaderFileName] = useState('');
  const [templateButtonVars, setTemplateButtonVars] = useState<Record<string, string>>({});
  const [instruction, setInstruction] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { sending, startBroadcastSend } = useBroadcastProgress();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadCrmLists = useCallback(async () => {
    try {
      const bl = await getCrmBroadcastLists();
      setBroadcastLists(bl);
    } catch {
      setBroadcastLists([]);
    }
  }, []);

  const loadTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const t = await getTags();
      setTags(t);
    } catch {
      setTags([]);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  // Refresca "Capacidad de hoy" y se auto-reprograma para el momento exacto en que el
  // próximo mensaje cumple 24h (nextFreeAt), en vez de hacer polling a ciegas cada N minutos.
  const dailyUsageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshDailyUsage = useCallback(async () => {
    if (dailyUsageTimeoutRef.current) {
      clearTimeout(dailyUsageTimeoutRef.current);
      dailyUsageTimeoutRef.current = null;
    }
    try {
      const data = await getSettings();
      setDailyUsage(data);
      if (data.nextFreeAt) {
        const delay = new Date(data.nextFreeAt).getTime() - Date.now() + 3000; // +3s de margen
        if (delay > 0) {
          dailyUsageTimeoutRef.current = setTimeout(() => { refreshDailyUsage(); }, delay);
        }
      }
    } catch {
      // Silencioso: el badge simplemente no se actualiza hasta el próximo intento.
    }
  }, []);

  useEffect(() => {
    return () => { if (dailyUsageTimeoutRef.current) clearTimeout(dailyUsageTimeoutRef.current); };
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn()) { router.replace('/login'); return; }
    const initialSource = searchParams?.get('source');
    const initialLists = searchParams?.get('lists');
    (async () => {
      setLoading(true);
      try {
        const [tl, meData] = await Promise.all([getBroadcastTemplates(), getMe()]);
        setTemplates(tl);
        setMe(meData);
        if (initialSource === 'crm' && meData.hasCrm) {
          setContactSource('crm_lists');
          if (initialLists) {
            setSelectedListIds(new Set(initialLists.split(',').filter(Boolean)));
          }
        }
        await Promise.all([loadCrmLists(), loadTags()]);
        refreshDailyUsage();
      } catch (err) {} finally { setLoading(false); }
    })();
  }, [mounted, router, searchParams, loadCrmLists, loadTags, refreshDailyUsage]);

  const onlyCanSend = messageType !== 'template';

  async function loadFirstPage(q: string, tagIds?: string[], autoSelectAll?: boolean) {
    setLoading(true);
    try {
      const [page, ids] = await Promise.all([
        getBroadcastContacts({ q, tagIds, limit: PAGE_SIZE }),
        getBroadcastContactIds({ q, tagIds, onlyCanSend }),
      ]);
      setContacts(page.contacts);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
      setMatchingIds(ids);
      if (autoSelectAll) setSelectedIds(new Set(ids));
    } catch (err) {} finally { setLoading(false); }
  }

  async function loadMoreContacts() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const tagIds = contactSource === 'tags' ? Array.from(selectedTagIds) : undefined;
      const page = await getBroadcastContacts({ q: debouncedQuery, tagIds, limit: PAGE_SIZE, cursor: nextCursor });
      setContacts(prev => [...prev, ...page.contacts]);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } catch (err) {} finally { setLoadingMore(false); }
  }

  const tagIdsKey = Array.from(selectedTagIds).sort().join(',');

  useEffect(() => {
    if (!mounted || !isLoggedIn()) return;
    if (contactSource === 'manual') {
      loadFirstPage(debouncedQuery);
    } else if (contactSource === 'tags') {
      if (selectedTagIds.size === 0) {
        setContacts([]);
        setTotal(0);
        setMatchingIds([]);
        setNextCursor(null);
        return;
      }
      loadFirstPage(debouncedQuery, Array.from(selectedTagIds), true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, debouncedQuery, contactSource, onlyCanSend, tagIdsKey]);

  function handleContactListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMoreContacts();
    }
  }

  // ── Auditoría de masivos enviados (columnas 2/3 en modo "audit") ──
  const [viewMode, setViewMode] = useState<'compose' | 'audit'>('compose');
  const [auditRuns, setAuditRuns] = useState<BroadcastRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runContacts, setRunContacts] = useState<BroadcastRunContact[]>([]);
  const [runContactsNextCursor, setRunContactsNextCursor] = useState<string | null>(null);
  const [loadingRunContacts, setLoadingRunContacts] = useState(false);
  const [loadingMoreRunContacts, setLoadingMoreRunContacts] = useState(false);
  const [runContactsStatus, setRunContactsStatus] = useState<'sent' | 'failed' | undefined>(undefined);
  const [runContactsCategory, setRunContactsCategory] = useState<string | undefined>(undefined);
  const [exportingRun, setExportingRun] = useState(false);
  const [auditTagPanelOpen, setAuditTagPanelOpen] = useState(false);
  const [auditTagId, setAuditTagId] = useState<string | null>(null);
  const [auditTagOnlySent, setAuditTagOnlySent] = useState(false);
  const [assigningTag, setAssigningTag] = useState(false);
  const [assignTagError, setAssignTagError] = useState('');
  const [assignTagResult, setAssignTagResult] = useState<AssignRunTagResult | null>(null);
  const [newAuditTagName, setNewAuditTagName] = useState('');
  const [creatingAuditTag, setCreatingAuditTag] = useState(false);

  const selectedRun = auditRuns.find(r => r.runId === selectedRunId) || null;

  const resetAuditTagPanel = () => {
    setAuditTagPanelOpen(false);
    setAuditTagId(null);
    setAuditTagOnlySent(false);
    setAssigningTag(false);
    setAssignTagError('');
    setAssignTagResult(null);
    setNewAuditTagName('');
    setCreatingAuditTag(false);
  };

  const openAudit = () => {
    setViewMode('audit');
    setSelectedRunId(null);
    setRunContacts([]);
    resetAuditTagPanel();
    setLoadingRuns(true);
    getBroadcastRuns().then(setAuditRuns).catch(() => setAuditRuns([])).finally(() => setLoadingRuns(false));
    if (tags.length === 0) loadTags();
  };

  const closeAudit = () => {
    setViewMode('compose');
    setSelectedRunId(null);
    resetAuditTagPanel();
  };

  const loadRunContacts = useCallback((runId: string, status?: 'sent' | 'failed', category?: string) => {
    setLoadingRunContacts(true);
    setRunContacts([]);
    setRunContactsNextCursor(null);
    getBroadcastRunContacts(runId, { status, category })
      .then(({ contacts, nextCursor }) => { setRunContacts(contacts); setRunContactsNextCursor(nextCursor); })
      .catch(() => { setRunContacts([]); setRunContactsNextCursor(null); })
      .finally(() => setLoadingRunContacts(false));
  }, []);

  const loadMoreRunContacts = useCallback(() => {
    if (!selectedRunId || !runContactsNextCursor || loadingMoreRunContacts) return;
    setLoadingMoreRunContacts(true);
    getBroadcastRunContacts(selectedRunId, { cursor: runContactsNextCursor, status: runContactsStatus, category: runContactsCategory })
      .then(({ contacts, nextCursor }) => { setRunContacts(prev => [...prev, ...contacts]); setRunContactsNextCursor(nextCursor); })
      .catch(() => {})
      .finally(() => setLoadingMoreRunContacts(false));
  }, [selectedRunId, runContactsNextCursor, loadingMoreRunContacts, runContactsStatus, runContactsCategory]);

  function handleRunContactsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) loadMoreRunContacts();
  }

  const selectRun = (runId: string) => {
    setSelectedRunId(runId);
    setRunContactsStatus(undefined);
    setRunContactsCategory(undefined);
    resetAuditTagPanel();
    loadRunContacts(runId, undefined, undefined);
  };

  const changeRunFilter = (status?: 'sent' | 'failed', category?: string) => {
    setRunContactsStatus(status);
    setRunContactsCategory(category);
    if (selectedRunId) loadRunContacts(selectedRunId, status, category);
  };

  const handleExportRun = async () => {
    if (!selectedRunId || !selectedRun) return;
    setExportingRun(true);
    try {
      const { contacts: allContacts } = await getBroadcastRunContacts(selectedRunId, {
        limit: 5000,
        status: runContactsStatus,
        category: runContactsCategory,
      });
      const XLSX = await import('xlsx');
      const header = ['Fecha y hora', 'Nombre', 'Número', 'Estado'];
      const rows = allContacts.map((c) => [
        formatRunDate(c.createdAt),
        c.name || '(sin nombre)',
        c.phone,
        c.status === 'sent' ? 'Enviado' : (c.failureLabel || 'Fallido'),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      ws['!cols'] = [{ wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 22 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Masivo');
      const safeName = (selectedRun.title || selectedRun.runId.slice(0, 8)).replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
      XLSX.writeFile(wb, `masivo_${safeName}.xlsx`);
    } finally {
      setExportingRun(false);
    }
  };

  const handleCreateAuditTag = async () => {
    const name = newAuditTagName.trim();
    if (!name || creatingAuditTag) return;
    setCreatingAuditTag(true);
    setAssignTagError('');
    try {
      const created = await createTag({ name });
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setAuditTagId(created.id);
      setNewAuditTagName('');
    } catch (err) {
      setAssignTagError(err instanceof Error ? err.message : 'No se pudo crear la etiqueta');
    } finally {
      setCreatingAuditTag(false);
    }
  };

  const handleAssignRunTag = async () => {
    if (!selectedRunId || !auditTagId || assigningTag) return;
    setAssigningTag(true);
    setAssignTagError('');
    setAssignTagResult(null);
    try {
      const result = await assignTagToBroadcastRun(selectedRunId, {
        tagId: auditTagId,
        onlySent: auditTagOnlySent,
      });
      setAssignTagResult(result);
      loadTags();
    } catch (err) {
      setAssignTagError(err instanceof Error ? err.message : 'No se pudo asignar la etiqueta');
    } finally {
      setAssigningTag(false);
    }
  };

  const refreshListPreview = useCallback(async (listIds: string[]) => {
    if (!listIds.length) {
      setListPreview(null);
      setSelectedIds(new Set());
      return;
    }
    setLoadingList(true);
    try {
      const preview = await previewBroadcastLists(listIds);
      setListPreview(preview);
      setSelectedIds(new Set(preview.conversationIds));
    } catch (err) {
      console.error('Error loading list preview', err);
      setListPreview(null);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (contactSource === 'crm_lists' && selectedListIds.size > 0) {
      refreshListPreview(Array.from(selectedListIds));
    }
  }, [contactSource, selectedListIds, refreshListPreview]);

  // Limpiar selección de contactos inactivos si se cambia a un mensaje que no es plantilla
  useEffect(() => {
    if (messageType !== 'template') {
      setSelectedIds(prev => {
        const next = new Set(prev);
        let changed = false;
        contacts.forEach(c => {
          if (!c.canSend && next.has(c.id)) {
            next.delete(c.id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [messageType, contacts]);

  const toggleContact = (id: string) => {
    const contact = contacts.find(c => c.id === id);
    const isBlocked = messageType !== 'template' && contact && !contact.canSend;
    if (isBlocked) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allMatchingSelected = matchingIds.length > 0 && matchingIds.every(id => selectedIds.has(id));

  const toggleAll = () => {
    const allowedContacts = matchingIds;
    const allAllowedSelected = allMatchingSelected;

    if (allAllowedSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allowedContacts.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allowedContacts.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleGenerateMessage = async () => {
    if (!instruction.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await generateBroadcastMessage(instruction.trim());
      setGeneratedText(res.text ?? '');
    } catch (err) {} finally { setGenerating(false); }
  };

  useEffect(() => {
    return () => {
      if (templateHeaderPreviewUrl) URL.revokeObjectURL(templateHeaderPreviewUrl);
    };
  }, [templateHeaderPreviewUrl]);

  // Al elegir una plantilla con header de imagen/video, reusa el último archivo
  // subido para esa misma plantilla en vez de pedirlo de nuevo cada vez.
  useEffect(() => {
    setTemplateHeaderValue('');
    setTemplateHeaderFileName('');
    setTemplateHeaderPreviewUrl('');
    setTemplateHeaderUploadError('');
    setUsingSavedHeader(false);
    setSavedHeaderFileName('');

    const template = templates.find(t => t.id === templateId);
    if (!template?.header || template.header.format === 'TEXT') return;

    setLoadingSavedHeader(true);
    getBroadcastTemplateMedia(template.id)
      .then(({ saved }) => {
        if (!saved) return;
        setTemplateHeaderValue(saved.mediaUrl);
        setTemplateHeaderPreviewUrl(saved.mediaUrl);
        setTemplateHeaderFileName(saved.fileName || 'Archivo guardado');
        setUsingSavedHeader(true);
        setSavedHeaderFileName(saved.fileName || 'Archivo guardado');
      })
      .catch(() => {})
      .finally(() => setLoadingSavedHeader(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const handleHeaderFile = async (file: File) => {
    setTemplateHeaderPreviewUrl(URL.createObjectURL(file));
    setTemplateHeaderFileName(file.name);
    setUsingSavedHeader(false);
    setTemplateHeaderUploading(true);
    setTemplateHeaderUploadError('');
    try {
      const { url } = await uploadBroadcastTemplateMedia(file, selectedTemplate?.id);
      setTemplateHeaderValue(url);
      setSavedHeaderFileName(file.name);
    } catch (err) {
      // La subida falló: templateHeaderValue (lo que realmente se envía) sigue apuntando al
      // archivo guardado anterior, o vacío si nunca hubo uno. Revertimos el preview para que
      // coincida con lo que de verdad se va a enviar, en vez de mostrar el archivo rechazado.
      setTemplateHeaderPreviewUrl(templateHeaderValue);
      setTemplateHeaderFileName(templateHeaderValue ? savedHeaderFileName : '');
      setUsingSavedHeader(!!templateHeaderValue);
      const reason = err instanceof Error ? err.message : 'Error al subir el archivo.';
      setTemplateHeaderUploadError(
        templateHeaderValue
          ? `${reason} Se mantiene el archivo guardado anterior (${savedHeaderFileName}) — el envío usará ese, no el que acabás de elegir.`
          : `${reason} No hay ningún archivo guardado: no vas a poder enviar hasta subir uno válido.`,
      );
    } finally {
      setTemplateHeaderUploading(false);
    }
  };

  const handleSend = async () => {
    if (sending) return;
    if (!broadcastTitle.trim()) {
      setTitleError(true);
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleInputRef.current?.focus();
      return;
    }
    setTitleError(false);
    try {
      const result = await startBroadcastSend({
        conversationIds: Array.from(selectedIds),
        type: messageType,
        title: broadcastTitle.trim() || undefined,
        text: messageType !== 'template' ? (generatedText || text) : undefined,
        templateId: messageType === 'template' ? templateId : undefined,
        templateVariables: messageType === 'template' ? templateVars : undefined,
        templateAutoNameVariables: messageType === 'template'
          ? Object.entries(templateVarModes).filter(([, mode]) => mode === 'contact_name').map(([v]) => v)
          : undefined,
        templateHeaderValue: messageType === 'template' ? templateHeaderValue : undefined,
        templateButtonVariables: messageType === 'template' ? templateButtonVars : undefined,
      });
      if (!(result.sent === 0 && result.failed > 0)) {
        setSelectedIds(new Set());
        setBroadcastTitle('');
        setText(''); setInstruction(''); setGeneratedText('');
        setTemplateVarModes({});
        setTemplateHeaderValue(''); setTemplateHeaderFileName(''); setTemplateHeaderPreviewUrl(''); setTemplateButtonVars({});
      }
    } catch {
      // El error ya queda reflejado en el toast global de BroadcastProgressProvider.
    } finally {
      refreshDailyUsage();
    }
  };

  const toggleListSelection = (listId: string) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleSourceChange = (source: 'manual' | 'crm_lists' | 'tags' | 'excel_import') => {
    setContactSource(source);
    setSelectedListIds(new Set());
    setListPreview(null);
    setSelectedTagIds(new Set());
    setTagSearch('');
    setExcelPreviewRows([]);
    setExcelFileName('');
    setExcelImportResult(null);
    setExcelError('');
    setSelectedIds(new Set());
  };

  const handleDownloadExcelTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['nombre', 'etiqueta', 'numero'],
      ['Juan Pérez', '', '3001234567'],
    ]);
    ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }];

    // Preformatea la columna "numero" como texto (incluso las filas vacías) para que Excel no
    // convierta los números largos a notación científica (5.93968E+11) al escribirlos a mano.
    const PHONE_COL = 2;
    const PRESET_ROWS = 500;
    for (let row = 0; row <= PRESET_ROWS; row++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: PHONE_COL });
      if (ws[addr]) {
        ws[addr].t = 's';
        ws[addr].z = '@';
      } else {
        ws[addr] = { t: 's', v: '', z: '@' };
      }
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: PRESET_ROWS, c: 2 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
    XLSX.writeFile(wb, 'plantilla_contactos_masivos.xlsx');
  };

  const handleExcelFileSelect = async (file: File) => {
    setExcelError('');
    setExcelImportResult(null);
    setSelectedIds(new Set());
    setExcelFileName(file.name);
    setExcelParsing(true);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!rawRows.length) {
        setExcelError('El archivo está vacío.');
        setExcelPreviewRows([]);
        return;
      }

      // Detecta las columnas por el texto del encabezado (nombre/etiqueta/numero), sin importar
      // el orden en el que vengan en el archivo.
      const headerRow = rawRows[0].map(v => String(v ?? '').trim().toLowerCase());
      const findCol = (...keys: string[]) => headerRow.findIndex(h => keys.some(k => h.includes(k)));
      const hasHeader = headerRow.some(h => ['nombre', 'etiqueta', 'numero', 'número', 'telefono', 'teléfono', 'whatsapp'].includes(h));

      let colName = 0, colTag = 1, colPhone = 2;
      let dataRows = rawRows;
      if (hasHeader) {
        colName = findCol('nombre');
        colTag = findCol('etiqueta', 'tag');
        colPhone = findCol('numero', 'número', 'telefono', 'teléfono', 'whatsapp');
        dataRows = rawRows.slice(1);
      }

      const rows = dataRows
        .map(r => ({
          name: colName >= 0 ? String(r[colName] ?? '').trim() : '',
          tag: colTag >= 0 ? String(r[colTag] ?? '').trim() : '',
          phone: colPhone >= 0 ? String(r[colPhone] ?? '').trim() : '',
        }))
        .filter(r => r.phone);

      if (!rows.length) {
        setExcelError('No se encontraron filas con número de teléfono en el archivo.');
        setExcelPreviewRows([]);
      } else {
        setExcelPreviewRows(rows);
      }
    } catch (err) {
      setExcelError('No se pudo leer el archivo. Verifica que sea un .xlsx o .xls válido.');
      setExcelPreviewRows([]);
    } finally {
      setExcelParsing(false);
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!excelPreviewRows.length || excelImporting) return;
    if (dailyRemaining != null && excelPreviewRows.length > dailyRemaining) {
      setExcelError(
        `Tu archivo tiene ${excelPreviewRows.length} contactos pero hoy solo puedes enviar a ${dailyRemaining} más (ya usaste ${dailyUsage?.dailyUsed ?? 0}/${dailyUsage?.dailyLimit ?? 0} del límite de WhatsApp). Reduce el archivo o repártelo en varios días.`,
      );
      return;
    }
    setExcelImporting(true);
    setExcelError('');
    try {
      const result = await importExcelContacts(excelPreviewRows);
      setExcelImportResult(result);
      setSelectedIds(new Set(result.conversationIds));
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'Error al importar el archivo.');
    } finally {
      setExcelImporting(false);
    }
  };

  const dailyRemaining = dailyUsage?.dailyRemaining ?? null; // null = ilimitado
  const excelExceedsCapacity =
    dailyRemaining != null && excelPreviewRows.length > 0 && excelPreviewRows.length > dailyRemaining;
  const capacityBlocked = dailyRemaining === 0;
  const nextFreeAtLabel = dailyUsage?.nextFreeAt
    ? new Date(dailyUsage.nextFreeAt).toLocaleString('es-EC', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    : null;

  // Etiquetas del Excel que no coinciden con ninguna del catálogo (se avisa antes de importar,
  // no bloquea: esas filas simplemente quedan sin etiqueta si se confirma igual).
  const knownTagNames = new Set(tags.map(t => t.name.trim().toUpperCase()));
  const unmatchedExcelTagWarnings: Array<{ name: string; count: number }> = [];
  if (excelPreviewRows.length > 0) {
    const counts = new Map<string, number>();
    for (const r of excelPreviewRows) {
      const tagName = r.tag.trim();
      if (!tagName) continue;
      if (knownTagNames.has(tagName.toUpperCase())) continue;
      counts.set(tagName, (counts.get(tagName) || 0) + 1);
    }
    for (const [name, count] of Array.from(counts.entries())) unmatchedExcelTagWarnings.push({ name, count });
  }

  const forceMetaTemplate = contactSource === 'excel_import' && (excelImportResult?.outOfWindowCount ?? 0) > 0;

  useEffect(() => {
    if (forceMetaTemplate && messageType !== 'template') {
      setMessageType('template');
    }
    if (forceMetaTemplate && templateId && !templateId.startsWith('meta_')) {
      setTemplateId('');
    }
  }, [forceMetaTemplate, messageType, templateId]);

  const selectedTemplate = templates.find(t => t.id === templateId);
  const templateOptions = forceMetaTemplate ? templates.filter(t => t.id.startsWith('meta_')) : templates;
  const filteredTemplateOptions = templateOptions.filter((t) => {
    if (!templateSearch.trim()) return true;
    const q = templateSearch.trim().toLowerCase();
    const { label } = humanizeTemplateName(t.name);
    return label.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
  });
  const visibleTemplateOptions = filteredTemplateOptions.slice(0, templateVisibleCount);

  function handleTemplateListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setTemplateVisibleCount(prev => Math.min(prev + TEMPLATE_PAGE_SIZE, filteredTemplateOptions.length));
    }
  }

  const filteredTags = tags.filter((t) => !tagSearch.trim() || t.name.toLowerCase().includes(tagSearch.trim().toLowerCase()));
  const visibleTags = filteredTags.slice(0, tagVisibleCount);

  function handleTagListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setTagVisibleCount(prev => Math.min(prev + TAG_PAGE_SIZE, filteredTags.length));
    }
  }

  const handleSelectTemplate = (id: string) => {
    setTemplateId(id);
    setTemplateVars({});
    setTemplateVarModes({});
    setTemplateHeaderValue('');
    setTemplateHeaderFileName('');
    setTemplateHeaderPreviewUrl('');
    setTemplateHeaderUploadError('');
    setTemplateButtonVars({});
    setTemplateDropdownOpen(false);
    setTemplateSearch('');
  };

  const toggleTemplateDropdown = () => {
    if (templateDropdownOpen) {
      setTemplateDropdownOpen(false);
      return;
    }
    const rect = templateDropdownRef.current?.getBoundingClientRect();
    if (rect) {
      const margin = 16;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(340, openUpward ? spaceAbove : spaceBelow));
      setTemplateDropdownPos({
        top: openUpward ? null : rect.bottom + 8,
        bottom: openUpward ? window.innerHeight - rect.top + 8 : null,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    }
    setTemplateDropdownOpen(true);
  };

  useEffect(() => {
    setTemplateVisibleCount(TEMPLATE_PAGE_SIZE);
  }, [templateSearch, templateDropdownOpen]);

  useEffect(() => {
    setTagVisibleCount(TAG_PAGE_SIZE);
  }, [tagSearch]);

  useEffect(() => {
    if (!templateDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target as Node)) {
        setTemplateDropdownOpen(false);
        setTemplateSearch('');
      }
    }
    function handleScroll(e: Event) {
      // Ignora el scroll que pasa DENTRO del propio dropdown (la lista con infinite scroll,
      // el buscador); solo cierra si el scroll fue en la página/otro contenedor por fuera.
      if (templateDropdownRef.current && e.target instanceof Node && templateDropdownRef.current.contains(e.target)) {
        return;
      }
      setTemplateDropdownOpen(false);
      setTemplateSearch('');
    }
    function handleResize() {
      setTemplateDropdownOpen(false);
      setTemplateSearch('');
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [templateDropdownOpen]);

  if (!mounted) return null;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#040404', color: '#F2F2F2', overflow: 'hidden' }}>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar: Audiencia / Auditoría ── */}
      {viewMode === 'audit' ? (
        <aside className={`aside-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Auditoría</h2>
              <button
                onClick={closeAudit}
                style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', display: 'flex' }}
                aria-label="Volver"
                title="Volver"
              >
                <BackIcon />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }} className="custom-scrollbar">
            {loadingRuns ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner /></div>
            ) : auditRuns.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#444', fontSize: '0.8rem' }}>Todavía no hay masivos enviados.</div>
            ) : auditRuns.map((run) => {
              const isSelected = run.runId === selectedRunId;
              return (
                <div
                  key={run.runId}
                  onClick={() => selectRun(run.runId)}
                  style={{
                    padding: '1rem', borderRadius: '16px', cursor: 'pointer', marginBottom: '0.25rem',
                    background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid transparent',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F2F2F2' }}>
                    {run.title || RUN_TYPE_LABELS[run.type] || run.type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.2rem' }}>{formatRunDate(run.startedAt)}</div>
                  <div style={{ fontSize: '0.7rem', marginTop: '0.35rem' }}>
                    <span style={{ color: '#4ADE80', fontWeight: 700 }}>{run.sent} enviados</span>
                    {run.failed > 0 && <span style={{ color: '#EF4444', fontWeight: 700, marginLeft: '0.6rem' }}>{run.failed} fallidos</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      ) : (
      <aside className={`aside-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Masivos</h2>
            <button
              onClick={openAudit}
              style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', display: 'flex' }}
              aria-label="Ver auditoría de masivos"
              title="Auditoría"
            >
              <AuditIcon />
            </button>
          </div>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <SearchIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
            <input 
              type="text" 
              placeholder="Buscar contactos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem 1rem 0.75rem 2.8rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {([
              ['manual', 'Contactos Manuales'],
              ...(me?.hasCrm ? [['crm_lists', 'Listas CRM']] as const : []),
              ['tags', 'Etiquetas'],
              ['excel_import', 'Importar Excel'],
            ] as const).map(([source, label]) => (
              <button
                key={source}
                type="button"
                onClick={() => handleSourceChange(source)}
                style={{
                  flex: 1,
                  minWidth: 90,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: contactSource === source ? '#EF4444' : 'rgba(255,255,255,0.03)',
                  color: contactSource === source ? 'white' : '#8C8C8C',
                  fontSize: '0.55rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {contactSource === 'crm_lists' ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
                Selecciona una o varias listas
              </div>
              <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {broadcastLists.map((l) => (
                  <label
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0.5rem 0.75rem',
                      borderRadius: 10,
                      background: selectedListIds.has(l.id) ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedListIds.has(l.id) ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedListIds.has(l.id)}
                      onChange={() => toggleListSelection(l.id)}
                    />
                    <span style={{ flex: 1 }}>{l.name}</span>
                    <span style={{ color: '#666', fontSize: '0.7rem' }}>({l.contactCount})</span>
                  </label>
                ))}
              </div>
              {listPreview && <AudiencePreviewPanel preview={listPreview} />}
            </div>
          ) : contactSource === 'tags' ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
                Selecciona una o varias etiquetas
              </div>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <SearchIcon style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#444', width: '0.75rem', height: '0.75rem' }} />
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Buscar etiqueta..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '0.5rem 0.75rem 0.5rem 2rem', color: 'white', outline: 'none', fontSize: '0.75rem', boxSizing: 'border-box' }}
                />
              </div>
              {loadingTags ? (
                <div style={{ padding: '1rem', textAlign: 'center' }}><Spinner size={20} /></div>
              ) : (
                <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }} onScroll={handleTagListScroll} className="custom-scrollbar">
                  {filteredTags.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#444', fontSize: '0.75rem' }}>Sin etiquetas</div>
                  ) : visibleTags.map((t) => {
                    const isTagSelected = selectedTagIds.has(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTagSelection(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '0.5rem 0.75rem',
                          borderRadius: 10,
                          background: isTagSelected ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isTagSelected ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: `2px solid ${isTagSelected ? '#EF4444' : 'rgba(255,255,255,0.15)'}`, background: isTagSelected ? '#EF4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                          {isTagSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                        <span style={{ flex: 1, color: isTagSelected ? '#FFF' : '#AAA', fontWeight: 700 }}>{t.name}</span>
                        <span style={{ color: '#666', fontSize: '0.7rem' }}>({t.contactCount})</span>
                      </div>
                    );
                  })}
                  {visibleTags.length < filteredTags.length && (
                    <div style={{ padding: '0.4rem', textAlign: 'center', color: '#444', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Desplazate para ver más
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : contactSource === 'excel_import' ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
                Excel con columnas &quot;nombre&quot;, &quot;etiqueta&quot; (opcional) y &quot;numero&quot;
              </div>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                style={{ width: '100%', padding: '0.6rem', marginBottom: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#8C8C8C', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar plantilla
              </button>
              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleExcelFileSelect(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => excelFileInputRef.current?.click()}
                disabled={excelParsing}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px dashed rgba(239,68,68,0.3)', borderRadius: 10, color: '#EF4444', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: excelParsing ? 'default' : 'pointer' }}
              >
                {excelParsing ? <Spinner size={14} /> : (excelFileName || 'Seleccionar archivo .xlsx')}
              </button>

              {excelError && (
                <p style={{ marginTop: 8, fontSize: '0.7rem', color: '#EF4444', fontWeight: 600 }}>{excelError}</p>
              )}

              {excelPreviewRows.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: '#8C8C8C', marginBottom: 6 }}>
                    {excelImportResult ? `${excelPreviewRows.length} contactos importados` : `${excelPreviewRows.length} filas detectadas`}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.6rem', color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0.5rem', marginBottom: 4 }}>
                    <span style={{ flex: 1 }}>Nombre</span>
                    <span style={{ flex: 1 }}>Etiqueta</span>
                    <span>Número</span>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: excelImportResult ? 0 : 10 }} className="custom-scrollbar">
                    {excelPreviewRows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.72rem', color: '#AAA', padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || '(sin nombre)'}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#666' }}>{r.tag || '—'}</span>
                        <span style={{ color: '#666' }}>{r.phone}</span>
                      </div>
                    ))}
                  </div>
                  {!excelImportResult && excelExceedsCapacity && (
                    <p style={{ margin: '0 0 10px', fontSize: '0.7rem', color: '#EF4444', fontWeight: 700 }}>
                      Este archivo tiene {excelPreviewRows.length} contactos pero hoy solo puedes enviarle a {dailyRemaining}. Reduce el archivo o repártelo en varios días para no ser bloqueado por WhatsApp.
                    </p>
                  )}
                  {!excelImportResult && unmatchedExcelTagWarnings.length > 0 && (
                    <div style={{ margin: '0 0 10px', padding: '0.65rem 0.75rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 10, fontSize: '0.7rem', color: '#F59E0B', lineHeight: 1.5 }}>
                      <strong>{unmatchedExcelTagWarnings.length} etiqueta{unmatchedExcelTagWarnings.length > 1 ? 's' : ''} del archivo no {unmatchedExcelTagWarnings.length > 1 ? 'existen' : 'existe'}:</strong>
                      <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1rem', maxHeight: 80, overflowY: 'auto' }}>
                        {unmatchedExcelTagWarnings.map(w => (
                          <li key={w.name}>{w.name} ({w.count})</li>
                        ))}
                      </ul>
                      <p style={{ margin: '0.4rem 0 0', color: '#C89B3C' }}>Si importás igual, esas filas quedan sin etiqueta.</p>
                    </div>
                  )}
                  {!excelImportResult && (
                    <button
                      type="button"
                      onClick={handleConfirmExcelImport}
                      disabled={excelImporting || excelExceedsCapacity}
                      style={{ width: '100%', padding: '0.65rem', background: excelExceedsCapacity ? 'rgba(239,68,68,0.3)' : '#EF4444', border: 'none', borderRadius: 10, color: 'white', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: (excelImporting || excelExceedsCapacity) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {excelImporting && <Spinner size={14} />}
                      {excelImporting ? 'Importando...' : excelExceedsCapacity ? 'Límite diario superado' : unmatchedExcelTagWarnings.length > 0 ? 'Importar de todas formas' : 'Confirmar importación'}
                    </button>
                  )}
                </div>
              )}

              {excelImportResult && (
                <div style={{
                  marginTop: 10,
                  padding: '0.75rem',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '0.7rem',
                  color: '#8C8C8C',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                }}>
                  <span>Creados: <strong style={{ color: '#22c55e' }}>{excelImportResult.created}</strong></span>
                  <span>Actualizados: <strong style={{ color: '#3b82f6' }}>{excelImportResult.updated}</strong></span>
                  <span>Rechazados: <strong style={{ color: '#ef4444' }}>{excelImportResult.rejected}</strong></span>
                  <span>Etiquetas no encontradas: <strong style={{ color: '#f59e0b' }}>{excelImportResult.unmatchedTags}</strong></span>
                  <span>Fuera de ventana: <strong style={{ color: '#f59e0b' }}>{excelImportResult.outOfWindowCount}</strong></span>
                  <span style={{ gridColumn: '1 / -1' }}>Listos: <strong style={{ color: '#F2F2F2' }}>{selectedIds.size}</strong></span>
                  {excelImportResult.outOfWindowCount > 0 && (
                    <span style={{ gridColumn: '1 / -1', color: '#F59E0B', fontWeight: 700 }}>
                      {excelImportResult.outOfWindowCount} contacto{excelImportResult.outOfWindowCount === 1 ? '' : 's'} ({excelImportResult.newContactIds.length} nuevo{excelImportResult.newContactIds.length === 1 ? '' : 's'}) {excelImportResult.outOfWindowCount === 1 ? 'está' : 'están'} fuera de la ventana de 24h: se exige plantilla aprobada de Meta para el envío.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={toggleAll}
                style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#8C8C8C', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '0.75rem' }}
              >
                {allMatchingSelected ? `Desmarcar todos (${total})` : `Seleccionar todos (${total})`}
              </button>
            </>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }} className="custom-scrollbar" onScroll={handleContactListScroll}>
          {loading || loadingList ? (
            <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div className="pulse-heartbeat">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#EF4444">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#222', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                {contactSource === 'crm_lists' ? 'Cargando Listas CRM' : contactSource === 'tags' ? 'Cargando Etiquetas' : 'Cargando Audiencia'}
              </span>
            </div>
          ) : contactSource === 'crm_lists' && selectedListIds.size > 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#22c55e', fontSize: '0.9rem', fontWeight: 700 }}>
              {selectedIds.size} contactos listos desde {selectedListIds.size} lista(s) CRM
            </div>
          ) : contactSource === 'tags' && selectedTagIds.size === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '0.85rem' }}>
              Selecciona una o varias etiquetas para ver sus contactos.
            </div>
          ) : contactSource === 'excel_import' ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: excelImportResult ? '#22c55e' : '#555', fontSize: '0.9rem', fontWeight: 700 }}>
              {excelImportResult ? `${selectedIds.size} contactos listos desde el Excel importado` : 'Selecciona un archivo Excel para comenzar'}
            </div>
          ) : (
            <>
              {contacts.map(c => {
            const isBlocked = messageType !== 'template' && !c.canSend;
            const isSelected = selectedIds.has(c.id);

            return (
              <div
                key={c.id}
                onClick={() => !isBlocked && toggleContact(c.id)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  borderRadius: '16px', 
                  background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                  opacity: isBlocked ? 0.35 : 1,
                  transition: 'all 0.2s ease',
                  marginBottom: '0.25rem',
                  border: isSelected ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid transparent'
                }}
              >
                <div style={{ 
                  width: '18px', height: '18px', borderRadius: '5px', 
                  border: '2px solid',
                  borderColor: isBlocked ? '#222' : isSelected ? '#EF4444' : '#333',
                  background: isBlocked ? 'transparent' : isSelected ? '#EF4444' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                }}>
                  {!isBlocked && isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  <PersonIcon style={{ width: '1rem', height: '1rem' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F2F2F2', display: 'block' }}>{c.name || formatPhoneDisplay(c.phone)}</span>
                  <span style={{ fontSize: '0.7rem', color: c.canSend ? '#666' : '#EF4444', fontWeight: 600 }}>
                    {c.canSend 
                      ? `Ventana: ${Math.floor(c.windowSecondsRemaining / 3600)}h restantes` 
                      : isBlocked 
                        ? 'Fuera de ventana (Solo Plantilla)' 
                        : 'Fuera de ventana'
                    }
                  </span>
                </div>
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
      )}

      {/* ── Main: Consola de Lanzamiento ── */}
      <main className="page-main custom-scrollbar">
        
        <div style={{ width: '100%', margin: '0' }}>
          <header style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="mob-sidebar-btn"
                aria-label="Abrir lista de contactos"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                {viewMode === 'audit' ? (selectedRun ? (selectedRun.title || RUN_TYPE_LABELS[selectedRun.type] || selectedRun.type) : 'Auditoría de Envíos') : 'Lanzamiento Masivo'}
              </h1>
            </div>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              {viewMode === 'audit'
                ? (selectedRun ? formatRunDate(selectedRun.startedAt) : 'Seleccioná un masivo de la lista para ver el detalle de cada envío.')
                : 'Configura y dispara campañas masivas de alta tasa de apertura.'}
            </p>

            {viewMode === 'compose' && dailyUsage?.dailyLimit != null && (
              <div style={{
                marginTop: '1.25rem',
                padding: '0.9rem 1.25rem',
                borderRadius: 14,
                background: (dailyUsage.dailyRemaining ?? 0) <= 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${(dailyUsage.dailyRemaining ?? 0) <= 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                maxWidth: 680,
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: (dailyUsage.dailyRemaining ?? 0) <= 0 ? '#EF4444' : '#F2F2F2' }}>
                  Capacidad de envío hoy: {dailyUsage.dailyUsed}/{dailyUsage.dailyLimit} usados · {dailyUsage.dailyRemaining ?? 0} disponibles
                </span>
                <span style={{ fontSize: '0.7rem', color: '#8C8C8C', lineHeight: 1.5 }}>
                  Este cupo no se reinicia todo junto a una hora fija: cada mensaje libera su espacio 24 horas después de haberse enviado. Por eso los &quot;disponibles&quot; van subiendo poco a poco durante el día, no de golpe.
                </span>
              </div>
            )}
          </header>

          {viewMode === 'compose' ? (
          <>
          {/* Título del masivo (interno, no se envía a WhatsApp) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Título del masivo (interno, solo para auditoría) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={broadcastTitle}
              onChange={(e) => { setBroadcastTitle(e.target.value); if (titleError) setTitleError(false); }}
              placeholder="Ej: Promo de fin de mes"
              maxLength={120}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${titleError ? '#EF4444' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px', padding: '0.85rem 1rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
            />
            {titleError && (
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#EF4444', fontWeight: 600 }}>Campo obligatorio</p>
            )}
          </div>

          {/* Selector de Tipo de Mensaje */}
          <div style={{ background: '#080808', borderRadius: '20px', padding: '0.5rem', display: 'flex', gap: '0.5rem', marginBottom: forceMetaTemplate ? '0.75rem' : '2.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            {(['manual', 'template', 'ia'] as BroadcastMessageType[])
              .map((type) => {
              const isLocked = forceMetaTemplate && type !== 'template';
              return (
                <button
                  key={type}
                  onClick={() => !isLocked && setMessageType(type)}
                  disabled={isLocked}
                  style={{
                    flex: 1, padding: '1rem', borderRadius: '16px', border: 'none',
                    background: messageType === type ? '#EF4444' : 'transparent',
                    color: isLocked ? '#333' : messageType === type ? 'white' : '#666',
                    fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                    cursor: isLocked ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
                    opacity: isLocked ? 0.4 : 1,
                    boxShadow: messageType === type ? '0 10px 20px rgba(239, 68, 68, 0.2)' : 'none'
                  }}
                >
                  {type === 'manual' ? 'Texto Libre' : type === 'template' ? 'Plantilla Oficial' : 'Asistente IA'}
                </button>
              );
            })}
          </div>

          {forceMetaTemplate && (
            <p style={{ marginBottom: '1.75rem', fontSize: '0.75rem', color: '#F59E0B', fontWeight: 700 }}>
              El Excel importado incluye contactos nuevos y/o fuera de la ventana de 24h: WhatsApp exige una plantilla aprobada de Meta para escribirles, por eso solo esa opción está disponible para este envío.
            </p>
          )}

          {/* Área de Composición */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2rem' }}>
            {messageType === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contenido del Mensaje</label>
                <textarea 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribe el mensaje que recibirán tus contactos..."
                  style={{ width: '100%', minHeight: '200px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', color: 'white', outline: 'none', fontSize: '1rem', resize: 'vertical', lineHeight: '1.6' }}
                />
              </div>
            )}

            {messageType === 'template' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Selecciona una Plantilla</label>
                  <div ref={templateDropdownRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={toggleTemplateDropdown}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem', color: selectedTemplate ? 'white' : '#666', outline: 'none', fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedTemplate ? humanizeTemplateName(selectedTemplate.name).label : 'Seleccionar...'}
                      </span>
                      <ChevronDownIcon style={{ color: '#EF4444', flexShrink: 0, transform: templateDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>

                    {templateDropdownOpen && templateDropdownPos && (
                      <div style={{
                        position: 'fixed',
                        top: templateDropdownPos.top ?? undefined,
                        bottom: templateDropdownPos.bottom ?? undefined,
                        left: templateDropdownPos.left,
                        width: templateDropdownPos.width,
                        maxHeight: templateDropdownPos.maxHeight,
                        zIndex: 200,
                        background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      }}>
                        <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                          <div style={{ position: 'relative' }}>
                            <SearchIcon style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#444', width: '0.85rem', height: '0.85rem' }} />
                            <input
                              autoFocus
                              type="text"
                              value={templateSearch}
                              onChange={(e) => setTemplateSearch(e.target.value)}
                              placeholder="Buscar plantilla..."
                              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.6rem 0.75rem 0.6rem 2.2rem', color: 'white', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar" onScroll={handleTemplateListScroll}>
                          {filteredTemplateOptions.length === 0 ? (
                            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#444', fontSize: '0.8rem' }}>Sin resultados</div>
                          ) : visibleTemplateOptions.map(t => {
                            const { label, language } = humanizeTemplateName(t.name);
                            const isSelected = t.id === templateId;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelectTemplate(t.id)}
                                style={{
                                  width: '100%', display: 'block', textAlign: 'left', padding: '0.75rem 1rem', border: 'none',
                                  background: isSelected ? 'rgba(239,68,68,0.1)' : 'transparent', cursor: 'pointer',
                                }}
                              >
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#EF4444' : '#F2F2F2' }}>{label}</div>
                                <div style={{ fontSize: '0.68rem', color: '#666', marginTop: '0.15rem' }}>
                                  {language ? `${language.toUpperCase()} · ` : ''}{t.name}
                                </div>
                              </button>
                            );
                          })}
                          {visibleTemplateOptions.length < filteredTemplateOptions.length && (
                            <div style={{ padding: '0.6rem', textAlign: 'center', color: '#444', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Desplazate para ver más
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {forceMetaTemplate && templateOptions.length === 0 && (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#EF4444', fontWeight: 600 }}>
                      No hay plantillas aprobadas de Meta disponibles. Crea/aprueba una plantilla oficial antes de enviar a estos contactos nuevos.
                    </p>
                  )}
                </div>

                {selectedTemplate && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vista Previa del Mensaje</label>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem', color: '#ddd', fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {renderTemplatePreviewNodes(selectedTemplate.body, templateVars, templateVarModes)}
                    </div>
                  </div>
                )}

                {selectedTemplate && selectedTemplate.variables.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Variables de la Plantilla</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {selectedTemplate.variables.map(v => {
                        const mode = templateVarModes[v] || 'fixed';
                        return (
                          <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>{v}</span>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => setTemplateVarModes(prev => ({ ...prev, [v]: 'fixed' }))}
                                style={{
                                  flex: 1, padding: '0.5rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                  border: mode === 'fixed' ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.08)',
                                  background: mode === 'fixed' ? 'rgba(239,68,68,0.12)' : 'transparent',
                                  color: mode === 'fixed' ? '#EF4444' : '#888',
                                }}
                              >
                                Valor fijo
                              </button>
                              <button
                                type="button"
                                onClick={() => setTemplateVarModes(prev => ({ ...prev, [v]: 'contact_name' }))}
                                style={{
                                  flex: 1, padding: '0.5rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                  border: mode === 'contact_name' ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.08)',
                                  background: mode === 'contact_name' ? 'rgba(59,130,246,0.12)' : 'transparent',
                                  color: mode === 'contact_name' ? '#3B82F6' : '#888',
                                }}
                              >
                                Nombre del contacto
                              </button>
                            </div>
                            {mode === 'fixed' ? (
                              <input
                                type="text"
                                placeholder={v.toUpperCase()}
                                value={templateVars[v] || ''}
                                onChange={(e) => setTemplateVars(prev => ({ ...prev, [v]: e.target.value }))}
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem', color: 'white', outline: 'none' }}
                              />
                            ) : (
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#3B82F6' }}>
                                Se reemplazará automáticamente por el nombre registrado de cada contacto.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedTemplate?.header && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {selectedTemplate.header.format === 'TEXT'
                        ? 'Variable del Encabezado'
                        : `Archivo de ${selectedTemplate.header.format.toLowerCase()} para el Encabezado`}
                    </label>
                    {selectedTemplate.header.format === 'TEXT' ? (
                      <input
                        type="text"
                        placeholder="VALOR"
                        value={templateHeaderValue}
                        onChange={(e) => setTemplateHeaderValue(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem', color: 'white', outline: 'none' }}
                      />
                    ) : (
                      <>
                        <FileDropzone
                          accept={
                            selectedTemplate.header.format === 'IMAGE' ? 'image/*'
                              : selectedTemplate.header.format === 'VIDEO' ? 'video/*'
                              : undefined
                          }
                          onFile={handleHeaderFile}
                          disabled={templateHeaderUploading}
                          hint={selectedTemplate.header.format.toLowerCase()}
                        />
                        {templateHeaderPreviewUrl && (selectedTemplate.header.format === 'IMAGE' || selectedTemplate.header.format === 'VIDEO') && (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            {selectedTemplate.header.format === 'IMAGE' ? (
                              <Image
                                src={templateHeaderPreviewUrl}
                                alt="Vista previa del encabezado"
                                width={220}
                                height={220}
                                unoptimized
                                style={{ maxWidth: '220px', maxHeight: '220px', width: 'auto', height: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover' }}
                              />
                            ) : (
                              // eslint-disable-next-line jsx-a11y/media-has-caption
                              <video
                                src={templateHeaderPreviewUrl}
                                controls
                                style={{ maxWidth: '260px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                              />
                            )}
                          </div>
                        )}
                        {loadingSavedHeader && <p style={{ margin: 0, fontSize: '0.75rem', color: '#999' }}>Buscando archivo guardado...</p>}
                        {templateHeaderUploading && <p style={{ margin: 0, fontSize: '0.75rem', color: '#999' }}>Subiendo archivo...</p>}
                        {!templateHeaderUploading && templateHeaderFileName && (
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#22C55E' }}>
                            {usingSavedHeader ? `Usando archivo guardado: ${templateHeaderFileName} (subí uno nuevo para reemplazarlo)` : `Archivo listo: ${templateHeaderFileName}`}
                          </p>
                        )}
                        {templateHeaderUploadError && (
                          <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '0.1rem' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#EF4444', fontWeight: 700, lineHeight: 1.5 }}>{templateHeaderUploadError}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedTemplate?.buttons && selectedTemplate.buttons.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Variables de Botones</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {selectedTemplate.buttons.map(btn => (
                        <input
                          key={btn.index}
                          type="text"
                          placeholder={btn.text.toUpperCase()}
                          value={templateButtonVars[String(btn.index)] || ''}
                          onChange={(e) => setTemplateButtonVars(prev => ({ ...prev, [String(btn.index)]: e.target.value }))}
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem', color: 'white', outline: 'none' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {messageType === 'ia' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Instrucción para Gemini</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input 
                      type="text" 
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Ej: Redacta una invitación formal para un evento de networking..."
                      style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', color: 'white', outline: 'none' }}
                    />
                    <button 
                      onClick={handleGenerateMessage}
                      disabled={generating}
                      style={{ padding: '0 1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '14px', color: '#EF4444', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {generating ? <Spinner size={16} /> : <SparklesIcon />}
                      {generating ? '...' : 'GENERAR'}
                    </button>
                  </div>
                </div>
                {(generatedText || text) && (
                  <textarea 
                    value={generatedText || text}
                    onChange={(e) => { setGeneratedText(''); setText(e.target.value); }}
                    style={{ width: '100%', minHeight: '150px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.25rem', color: '#8C8C8C', outline: 'none', fontSize: '0.95rem' }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Confirmación y Envío */}
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2.5rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '24px' }}>
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', display: 'block' }}>{selectedIds.size}</span>
                <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contactos Seleccionados</span>
              </div>
              <button
                onClick={handleSend}
                disabled={
                  sending ||
                  selectedIds.size === 0 ||
                  templateHeaderUploading ||
                  capacityBlocked ||
                  (messageType === 'template' && !!selectedTemplate?.header && selectedTemplate.header.format !== 'TEXT' && !templateHeaderValue)
                }
                style={{
                  padding: '1.25rem 3rem', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', border: 'none', borderRadius: '16px', color: 'white', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.15em', cursor: capacityBlocked ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
                  boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)', opacity: (
                    sending ||
                    selectedIds.size === 0 ||
                    templateHeaderUploading ||
                    capacityBlocked ||
                    (messageType === 'template' && !!selectedTemplate?.header && selectedTemplate.header.format !== 'TEXT' && !templateHeaderValue)
                  ) ? 0.5 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                {sending ? <Spinner size={16} /> : null}
                {sending ? 'Lanzando...' : capacityBlocked ? 'Sin cupo hoy' : 'Lanzar Masivos'}
              </button>
            </div>
            {capacityBlocked && (
              <p style={{ margin: 0, padding: '0 0.5rem', fontSize: '0.75rem', color: '#EF4444', fontWeight: 600 }}>
                Se agotó el cupo diario de WhatsApp ({dailyUsage?.dailyUsed ?? 0}/{dailyUsage?.dailyLimit ?? 0}) — no se puede lanzar hasta que se libere espacio{nextFreeAtLabel ? ` (aprox. ${nextFreeAtLabel})` : ''}.
              </p>
            )}
            {!capacityBlocked && dailyRemaining != null && selectedIds.size > dailyRemaining && (
              <p style={{ margin: 0, padding: '0 0.5rem', fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>
                Seleccionaste {selectedIds.size} contactos pero hoy solo quedan {dailyRemaining} cupos — algunos podrían no enviarse.
              </p>
            )}
          </div>
          </>
          ) : !selectedRunId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, minHeight: '60vh' }}>
              <Image src="/assets/images/NOIRLINE2.png" alt="Nextline" width={120} height={120} style={{ filter: 'grayscale(1)', marginBottom: '2rem' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Selecciona un masivo</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setAuditTagPanelOpen((open) => !open);
                    setAssignTagError('');
                    setAssignTagResult(null);
                  }}
                  style={{
                    background: auditTagPanelOpen ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.03)',
                    border: auditTagPanelOpen ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: auditTagPanelOpen ? '#EF4444' : '#8C8C8C',
                    padding: '0.6rem 1.1rem',
                    borderRadius: 10,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                  }}
                >
                  Asignar etiqueta
                </button>
                <button
                  onClick={handleExportRun}
                  disabled={exportingRun || runContacts.length === 0}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: runContacts.length === 0 ? '#444' : '#8C8C8C', padding: '0.6rem 1.1rem', borderRadius: 10, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: runContacts.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  {exportingRun ? 'Exportando...' : 'Exportar Excel'}
                </button>
              </div>

              {auditTagPanelOpen && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  padding: '1.25rem 1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.9rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F2F2F2', marginBottom: '0.35rem' }}>
                      Etiqueta de este masivo
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#8C8C8C', lineHeight: 1.5 }}>
                      Se vincula a los contactos de este envío. Si un contacto ya tenía otra etiqueta, se reemplaza.
                    </p>
                  </div>

                  <TagPicker
                    tags={tags}
                    value={auditTagId}
                    onChange={(id) => {
                      setAuditTagId(id);
                      setAssignTagResult(null);
                      setAssignTagError('');
                    }}
                    placeholder="Seleccionar etiqueta..."
                  />

                  {me?.role === 'ORG_ADMIN' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={newAuditTagName}
                        onChange={(e) => setNewAuditTagName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAuditTag(); } }}
                        placeholder="O crear una etiqueta nueva..."
                        maxLength={80}
                        style={{
                          flex: 1,
                          minWidth: 180,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '0.7rem 0.85rem',
                          color: 'white',
                          outline: 'none',
                          fontSize: '0.85rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateAuditTag}
                        disabled={!newAuditTagName.trim() || creatingAuditTag}
                        style={{
                          padding: '0.7rem 1rem',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)',
                          color: !newAuditTagName.trim() ? '#444' : '#F2F2F2',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          cursor: !newAuditTagName.trim() || creatingAuditTag ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {creatingAuditTag ? 'Creando...' : 'Crear'}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setAuditTagOnlySent((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 12,
                      background: auditTagOnlySent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: auditTagOnlySent ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                      borderRadius: 5,
                      border: '2px solid',
                      borderColor: auditTagOnlySent ? '#EF4444' : '#333',
                      background: auditTagOnlySent ? '#EF4444' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {auditTagOnlySent && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: auditTagOnlySent ? '#F2F2F2' : '#8C8C8C', fontWeight: 600, lineHeight: 1.4 }}>
                      Solo contactos enviados ({selectedRun?.sent ?? 0}), no incluir fallidos
                    </span>
                  </button>

                  {assignTagError && (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#EF4444', fontWeight: 600 }}>{assignTagError}</p>
                  )}
                  {assignTagResult && (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#4ADE80', fontWeight: 600 }}>
                      Se vinculó <strong>{assignTagResult.tagName}</strong> a {assignTagResult.updated} contacto{assignTagResult.updated === 1 ? '' : 's'}
                      {assignTagResult.alreadyTagged > 0 ? ` (${assignTagResult.alreadyTagged} ya la tenían).` : '.'}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleAssignRunTag}
                      disabled={!auditTagId || assigningTag}
                      style={{
                        padding: '0.75rem 1.4rem',
                        background: !auditTagId || assigningTag ? 'rgba(239, 68, 68, 0.25)' : 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                        border: 'none',
                        borderRadius: 12,
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: !auditTagId || assigningTag ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      {assigningTag ? <Spinner size={14} /> : null}
                      {assigningTag ? 'Vinculando...' : 'Vincular a contactos'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {RUN_REASON_FILTERS.filter((f) => f.category !== 'SANDBOX_BLOCKED' || me?.isSandbox).map((f) => {
                  const active = runContactsStatus === f.status && runContactsCategory === f.category;
                  return (
                    <button
                      key={f.label}
                      onClick={() => changeRunFilter(f.status, f.category)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: 8,
                        background: active ? '#EF4444' : 'rgba(255,255,255,0.03)',
                        border: active ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        color: active ? 'white' : '#8C8C8C',
                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div
                className="custom-scrollbar"
                onScroll={handleRunContactsScroll}
                style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, maxHeight: '58vh', overflowY: 'auto' }}
              >
                {loadingRunContacts ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner /></div>
                ) : runContacts.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#444' }}>Sin contactos en esta categoría.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', fontSize: '0.65rem' }}>Fecha y hora</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', fontSize: '0.65rem' }}>Contacto</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', fontSize: '0.65rem' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runContacts.map((c, i) => (
                        <tr key={`${c.phone}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.75rem 1rem', color: '#8C8C8C', fontSize: '0.75rem' }}>{formatRunDate(c.createdAt)}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#F2F2F2' }}>{c.name || '(sin nombre)'}</div>
                            <div style={{ color: '#666', fontSize: '0.72rem' }}>{c.phone}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 6,
                              background: c.status === 'sent' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                              color: c.status === 'sent' ? '#4ADE80' : '#EF4444',
                            }}>
                              {c.status === 'sent' ? 'Enviado' : (c.failureLabel || 'Fallido')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {loadingMoreRunContacts && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                    <Spinner size={18} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #EF4444; }

        .pulse-heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.4));
        }

        @keyframes heartbeat {
          0% { transform: scale(0.9); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.4; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mob-sidebar-btn {
          display: none;
          width: 40px; height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: #8C8C8C;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .mob-sidebar-btn:hover { background: rgba(255,255,255,0.08); color: #F2F2F2; }
        @media (max-width: 768px) { .mob-sidebar-btn { display: flex; } }
      `}</style>
    </div>
  );
}
