'use client';

import { Fragment, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';
import {
  isLoggedIn,
  getMe,
  getConversations,
  searchConversationsByMessage,
  getMessages,
  getConversation,
  markConversationAsRead,
  sendMessage,
  sendMediaFile,
  getGallery,
  updateContact,
  generateReply,
  assignConversation,
  backfillAssignments,
  sendMedia,
  getOrgUsers,
  getTags,
  toggleConversationAi,
  simulateIncomingMessage,
  getConversationTrainingStatus,
  toggleConversationTrainingMode,
  getFidelTrainingRules,
  createFidelTrainingRule,
  toggleFidelTrainingRule,
  deleteFidelTrainingRule,
  runSandboxTrainingTurn,
  type FidelTrainingRule,
  type Conversation,
  type Message,
  type NewMessagePayload,
  type MessageStatusPayload,
  type Tag,
} from '@/lib/api';
import { formatPhoneDisplay } from '@/lib/format';
import { Spinner } from '@/shared/ui/spinner';
import { TagPicker } from '@/shared/ui/molecules/tag-picker';
import styles from './chat.module.css';

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api$/, '');

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

function SparklesIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function ReplyIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function MegaphoneIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function PlayIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '0.9rem', height: '0.9rem', ...style }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '0.9rem', height: '0.9rem', ...style }} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

function formatAudioTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getAdUrl(referral?: any): string | undefined {
  if (!referral) return undefined;
  const url = referral.source_url;
  if (url && url !== 'https://facebook.com' && url !== 'https://www.facebook.com') {
    return url;
  }
  if (referral.source_id) {
    return `https://www.facebook.com/ads/library/?id=${referral.source_id}`;
  }
  return url || undefined;
}

/** Reproductor de audio con estilos propios: el <audio controls> nativo no se puede
 * re-estilar de forma consistente entre navegadores, así que se reemplaza por un
 * botón de play/pause + barra de progreso propios, acordes al tema de la app. */
function AudioPlayer({ src, isAgent }: { src: string; isAgent: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const accent = isAgent ? '#FFFFFF' : '#EF4444';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '240px' }}>
      <audio ref={audioRef} src={src} preload="metadata" style={{ display: 'none' }} />
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '2.1rem', height: '2.1rem', borderRadius: '50%', border: 'none', flexShrink: 0,
          background: isAgent ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.15)',
          color: isAgent ? 'white' : '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon style={{ marginLeft: '1px' }} />}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: accent }}
        />
        <span style={{ fontSize: '0.65rem', color: isAgent ? 'rgba(255,255,255,0.75)' : '#888', fontWeight: 600 }}>
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </span>
      </div>
    </div>
  );
}

function SendIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.1rem', height: '1.1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function PaperclipIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.1rem', height: '1.1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function isSameLocalDay(firstTimestamp: number, secondTimestamp: number) {
  const first = new Date(firstTimestamp);
  const second = new Date(secondTimestamp);
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function dayLabel(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(timestamp, today.getTime())) return 'Hoy';
  if (isSameLocalDay(timestamp, yesterday.getTime())) return 'Ayer';

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

function formatConversationDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const calendarDay = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const daysAgo = Math.round((calendarDay(today) - calendarDay(date)) / (24 * 60 * 60 * 1000));

  if (daysAgo === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (daysAgo === 1) return 'Ayer';
  if (daysAgo > 1 && daysAgo < 7) {
    return date.toLocaleDateString('es-ES', { weekday: 'long' });
  }

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [messageSearchResult, setMessageSearchResult] = useState<{ term: string; matches: Record<string, string> }>({ term: '', matches: {} });
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [messageSearchError, setMessageSearchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyInput, setReplyInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [typingHint, setTypingHint] = useState('');
  const [canSend, setCanSend] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // New details, lightbox and attachment states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editSandbox, setEditSandbox] = useState(false);
  const [isSandbox, setIsSandbox] = useState(true);
  const [updatingContact, setUpdatingContact] = useState(false);
  const [gallery, setGallery] = useState<Message[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryNextCursor, setGalleryNextCursor] = useState<string | null>(null);
  const [loadingMoreGallery, setLoadingMoreGallery] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [orgUsers, setOrgUsers] = useState<Array<{ id: string; email: string; displayName: string | null; role: string }>>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fidel AI, Simulator & Training states
  const [togglingAi, setTogglingAi] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorTab, setSimulatorTab] = useState<'simulador' | 'entrenamiento' | 'memoria'>('simulador');
  const [simText, setSimText] = useState('');
  const [simSending, setSimSending] = useState(false);
  const [simNotice, setSimNotice] = useState('');

  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [togglingTraining, setTogglingTraining] = useState(false);
  const [fidelRules, setFidelRules] = useState<FidelTrainingRule[]>([]);
  const [sandboxHistory, setSandboxHistory] = useState<Array<{ role: 'trainer' | 'fidel'; text: string; mode?: string }>>([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxSending, setSandboxSending] = useState(false);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<string>('ESTILO');
  const [addingRule, setAddingRule] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const myUserIdRef = useRef<string | null>(null);
  const myUserRoleRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingOlderRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const sendingRef = useRef(false);
  // Set de IDs de mensajes que ya fueron procesados vía respuesta de API (para que el WebSocket no los duplique)
  const recentlySentIdsRef = useRef<Set<string>>(new Set());

  selectedIdRef.current = selectedId;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn()) { router.replace('/login'); return; }
    getMe().then(m => {
      myUserIdRef.current = m.id;
      myUserRoleRef.current = m.role;
      if (m.isSandbox !== undefined) {
        setIsSandbox(m.isSandbox);
      }
      if (m.role === 'ORG_ADMIN') {
        getOrgUsers({ assignable: true }).then(u => setOrgUsers(u)).catch(() => {});
      }
    }).catch(() => {});
    getTags().then(setTags).catch(() => {});
    getFidelTrainingRules().then(res => setFidelRules(res.rules || [])).catch(() => {});
    loadConversations();
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || !isLoggedIn()) return;
    const token = localStorage.getItem('chatcontrol_token');
    const socket = io(WS_BASE, { auth: { token: token || '' } });
    socketRef.current = socket;

    socket.on('new_message', (payload: NewMessagePayload) => {
      if (payload.conversationId === selectedIdRef.current) {
        setMessages(prev => {
          // Si ya existe por ID real, no duplicar
          if (prev.some(m => m.id === payload.message.id)) return prev;
          // Para mensajes salientes (del agente): intentar reemplazar el temp pendiente
          if (!payload.message.fromUser) {
            const tempIdx = prev.findIndex(m => m.id.startsWith('temp_'));
            if (tempIdx !== -1) {
              const updated = [...prev];
              updated[tempIdx] = { ...payload.message, status: payload.message.status || 'SENT' };
              return updated;
            }
          }
          // Mensaje entrante del contacto: agregar normalmente
          return [...prev, { ...payload.message, status: payload.message.status || 'RECEIVED' }];
        });
        markConversationAsRead(payload.conversationId).catch(() => {});
        setConversations(prev =>
          prev.map(c =>
            c.id === payload.conversationId
              ? {
                  ...c,
                  unreadCount: 0,
                  lastMessagePreview: payload.message.text,
                  lastMessageAt: payload.message.timestamp,
                }
              : c
          )
        );
      } else {
        loadConversations(false);
      }
    });

    socket.on('message_edited', (p: { conversationId: string; messageId: string; newText: string }) => {
      if (p.conversationId === selectedIdRef.current) {
        setMessages(prev => prev.map(m =>
          m.id === p.messageId ? { ...m, text: p.newText, isEdited: true } : m
        ));
      }
      loadConversations(false);
    });

    socket.on('message_status', (p: MessageStatusPayload) => {
      if (p.conversationId === selectedIdRef.current) {
        setMessages(prev => prev.map(m =>
          m.id === p.messageId ? { ...m, status: p.status } : m
        ));
      }
      loadConversations(false);
    });

    socket.on('conversation_assigned', (p: { conversationId: string; assignedToUserId: string }) => {
      loadConversations(false);
    });

    socket.on('conversation_assigned_to_me', (p: { conversationId: string }) => {
      loadConversations(false);
      if (selectedIdRef.current !== p.conversationId) {
        setToastMessage('Nuevo chat asignado');
        setTimeout(() => setToastMessage(''), 5000);
      }
      if (selectedIdRef.current === p.conversationId) {
        markConversationAsRead(p.conversationId).catch(() => {});
      }
    });

    socket.on('conversation_read', (p: { conversationId: string }) => {
      setConversations(prev =>
        prev.map(c => (c.id === p.conversationId ? { ...c, unreadCount: 0 } : c))
      );
    });

    socket.on('conversation_ai_status_updated', (p: { conversationId: string; isAiActive: boolean }) => {
      setConversations(prev =>
        prev.map(c => (c.id === p.conversationId ? { ...c, isAiActive: p.isAiActive } : c))
      );
    });

    socket.on('conversation_training_status_updated', (p: { conversationId: string; isTrainingMode: boolean; isAiActive: boolean }) => {
      if (p.conversationId === selectedIdRef.current) {
        setIsTrainingMode(p.isTrainingMode);
      }
      setConversations(prev =>
        prev.map(c => (c.id === p.conversationId ? { ...c, isAiActive: p.isAiActive } : c))
      );
    });

    socket.on('fidel_rule_learned', (p: { rule: FidelTrainingRule }) => {
      if (p?.rule) {
        setFidelRules(prev => [p.rule, ...prev.filter(r => r.id !== p.rule.id)]);
        setToastMessage(`Fidel aprendió una nueva regla: ${p.rule.instruction}`);
        setTimeout(() => setToastMessage(''), 5500);
      }
    });

    socket.on('typing', (p: any) => {
      if (p.userId === myUserIdRef.current || p.conversationId !== selectedIdRef.current) return;
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (!p.typing) { setTypingHint(''); return; }
      setTypingHint(`${p.displayName || 'Cliente'} está escribiendo...`);
      typingStopTimerRef.current = setTimeout(() => setTypingHint(''), 3000);
    });

    return () => { socket.disconnect(); };
  }, [mounted]);

  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setConversations(prev =>
      prev.map(c => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
    );
    isLoadingOlderRef.current = false;
    (async () => {
      setLoadingMessages(true);
      try {
        const [convRes, msgRes, trainingRes] = await Promise.all([
          getConversation(selectedId),
          getMessages(selectedId),
          getConversationTrainingStatus(selectedId).catch(() => ({ ok: true, isTrainingMode: false })),
        ]);
        setMessages(msgRes.messages);
        setNextCursor(msgRes.nextCursor);
        setCanSend(convRes.canSend ?? false);
        setIsTrainingMode(trainingRes?.isTrainingMode === true);
        if (convRes.conversation) {
          setConversations(prev =>
            prev.map(c => (c.id === selectedId ? { ...c, isAiActive: convRes.conversation!.isAiActive === true } : c))
          );
        }
        await markConversationAsRead(selectedId);
      } catch (err) {} finally {
        setLoadingMessages(false);
      }
    })();
  }, [selectedId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (isLoadingOlderRef.current) {
      // Mantiene la posición de scroll al insertar mensajes antiguos arriba
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      isLoadingOlderRef.current = false;
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedId]);

  async function loadMoreMessages() {
    if (!selectedId || !nextCursor || loadingMore) return;
    const el = messagesContainerRef.current;
    prevScrollHeightRef.current = el?.scrollHeight ?? 0;
    isLoadingOlderRef.current = true;
    setLoadingMore(true);
    try {
      const res = await getMessages(selectedId, nextCursor);
      setMessages(prev => [...res.messages, ...prev]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      isLoadingOlderRef.current = false;
    } finally {
      setLoadingMore(false);
    }
  }

  function handleMessagesScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 80 && nextCursor && !loadingMore && !loadingMessages) {
      loadMoreMessages();
    }
  }

  async function loadConversations(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const list = await getConversations();
      setConversations(
        list.map(c => (c.id === selectedIdRef.current ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {} finally {
      setLoading(false);
    }
  }

  const handleSelectConversation = (convId: string) => {
    setSelectedId(convId);
    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );
    markConversationAsRead(convId).catch(() => {});
  };

  async function handleSend() {
    if (!selectedId || !replyInput.trim() || sending || !canSend || sendingRef.current) return;
    const text = replyInput.trim();
    const quoted = replyTarget;
    setReplyInput('');
    setReplyTarget(null);
    setSending(true);
    sendingRef.current = true;
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId: selectedId,
      fromUser: false,
      text,
      timestamp: Date.now(),
      status: 'SENDING',
      replyTo: quoted ? { id: quoted.id, text: quoted.text, fromUser: quoted.fromUser, type: quoted.type, mediaUrl: quoted.mediaUrl } : undefined,
    };
    setMessages(prev => [...prev, optimistic]);
    setConversations(prev =>
      prev.map(c =>
        c.id === selectedId
          ? { ...c, lastMessagePreview: `Tú: ${text}`, lastMessageAt: Date.now(), unreadCount: 0, isAiActive: false }
          : c
      )
    );
    try {
      const res = await sendMessage(selectedId, text, quoted?.id);
      setMessages(prev => {
        // Si el WS ya agregó el mensaje real, solo eliminar el temp
        if (res?.message && prev.some(m => m.id === res.message.id)) {
          return prev.filter(m => m.id !== tempId);
        }
        // Si el WS no llegó aún, reemplazar el temp por el real
        if (res?.message) {
          return prev.map(m => m.id === tempId ? { ...res.message } : m);
        }
        // Sin respuesta válida, eliminar temp (el WS lo agregará)
        return prev.filter(m => m.id !== tempId);
      });
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setReplyInput(text);
      setReplyTarget(quoted);
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Archivo muy grande. Máximo 16MB.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }

  async function handleSendFile() {
    if (!selectedId || !selectedFile || uploading || !canSend) return;
    setUploading(true);
    
    let type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'DOCUMENT';
    if (selectedFile.type.startsWith('image/')) {
      type = 'IMAGE';
    } else if (selectedFile.type.startsWith('video/')) {
      type = 'VIDEO';
    } else if (selectedFile.type.startsWith('audio/')) {
      type = 'AUDIO';
    }

    try {
      await sendMediaFile(selectedId, selectedFile, type);
      const msgRes = await getMessages(selectedId);
      setMessages(msgRes.messages);
      setSelectedFile(null);
      setFilePreview(null);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedId
            ? { ...c, lastMessagePreview: 'Tú: Archivo multimedia', lastMessageAt: Date.now(), unreadCount: 0 }
            : c
        )
      );
    } catch (err: any) {
      alert(err.message || 'Error al enviar archivo');
    } finally {
      setUploading(false);
    }
  }

  function clearFileSelection() {
    setSelectedFile(null);
    setFilePreview(null);
  }

  async function handleAssign(userId: string | null) {
    if (!selectedId) return;
    try {
      await assignConversation(selectedId, userId);
      setAssignModalOpen(false);
      setAssignSearch('');
      loadConversations(false);
    } catch (err) {}
  }

  async function handleBackfill() {
    setBackfilling(true);
    try {
      const result = await backfillAssignments();
      if (result.total === 0) {
        setToastMessage('No hay chats históricos sin asignar.');
      } else {
        setToastMessage(`Se asignaron ${result.assigned} de ${result.total} chats históricos.`);
      }
      setTimeout(() => setToastMessage(''), 5000);
      loadConversations(false);
    } catch (err) {
      setToastMessage('Error al asignar chats históricos.');
      setTimeout(() => setToastMessage(''), 5000);
    } finally {
      setBackfilling(false);
    }
  }

  const userRole = myUserRoleRef.current;

  const filteredUsers = orgUsers
    .filter(u => {
      const q = assignSearch.toLowerCase();
      return (u.displayName?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    })
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));

  function renderStatus(status?: string) {
    if (!status || status === 'SENDING') return null;
    if (status === 'SENT') return <span style={{ fontSize: '0.6rem', color: '#888' }}>✓</span>;
    if (status === 'DELIVERED') return <span style={{ fontSize: '0.6rem', color: '#888' }}>✓✓</span>;
    if (status === 'READ') return <span style={{ fontSize: '0.6rem', color: '#60A5FA' }}>✓✓</span>;
    if (status === 'FAILED') return <span style={{ fontSize: '0.6rem', color: '#EF4444' }}>✗</span>;
    return null;
  }

  async function handleGenerateReply() {
    if (!selectedId || generating) return;
    setGenerating(true);
    try {
      const res = await generateReply(selectedId);
      setReplyInput(res.text || '');
    } catch (err) {} finally {
      setGenerating(false);
    }
  }

  async function handleToggleAi() {
    if (!selectedId || togglingAi) return;
    const currentConv = conversations.find(c => c.id === selectedId);
    const nextState = currentConv?.isAiActive === true ? false : true;
    setTogglingAi(true);
    try {
      await toggleConversationAi(selectedId, nextState);
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, isAiActive: nextState } : c));
    } catch (err: any) {
      console.error('Error alternando Fidel:', err);
    } finally {
      setTogglingAi(false);
    }
  }

  async function handleSimulateClientMessage(presetText?: string) {
    const text = (presetText || simText).trim();
    if (!text || simSending) return;
    setSimSending(true);
    setSimNotice('');
    try {
      const currentConv = conversations.find(c => c.id === selectedId);
      await simulateIncomingMessage({
        text,
        phone: currentConv?.phone || '593991112233',
        contactName: currentConv?.name || 'Cliente Simulado',
      });
      setSimText('');
      setSimNotice('Mensaje enviado. Fidel responderá en breve...');
      setTimeout(() => setSimNotice(''), 4500);
    } catch (err: any) {
      console.error('Error simulando mensaje:', err);
      setSimNotice('Error al simular mensaje.');
    } finally {
      setSimSending(false);
    }
  }

  async function handleToggleTrainingMode() {
    if (!selectedId || togglingTraining) return;
    const nextState = !isTrainingMode;
    setTogglingTraining(true);
    try {
      const res = await toggleConversationTrainingMode(selectedId, nextState);
      setIsTrainingMode(res.isTrainingMode);
      setConversations(prev =>
        prev.map(c => (c.id === selectedId ? { ...c, isAiActive: res.isAiActive } : c))
      );
    } catch (err: any) {
      console.error('Error alternando Modo Entrenamiento:', err);
    } finally {
      setTogglingTraining(false);
    }
  }

  async function handleSendSandboxTraining(presetText?: string) {
    const text = (presetText || sandboxInput).trim();
    if (!text || sandboxSending) return;
    const currentHist = sandboxHistory.map(h => ({ role: h.role, text: h.text }));
    setSandboxInput('');
    setSandboxSending(true);
    setSandboxHistory(prev => [...prev, { role: 'trainer', text }]);
    try {
      const res = await runSandboxTrainingTurn({
        message: text,
        history: currentHist,
      });
      setSandboxHistory(prev => [
        ...prev,
        { role: 'fidel', text: res.text, mode: res.mode },
      ]);
      if (res.learnedRule) {
        setFidelRules(prev => [res.learnedRule!, ...prev.filter(r => r.id !== res.learnedRule!.id)]);
      }
    } catch (err: any) {
      setSandboxHistory(prev => [
        ...prev,
        { role: 'fidel', text: 'Error al procesar el turno de entrenamiento.' },
      ]);
    } finally {
      setSandboxSending(false);
    }
  }

  async function handleAddManualRule() {
    if (!newRuleInput.trim() || addingRule) return;
    setAddingRule(true);
    try {
      const res = await createFidelTrainingRule({
        instruction: newRuleInput.trim(),
        category: newRuleCategory,
      });
      if (res.rule) {
        setFidelRules(prev => [res.rule, ...prev.filter(r => r.id !== res.rule.id)]);
      }
      setNewRuleInput('');
    } catch (err: any) {
      console.error('Error agregando regla:', err);
    } finally {
      setAddingRule(false);
    }
  }

  async function handleToggleRule(ruleId: string, isActive: boolean) {
    try {
      const res = await toggleFidelTrainingRule(ruleId, isActive);
      setFidelRules(res.rules || []);
    } catch (err) {
      console.error('Error alternando regla:', err);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      const res = await deleteFidelTrainingRule(ruleId);
      setFidelRules(res.rules || []);
    } catch (err) {
      console.error('Error eliminando regla:', err);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchingMessages(false);
      setMessageSearchError(false);
      return;
    }
    let active = true;
    setSearchingMessages(true);
    setMessageSearchError(false);
    searchConversationsByMessage(debouncedSearch)
      .then((matches) => {
        if (active) setMessageSearchResult({
          term: debouncedSearch,
          matches: Object.fromEntries(matches.map((match) => [match.conversationId, match.message])),
        });
      })
      .catch(() => { if (active) setMessageSearchError(true); })
      .finally(() => { if (active) setSearchingMessages(false); });
    return () => { active = false; };
  }, [debouncedSearch]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const pendingMessageSearch = normalizedSearch.length >= 2 &&
    (debouncedSearch.toLowerCase() !== normalizedSearch || searchingMessages);
  const messageMatches = messageSearchResult.term.toLowerCase() === normalizedSearch
    ? messageSearchResult.matches
    : {};
  const filteredConversations = conversations.filter((conversation) =>
    !normalizedSearch ||
    conversation.phone.includes(normalizedSearch) ||
    conversation.name?.toLowerCase().includes(normalizedSearch) ||
    conversation.lastMessagePreview.toLowerCase().includes(normalizedSearch) ||
    messageMatches[conversation.id] !== undefined
  );

  const selectedConv = conversations.find(c => c.id === selectedId);

  useEffect(() => {
    if (selectedConv) {
      setEditName(selectedConv.name || '');
      setEditEmail(selectedConv.email || '');
      setEditTagId(selectedConv.tagId ?? null);
      setEditSandbox(selectedConv.isSandboxAuthorized || false);
    }
  }, [selectedConv]);

  useEffect(() => {
    if (selectedId && detailsOpen) {
      setLoadingGallery(true);
      getGallery(selectedId)
        .then(res => { setGallery(res.items); setGalleryNextCursor(res.nextCursor); })
        .catch(() => {})
        .finally(() => setLoadingGallery(false));
    }
  }, [selectedId, detailsOpen]);

  async function loadMoreGallery() {
    if (!selectedId || !galleryNextCursor || loadingMoreGallery) return;
    setLoadingMoreGallery(true);
    try {
      const res = await getGallery(selectedId, galleryNextCursor);
      setGallery(prev => [...prev, ...res.items]);
      setGalleryNextCursor(res.nextCursor);
    } catch (err) {} finally { setLoadingMoreGallery(false); }
  }

  function handleDetailsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMoreGallery();
    }
  }

  async function handleUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv?.contactId || updatingContact) return;
    setUpdatingContact(true);
    try {
      await updateContact(selectedConv.contactId, {
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        tagId: editTagId,
        isSandboxAuthorized: editSandbox,
      });
      await loadConversations(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar contacto');
    } finally {
      setUpdatingContact(false);
    }
  }



  if (!mounted) return null;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: '#040404', color: '#F2F2F2', overflow: 'hidden' }}>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Toast de notificación */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, background: '#EF4444', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)', animation: 'fadeIn 0.3s ease' }}>
          {toastMessage}
        </div>
      )}

      {/* ── Sidebar: Lista de Chats ── */}
      <aside className={`${styles.sidebar}${sidebarOpen ? ` ${styles.sidebarVisible}` : ''}`}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Mensajes</h2>
            {userRole === 'ORG_ADMIN' && (
              <button
                onClick={handleBackfill}
                disabled={backfilling}
                style={{ padding: '0.4rem 0.8rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: backfilling ? '#666' : '#EF4444', fontSize: '0.6rem', fontWeight: 800, cursor: backfilling ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.03em' }}
              >
                {backfilling ? 'Asignando...' : 'Asignar todas'}
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <SearchIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
            <input 
              type="text" 
              placeholder="Buscar contacto o mensaje..."
              maxLength={120}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem 1rem 0.75rem 2.8rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>
          {pendingMessageSearch && <p style={{ color: '#888', fontSize: '0.7rem', marginTop: 8 }}>Buscando en mensajes...</p>}
          {searchQuery.trim().length >= 2 && messageSearchError && <p style={{ color: '#EF4444', fontSize: '0.7rem', marginTop: 8 }}>No se pudo buscar en los mensajes. Inténtalo de nuevo.</p>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }} className="custom-scrollbar">
          {loading ? (
            <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div className="pulse-heartbeat">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#EF4444">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#222', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Sincronizando</span>
            </div>
          ) : filteredConversations.length === 0 && searchQuery.trim() && !pendingMessageSearch && !messageSearchError ? (
            <p style={{ padding: '2rem 1rem', color: '#777', fontSize: '0.8rem', textAlign: 'center' }}>
              {searchQuery.trim().length < 2 ? 'Escribe al menos 2 caracteres para buscar mensajes.' : 'No hay contactos ni mensajes que coincidan.'}
            </p>
          ) : filteredConversations.map(c => {
            const isUnread = (c.unreadCount ?? 0) > 0 && selectedId !== c.id;
            return (
              <button 
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  borderRadius: '16px', 
                  border: 'none', 
                  background: selectedId === c.id ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  marginBottom: '0.25rem',
                  position: 'relative'
                }}
                onMouseEnter={(e) => { if(selectedId !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={(e) => { if(selectedId !== c.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: selectedId === c.id ? '#EF4444' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedId === c.id ? 'white' : '#666', transition: 'all 0.3s' }}>
                  <PersonIcon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedId === c.id ? 'white' : '#F2F2F2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name || formatPhoneDisplay(c.phone)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#444' }}>{c.lastMessageAt ? formatConversationDate(c.lastMessageAt) : ''}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: isUnread ? '#EF4444' : (selectedId === c.id ? '#999' : '#666'), margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isUnread ? 700 : 400 }}>
                    {messageMatches[c.id] !== undefined ? `Coincidencia: ${messageMatches[c.id]}` : c.lastMessagePreview || 'Inicia una conversación'}
                  </p>
                </div>
                {isUnread && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', boxShadow: '0 0 10px #EF4444' }}></div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main: Área de Conversación ── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#040404', position: 'relative' }}>
        {selectedId ? (
          <>
            {/* Header del Chat */}
            <header style={{ height: '80px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 2rem', justifyContent: 'space-between', background: 'rgba(4,4,4,0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  onClick={() => setSidebarOpen(true)} 
                  className="mobile-sidebar-toggle"
                  aria-label="Abrir lista de conversaciones"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PersonIcon />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{selectedConv?.name || formatPhoneDisplay(selectedConv?.phone || '')}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: canSend ? '#4ADE80' : '#EF4444' }}></div>
                    <span style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {canSend ? 'Ventana de 24h activa' : 'Fuera de ventana'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
                <button
                  type="button"
                  onClick={handleToggleAi}
                  disabled={togglingAi}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: selectedConv?.isAiActive === true ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: selectedConv?.isAiActive === true ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: selectedConv?.isAiActive === true ? '#38BDF8' : '#777',
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={selectedConv?.isAiActive === true ? 'Fidel responderá automáticamente. Click para pausarlo.' : 'Fidel está pausado. Click para reactivarlo.'}
                >
                  <span>{selectedConv?.isAiActive === true ? 'Fidel Activo' : 'Control Asesor'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (simulatorOpen && simulatorTab === 'simulador') {
                      setSimulatorOpen(false);
                    } else {
                      setSimulatorTab('simulador');
                      setSimulatorOpen(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: simulatorOpen && simulatorTab === 'simulador' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: simulatorOpen && simulatorTab === 'simulador' ? '1px solid #A855F7' : '1px solid rgba(255, 255, 255, 0.05)',
                    color: simulatorOpen && simulatorTab === 'simulador' ? '#C084FC' : '#8C8C8C',
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="Simular mensajes de clientes en tiempo real"
                >
                  <span>Simulador Cliente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (simulatorOpen && (simulatorTab === 'entrenamiento' || simulatorTab === 'memoria')) {
                      setSimulatorOpen(false);
                    } else {
                      setSimulatorTab('entrenamiento');
                      setSimulatorOpen(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background:
                      isTrainingMode || (simulatorOpen && (simulatorTab === 'entrenamiento' || simulatorTab === 'memoria'))
                        ? 'rgba(16, 185, 129, 0.16)'
                        : 'rgba(255, 255, 255, 0.03)',
                    border:
                      isTrainingMode || (simulatorOpen && (simulatorTab === 'entrenamiento' || simulatorTab === 'memoria'))
                        ? '1px solid rgba(16, 185, 129, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                    color:
                      isTrainingMode || (simulatorOpen && (simulatorTab === 'entrenamiento' || simulatorTab === 'memoria'))
                        ? '#34D399'
                        : '#8C8C8C',
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="Entrenar a Fidel y gestionar sus reglas aprendidas"
                >
                  <span>{isTrainingMode ? 'Entrenamiento Activo' : 'Modo Entrenamiento'}</span>
                </button>

                {userRole === 'ORG_ADMIN' && (
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#8C8C8C', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
                  >
                    {selectedConv?.assignedToUserId ? 'Reasignar' : 'Asignar'}
                  </button>
                )}
                <button 
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  style={{ 
                    background: detailsOpen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', 
                    border: detailsOpen ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.05)', 
                    color: detailsOpen ? '#EF4444' : '#8C8C8C', 
                    padding: '0.6rem 1.2rem', 
                    borderRadius: '10px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    transition: 'all 0.2s' 
                  }}
                >
                  VER DETALLES
                </button>
              </div>
            </header>

            {/* Mensajes */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
              className="custom-scrollbar"
            >
              {loadingMessages ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#040404', zIndex: 5 }}>
                   <div className="pulse-heartbeat">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="#EF4444">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', fontWeight: 900, color: '#222', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Sincronizando Conversación</p>
                </div>
              ) : (
                <>
                  {loadingMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
                      <Spinner size={18} />
                    </div>
                  )}
                  {messages.map((m, index) => {
                    const previousMessage = messages[index - 1];
                    const startsNewDay = !previousMessage || !isSameLocalDay(m.timestamp, previousMessage.timestamp);
                    const isAgent = !m.fromUser;
                    const hasMedia = !!m.mediaUrl;
                    const isImage = m.type === 'IMAGE';
                    const isVideo = m.type === 'VIDEO';
                    const isAudio = m.type === 'AUDIO';
                    const isDocument = m.type === 'DOCUMENT';
                    const isSticker = isImage && m.mimeType?.toLowerCase() === 'image/webp';
                    // WhatsApp le da a los mensajes con foto/video y anuncios un ancho de "tarjeta" fijo
                    // (el contenido se adapta a ese ancho), a diferencia del texto que se ajusta
                    // libremente al contenido. Sin esto, un video o anuncio se estira demasiado horizontalmente.
                    const isMediaCard = ((isImage || isVideo) && !isSticker) || !!m.referral;

                    return (
                      <Fragment key={m.id}>
                        {startsNewDay && (
                          <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.7rem', color: '#444', fontWeight: 700, textTransform: 'uppercase' }}>
                            {dayLabel(m.timestamp)}
                          </div>
                        )}
                        <div id={`msg-${m.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: isAgent ? 'flex-end' : 'flex-start', maxWidth: '75%', width: isMediaCard ? 'min(320px, 100%)' : undefined, alignSelf: isAgent ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          width: isMediaCard ? '100%' : undefined,
                          padding: (isImage || isVideo) && !m.text ? '0' : '1rem 1.25rem',
                          borderRadius: isAgent ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                          background: isSticker
                            ? 'transparent'
                            : (isImage || isVideo) && !m.text
                              ? 'transparent'
                              : isAgent
                                ? (m.fromAi ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'linear-gradient(135deg, #EF4444 0%, #991B1B 100%)')
                                : '#1A1A1A',
                          color: 'white',
                          fontSize: '0.95rem',
                          lineHeight: '1.5',
                          boxShadow: isSticker || ((isImage || isVideo) && !m.text) ? 'none' : isAgent ? (m.fromAi ? '0 10px 25px rgba(2, 132, 199, 0.25)' : '0 10px 25px rgba(239, 68, 68, 0.15)') : 'none',
                          border: isSticker || ((isImage || isVideo) && !m.text) ? 'none' : isAgent ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          overflow: 'hidden'
                        }}>
                          {m.referral && (
                            <div
                              style={{
                                background: 'rgba(0,0,0,0.35)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderLeft: '4px solid #EF4444',
                                borderRadius: '10px',
                                padding: '0.65rem 0.85rem',
                                marginBottom: '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#EF4444', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  <MegaphoneIcon style={{ width: '0.8rem', height: '0.8rem' }} />
                                  <span>
                                    {m.referral.source_url?.toLowerCase().includes('instagram') ? 'Anuncio de Instagram' : 'Anuncio de Facebook'}
                                  </span>
                                </div>
                                {getAdUrl(m.referral) && (
                                  <a
                                    href={getAdUrl(m.referral)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      fontSize: '0.68rem',
                                      color: 'rgba(255,255,255,0.75)',
                                      textDecoration: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      background: 'rgba(255,255,255,0.08)',
                                      padding: '0.2rem 0.45rem',
                                      borderRadius: '6px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <span>Ver anuncio</span>
                                    <svg style={{ width: '0.65rem', height: '0.65rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      <polyline points="15 3 21 3 21 9" />
                                      <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                              {(m.referral.image_url || m.referral.thumbnail_url || m.referral.video_url) && (
                                <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '160px', marginTop: '0.2rem' }}>
                                  <img
                                    src={m.referral.image_url || m.referral.thumbnail_url || m.referral.video_url}
                                    alt={m.referral.headline || "Anuncio"}
                                    style={{ width: '100%', height: 'auto', maxHeight: '160px', objectFit: 'cover', display: 'block' }}
                                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                                  />
                                </div>
                              )}
                              {(() => {
                                const welcomeText = typeof m.referral.welcome_message === 'string'
                                  ? m.referral.welcome_message
                                  : m.referral.welcome_message?.text;
                                return welcomeText ? (
                                  <div style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    padding: '0.45rem 0.65rem',
                                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                                  }}>
                                    <div style={{ fontSize: '0.65rem', color: '#EF4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                                      Saludo automático
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.95)', lineHeight: '1.4' }}>
                                      {welcomeText}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                              {m.referral.headline && (
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white', lineHeight: '1.3' }}>
                                  {m.referral.headline}
                                </div>
                              )}
                              {m.referral.body && (
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.72)', lineHeight: '1.35' }}>
                                  {m.referral.body}
                                </div>
                              )}
                            </div>
                          )}
                          {m.replyTo && (
                            <div
                              onClick={() => document.getElementById(`msg-${m.replyTo!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                              style={{
                                display: 'flex', flexDirection: 'column', gap: '0.15rem',
                                background: 'rgba(0,0,0,0.18)', borderLeft: '3px solid rgba(255,255,255,0.6)',
                                borderRadius: '8px', padding: '0.4rem 0.6rem', marginBottom: '0.6rem', cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)' }}>
                                {m.replyTo.fromUser ? (selectedConv?.name || 'Contacto') : 'Tú'}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.replyTo.text || (m.replyTo.type && m.replyTo.type !== 'TEXT' ? `📎 ${m.replyTo.type}` : '')}
                              </span>
                            </div>
                          )}
                          {!m.replyTo && m.isReply && (
                            <div
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                background: 'rgba(0,0,0,0.18)', borderLeft: '3px solid rgba(255,255,255,0.35)',
                                borderRadius: '8px', padding: '0.4rem 0.6rem', marginBottom: '0.6rem',
                              }}
                            >
                              <ReplyIcon style={{ width: '0.7rem', height: '0.7rem', color: 'rgba(255,255,255,0.5)' }} />
                              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                Respondiendo a un mensaje no disponible
                              </span>
                            </div>
                          )}
                          {hasMedia && (
                            <div style={{ marginBottom: m.text ? '0.75rem' : '0' }}>
                              {isImage && (
                                <img
                                  src={m.mediaUrl!}
                                  alt={m.fileName || "Imagen"}
                                  onClick={() => setLightboxUrl(m.mediaUrl!)}
                                  style={isSticker ? {
                                    maxWidth: '120px',
                                    maxHeight: '120px',
                                    borderRadius: '0',
                                    display: 'block',
                                    objectFit: 'contain',
                                    cursor: 'zoom-in'
                                  } : {
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '420px',
                                    borderRadius: '16px',
                                    display: 'block',
                                    objectFit: 'cover',
                                    cursor: 'zoom-in'
                                  }}
                                />
                              )}
                              {isVideo && (
                                <video
                                  src={m.mediaUrl!}
                                  controls
                                  style={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '420px',
                                    borderRadius: '16px',
                                    display: 'block',
                                    objectFit: 'cover',
                                  }}
                                />
                              )}
                              {isAudio && (
                                <AudioPlayer src={m.mediaUrl!} isAgent={isAgent} />
                              )}
                              {isDocument && (
                                <a 
                                  href={`${m.mediaUrl!}${m.mediaUrl!.includes('?') ? '&' : '?'}download=${encodeURIComponent(m.fileName || 'documento')}`}
                                  download={m.fileName || 'documento'}
                                  rel="noopener noreferrer" 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.75rem', 
                                    color: isAgent ? '#FFF' : '#EF4444', 
                                    textDecoration: 'none', 
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                  }}
                                >
                                  <svg style={{ width: '1.5rem', height: '1.5rem', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                  <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.fileName || "Descargar documento"}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}
                          {isAgent && m.fromAi && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.45rem', fontSize: '0.68rem', fontWeight: 800, color: '#BAE6FD', background: 'rgba(0,0,0,0.25)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              <span>Fidel (IA de Ventas)</span>
                            </div>
                          )}
                          {m.text && <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</div>}
                          {(m as any).isEdited && <div style={{ fontSize: '0.6rem', color: '#888', fontStyle: 'italic', marginTop: '0.2rem' }}>✏️ Editado</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
                          {isAgent && m.status === 'SENDING' && (
                            <span className={styles.rotateSpinner} style={{ display: 'inline-flex', marginRight: '0.15rem' }}>
                              <svg style={{ width: '0.65rem', height: '0.65rem', color: '#888' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" />
                                <path style={{ opacity: 0.85 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setReplyTarget(m)}
                            title="Responder"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', color: '#555' }}
                          >
                            <ReplyIcon style={{ width: '0.8rem', height: '0.8rem' }} />
                          </button>
                          <span style={{ fontSize: '0.65rem', color: '#444', fontWeight: 700 }}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isAgent && renderStatus(m.status)}
                        </div>
                        </div>
                      </Fragment>
                    );
                  })}
                </>
              )}
              {typingHint && (
                <div style={{ alignSelf: 'flex-start', color: '#EF4444', fontSize: '0.75rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="typing-dot"></div>
                  {typingHint}
                </div>
              )}
            </div>

            {/* Footer de Entrada */}
            <footer style={{ padding: '1.5rem 2rem', background: '#040404' }}>
              {selectedFile && (
                <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                      <svg style={{ width: '1.8rem', height: '1.8rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: '0.8rem', color: '#8C8C8C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                  <button onClick={clearFileSelection} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#8C8C8C', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.7rem' }}>Cancelar</button>
                  <button onClick={handleSendFile} disabled={uploading} style={{ background: '#EF4444', border: 'none', borderRadius: '10px', color: 'white', padding: '0.5rem 1.2rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {uploading ? <Spinner size={12} /> : null}
                    {uploading ? 'Subiendo...' : 'Enviar'}
                  </button>
                </div>
              )}
              {replyTarget && (
                <div style={{ marginBottom: '0.75rem', padding: '0.6rem 1rem', background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '3px solid #EF4444', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#EF4444' }}>
                      Respondiendo a {replyTarget.fromUser ? (selectedConv?.name || 'Contacto') : 'ti'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#8C8C8C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyTarget.text || (replyTarget.type && replyTarget.type !== 'TEXT' ? `📎 ${replyTarget.type}` : '')}
                    </div>
                  </div>
                  <button onClick={() => setReplyTarget(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#8C8C8C', padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
                </div>
              )}
              <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '0.5rem', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '0.75rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }} 
                  title="Adjuntar"
                  disabled={!canSend}
                >
                  <PaperclipIcon />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  style={{ display: 'none' }} 
                />
                <textarea 
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={canSend ? "Escribe un mensaje..." : "Ventana de 24h cerrada..."}
                  disabled={!canSend}
                  style={{ flex: 1, background: 'none', border: 'none', padding: '0.75rem 0', color: 'white', outline: 'none', fontSize: '0.95rem', resize: 'none', maxHeight: '150px' }}
                />
                <div style={{ display: 'flex', gap: '0.4rem', padding: '0.25rem' }}>
                  <button 
                    onClick={handleGenerateReply}
                    disabled={generating || !canSend}
                    style={{ padding: '0.75rem', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', cursor: 'pointer', transition: 'all 0.2s', gap: '0.5rem' }}
                    title="Asistente IA"
                  >
                    {generating ? <Spinner /> : <SparklesIcon />}
                  </button>
                  <button 
                    onClick={handleSend}
                    disabled={sending || !canSend || !replyInput.trim()}
                    style={{ 
                      width: '46px', 
                      height: '46px', 
                      borderRadius: '14px', 
                      background: canSend && replyInput.trim() ? '#EF4444' : '#1A1A1A', 
                      color: 'white', 
                      border: 'none', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: canSend && replyInput.trim() ? '0 8px 20px rgba(239, 68, 68, 0.3)' : 'none',
                      gap: '0.5rem'
                    }}
                  >
                    {sending ? <Spinner /> : <SendIcon />}
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
            <Image src="/assets/images/NOIRLINE2.png" alt="Nextline" width={120} height={120} style={{ filter: 'grayscale(1)', marginBottom: '2rem' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Selecciona una conversación</p>
          </div>
        )}
      </main>

      {/* ── Sidebar: Simulador y Modo Entrenamiento de Fidel ── */}
      {simulatorOpen && selectedConv && (
        <aside className="custom-scrollbar" style={{
          width: '390px',
          minWidth: '340px',
          flexShrink: 0,
          background: '#0B0F19',
          borderLeft: simulatorTab === 'simulador' ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          zIndex: 15,
          padding: '1.25rem',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: '#F8FAFC' }}>
                {simulatorTab === 'simulador'
                  ? 'Simulador Cliente'
                  : simulatorTab === 'entrenamiento'
                  ? 'Modo Entrenamiento'
                  : 'Memoria de Fidel'}
              </h3>
              <span style={{ fontSize: '0.65rem', color: simulatorTab === 'simulador' ? '#A855F7' : '#34D399', fontWeight: 700 }}>
                {simulatorTab === 'simulador'
                  ? 'Ambiente de Pruebas'
                  : simulatorTab === 'entrenamiento'
                  ? 'Roleplay y Correcciones en Vivo'
                  : `${fidelRules.filter(r => r.isActive).length} Reglas Activas`}
              </span>
            </div>
            <button 
              onClick={() => setSimulatorOpen(false)}
              style={{ background: 'none', border: 'none', color: '#8C8C8C', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', padding: '0.3rem', borderRadius: '12px', marginBottom: '1.1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'simulador', label: 'Simulador' },
              { id: 'entrenamiento', label: 'Entrenar' },
              { id: 'memoria', label: `Memoria (${fidelRules.filter(r => r.isActive).length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSimulatorTab(t.id as any)}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background:
                    simulatorTab === t.id
                      ? t.id === 'simulador'
                        ? 'rgba(168, 85, 247, 0.25)'
                        : 'rgba(16, 185, 129, 0.22)'
                      : 'transparent',
                  color:
                    simulatorTab === t.id
                      ? t.id === 'simulador'
                        ? '#E9D5FF'
                        : '#6EE7B7'
                      : '#8C8C8C',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: SIMULADOR CLIENTE ── */}
          {simulatorTab === 'simulador' && (
            <>
              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '14px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#D8B4FE', lineHeight: '1.4' }}>
                  Envía mensajes fingiendo ser el cliente <strong>{selectedConv.name || selectedConv.phone}</strong>. Fidel responderá en este chat aplicando su base comercial y las reglas aprendidas.
                </p>
                {isTrainingMode && (
                  <div style={{ marginTop: '0.55rem', paddingTop: '0.55rem', borderTop: '1px solid rgba(168, 85, 247, 0.2)', fontSize: '0.7rem', color: '#34D399', fontWeight: 700 }}>
                    Modo Entrenamiento activo en este chat: también puedes enviar correcciones como Entrenador desde aquí.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.1rem' }}>
                <span style={{ fontSize: '0.68rem', color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Preguntas Frecuentes Rápidas:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[
                    'Hola, quiero información del programa de AWS',
                    '¿Cuánto cuesta y qué incluye el precio?',
                    '¿Cuándo inicia el curso de IA Practitioner?',
                    'Somos un grupo de 5 personas de mi empresa, ¿hay descuento?',
                    '¿El examen de certificación oficial está incluido?',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={simSending}
                      onClick={() => handleSimulateClientMessage(preset)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '0.55rem 0.75rem',
                        textAlign: 'left',
                        color: '#E2E8F0',
                        fontSize: '0.74rem',
                        cursor: simSending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.68rem', color: '#888', fontWeight: 800, textTransform: 'uppercase' }}>
                  O escribe tu propio mensaje:
                </label>
                <textarea
                  value={simText}
                  onChange={e => setSimText(e.target.value)}
                  placeholder="Ej: ¿Qué horarios tienen los sábados?"
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#040404',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    color: '#FFF',
                    fontSize: '0.8rem',
                    resize: 'none',
                    outline: 'none',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSimulateClientMessage();
                    }
                  }}
                />

                <button
                  type="button"
                  disabled={simSending || !simText.trim()}
                  onClick={() => handleSimulateClientMessage()}
                  style={{
                    background: simSending || !simText.trim() ? '#4C1D95' : 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: simSending || !simText.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.25)',
                  }}
                >
                  {simSending ? (
                    <>
                      <Spinner size={14} />
                      <span>Enviando como cliente...</span>
                    </>
                  ) : (
                    <span>Enviar como Cliente</span>
                  )}
                </button>

                {simNotice && (
                  <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#A78BFA', marginTop: '0.25rem', fontWeight: 600 }}>
                    {simNotice}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TAB 2: MODO ENTRENAMIENTO (COACH / ROLEPLAY) ── */}
          {simulatorTab === 'entrenamiento' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.85rem' }}>
              {/* Toggle para activar entrenamiento directamente en el chat actual */}
              <div style={{
                background: isTrainingMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                border: isTrainingMode ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isTrainingMode ? '#34D399' : '#E2E8F0' }}>
                    Entrenar en el chat de {selectedConv.name || selectedConv.phone}
                  </span>
                  <button
                    type="button"
                    disabled={togglingTraining}
                    onClick={handleToggleTrainingMode}
                    style={{
                      background: isTrainingMode ? '#10B981' : 'rgba(255,255,255,0.08)',
                      color: isTrainingMode ? '#042F2E' : '#CBD5E1',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {isTrainingMode ? 'Activo' : 'Activar'}
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#94A3B8', lineHeight: '1.35' }}>
                  {isTrainingMode
                    ? 'Fidel escuchará tus correcciones de entrenador directamente en los mensajes entrantes de este chat (WhatsApp o Simulador).'
                    : 'Actívalo si deseas entrenar a Fidel enviando mensajes desde tu WhatsApp o el Simulador en esta conversación.'}
                </p>
              </div>

              {/* Sandbox de Entrenamiento en el Panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>
                  Sala de Entrenamiento Rápido:
                </span>
                {sandboxHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSandboxHistory([])}
                    style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.66rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Limpiar sesión
                  </button>
                )}
              </div>

              {/* Mensajes de la sesión de entrenamiento */}
              <div className="custom-scrollbar" style={{
                flex: 1,
                minHeight: '210px',
                maxHeight: '320px',
                overflowY: 'auto',
                background: '#05070B',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}>
                {sandboxHistory.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#64748B', fontSize: '0.72rem' }}>
                    <p style={{ margin: 0, lineHeight: '1.4', color: '#94A3B8' }}>
                      Habla con Fidel fingiendo ser un cliente y corrígelo en cualquier momento. Ejemplo:
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendSandboxTraining('Hola Fidel, voy a fingir que soy un cliente y te iré corrigiendo o mejorando las respuestas para que lo tengas en cuenta.')}
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.65rem',
                        color: '#6EE7B7',
                        fontSize: '0.7rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      Iniciar: &quot;Hola Fidel, voy a fingir que soy un cliente y te iré corrigiendo...&quot;
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendSandboxTraining('Hola, quiero información de las certificaciones de AWS y precios')}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.65rem',
                        color: '#CBD5E1',
                        fontSize: '0.7rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      Probar como cliente: &quot;Hola, quiero información de AWS y precios&quot;
                    </button>
                  </div>
                ) : (
                  sandboxHistory.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: item.role === 'trainer' ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        background:
                          item.role === 'trainer'
                            ? 'rgba(16, 185, 129, 0.18)'
                            : item.mode === 'CORRECTION'
                            ? 'rgba(56, 189, 248, 0.15)'
                            : 'rgba(255,255,255,0.06)',
                        border:
                          item.role === 'trainer'
                            ? '1px solid rgba(16, 185, 129, 0.35)'
                            : item.mode === 'CORRECTION'
                            ? '1px solid rgba(56, 189, 248, 0.4)'
                            : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '0.55rem 0.7rem',
                        fontSize: '0.74rem',
                        color: '#F1F5F9',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.4',
                      }}
                    >
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, marginBottom: '0.2rem', color: item.role === 'trainer' ? '#34D399' : '#38BDF8', textTransform: 'uppercase' }}>
                        {item.role === 'trainer' ? 'Entrenador / Cliente' : item.mode === 'CORRECTION' ? 'Fidel (Regla Guardada)' : 'Fidel'}
                      </div>
                      {item.text}
                    </div>
                  ))
                )}
              </div>

              {/* Input de entrenamiento */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <textarea
                  value={sandboxInput}
                  onChange={e => setSandboxInput(e.target.value)}
                  placeholder='Escribe como cliente o corrige a Fidel (ej: "Entrenador: usa menos emojis y cierra con otra pregunta")'
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#040404',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    padding: '0.7rem',
                    color: '#FFF',
                    fontSize: '0.78rem',
                    resize: 'none',
                    outline: 'none',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendSandboxTraining();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={sandboxSending || !sandboxInput.trim()}
                  onClick={() => handleSendSandboxTraining()}
                  style={{
                    background: sandboxSending || !sandboxInput.trim() ? '#064E3B' : '#10B981',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.7rem',
                    color: sandboxSending || !sandboxInput.trim() ? '#A7F3D0' : '#042F2E',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: sandboxSending || !sandboxInput.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {sandboxSending ? (
                    <>
                      <Spinner size={14} />
                      <span>Procesando con Fidel...</span>
                    </>
                  ) : (
                    <span>Enviar a Fidel</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 3: MEMORIA DE REGLAS APRENDIDAS ── */}
          {simulatorTab === 'memoria' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '0.85rem' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '0.7rem 0.85rem', fontSize: '0.72rem', color: '#BAE6FD', lineHeight: '1.35' }}>
                Estas son las reglas y correcciones que Fidel ha guardado en su memoria permanente. Se aplican con prioridad máxima en todas las conversaciones.
              </div>

              {/* Formulario para agregar regla directa */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.7rem' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Agregar directriz manual:
                </span>
                <textarea
                  value={newRuleInput}
                  onChange={e => setNewRuleInput(e.target.value)}
                  placeholder="Ej: No usar más de 1 emoji por mensaje y preguntar siempre si busca curso para él o para su empresa."
                  rows={2}
                  style={{
                    width: '100%',
                    background: '#040404',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.55rem',
                    color: '#FFF',
                    fontSize: '0.74rem',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select
                    value={newRuleCategory}
                    onChange={e => setNewRuleCategory(e.target.value)}
                    style={{
                      background: '#040404',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#CBD5E1',
                      fontSize: '0.7rem',
                      padding: '0.4rem 0.5rem',
                      outline: 'none',
                    }}
                  >
                    <option value="ESTILO">ESTILO</option>
                    <option value="COMERCIAL">COMERCIAL</option>
                    <option value="OBJECIONES">OBJECIONES</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                  <button
                    type="button"
                    disabled={addingRule || !newRuleInput.trim()}
                    onClick={handleAddManualRule}
                    style={{
                      flex: 1,
                      background: addingRule || !newRuleInput.trim() ? 'rgba(255,255,255,0.06)' : '#10B981',
                      color: addingRule || !newRuleInput.trim() ? '#64748B' : '#042F2E',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.45rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: addingRule || !newRuleInput.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {addingRule ? 'Guardando...' : 'Guardar Regla'}
                  </button>
                </div>
              </div>

              {/* Lista de reglas */}
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {fidelRules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B', fontSize: '0.74rem' }}>
                    Aún no hay reglas entrenadas en memoria. Usa la pestaña Entrenar o agrega una directriz arriba.
                  </div>
                ) : (
                  fidelRules.map(rule => (
                    <div
                      key={rule.id}
                      style={{
                        background: rule.isActive ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                        border: rule.isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.75rem',
                        opacity: rule.isActive ? 1 : 0.55,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#34D399', background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          {rule.category}
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                            style={{
                              background: 'none',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '6px',
                              color: rule.isActive ? '#E2E8F0' : '#94A3B8',
                              fontSize: '0.62rem',
                              padding: '0.15rem 0.45rem',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            {rule.isActive ? 'Activa' : 'Pausada'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              color: '#F87171',
                              fontSize: '0.62rem',
                              padding: '0.15rem 0.45rem',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#F1F5F9', lineHeight: '1.35' }}>
                        {rule.instruction}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ── Sidebar: Detalles de Contacto ── */}
      {detailsOpen && selectedConv && (
        <>
          <div className={styles.detailsBackdrop} onClick={() => setDetailsOpen(false)} />
          <aside className={`${styles.detailsSidebar} custom-scrollbar`} style={{
            width: '340px',
            minWidth: '300px',
            flexShrink: 0,
            background: '#0d0d0d',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            zIndex: 15,
            padding: '1.5rem',
            animation: 'slideInRight 0.3s ease-out',
          }} onScroll={handleDetailsScroll}>
          {/* Cabecera */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: '#EF4444' }}>
              Detalles
            </h3>
            <button 
              onClick={() => setDetailsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#8C8C8C', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
            >
              ✕
            </button>
          </div>

          {/* Información del Perfil */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem', gap: '0.75rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
              <PersonIcon style={{ width: '2.5rem', height: '2.5rem' }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 800 }}>
                {selectedConv.name || 'Sin Nombre'}
              </h4>
              <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600, display: 'block', marginBottom: '0.1rem' }}>
                {formatPhoneDisplay(selectedConv.phone)}
              </span>
              {selectedConv.email && (
                <span style={{ fontSize: '0.75rem', color: '#8C8C8C', fontWeight: 500, display: 'block' }}>
                  {selectedConv.email}
                </span>
              )}
              {selectedConv.tag && (
                <span style={{ fontSize: '0.75rem', color: '#8C8C8C', fontWeight: 500, display: 'block' }}>
                  {selectedConv.tag}
                </span>
              )}
            </div>
          </div>

          {/* Anuncio de origen (CTWA) si el lead provino de pauta publicitaria */}
          {(() => {
            const ad = (selectedConv as any).adReferral || messages.find(m => m.referral)?.referral;
            if (!ad) return null;
            return (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderLeft: '4px solid #EF4444',
                borderRadius: '12px',
                padding: '0.85rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#EF4444', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <MegaphoneIcon style={{ width: '0.85rem', height: '0.85rem' }} />
                    <span>Origen: {ad.source_url?.toLowerCase().includes('instagram') ? 'Anuncio Instagram' : 'Anuncio Facebook'}</span>
                  </div>
                  {getAdUrl(ad) && (
                    <a
                      href={getAdUrl(ad)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.7rem', color: '#EF4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}
                    >
                      Ver anuncio ↗
                    </a>
                  )}
                </div>
                {(ad.image_url || ad.thumbnail_url || ad.video_url) && (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', maxHeight: '120px', marginTop: '0.2rem' }}>
                    <img
                      src={ad.image_url || ad.thumbnail_url || ad.video_url}
                      alt={ad.headline || "Anuncio"}
                      style={{ width: '100%', height: 'auto', maxHeight: '120px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                {(() => {
                  const welcomeText = typeof ad.welcome_message === 'string'
                    ? ad.welcome_message
                    : ad.welcome_message?.text;
                  return welcomeText ? (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.6rem',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      fontSize: '0.78rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      lineHeight: '1.35',
                    }}>
                      <div style={{ fontSize: '0.62rem', color: '#EF4444', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                        Saludo automático
                      </div>
                      {welcomeText}
                    </div>
                  ) : null;
                })()}
                {ad.headline && (
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'white', lineHeight: '1.3' }}>
                    {ad.headline}
                  </div>
                )}
                {ad.body && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.35', maxHeight: '90px', overflowY: 'auto' }}>
                    {ad.body}
                  </div>
                )}
                {ad.source_id && (
                  <div style={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                    ID: {ad.source_id}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Formulario de Edición */}
          <form onSubmit={handleUpdateContact} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nombre
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del contacto"
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email del contacto"
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Etiqueta
              </label>
              <TagPicker tags={tags} value={editTagId} onChange={setEditTagId} />
            </div>

            {isSandbox && (
              <div style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '14px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#EF4444', display: 'block', marginBottom: '0.2rem' }}>
                    Sandbox
                  </span>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#666', lineHeight: '1.3' }}>
                    Permitir mensajería en pruebas.
                  </p>
                </div>
                <div 
                  onClick={() => setEditSandbox(!editSandbox)}
                  style={{ 
                    width: '42px', height: '22px', borderRadius: '11px', background: editSandbox ? '#EF4444' : '#1A1A1A', position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'white', position: 'absolute', top: '4px', left: editSandbox ? '24px' : '4px', transition: 'all 0.3s' }}></div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={updatingContact}
              style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 5px 15px rgba(239, 68, 68, 0.2)', opacity: updatingContact ? 0.6 : 1 }}
            >
              {updatingContact ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>

          {/* Galería de archivos multimedia compartidos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Archivos y Multimedia
            </label>
            {loadingGallery ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <Spinner />
              </div>
            ) : gallery.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', margin: 0 }}>
                No hay archivos compartidos.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {gallery.map(g => {
                  if (g.type === 'IMAGE' && g.mediaUrl) {
                    return (
                      <div 
                        key={g.id} 
                        onClick={() => setLightboxUrl(g.mediaUrl!)}
                        style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)', cursor: 'zoom-in' }}
                      >
                        <img src={g.mediaUrl} alt="galería" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    );
                  } else if (g.type === 'VIDEO' && g.mediaUrl) {
                    return (
                      <div key={g.id} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <video src={g.mediaUrl} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    );
                  } else if (g.mediaUrl) {
                    return (
                      <a 
                        key={g.id} 
                        href={g.mediaUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title={g.fileName || 'Archivo'}
                        style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: '#EF4444', textDecoration: 'none', padding: '0.25rem' }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: '0.65rem', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8C8C8C' }}>
                          {g.fileName || 'Doc'}
                        </span>
                      </a>
                    );
                  }
                  return null;
                })}
              </div>
            )}
            {loadingMoreGallery && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0' }}>
                <Spinner size={18} />
              </div>
            )}
          </div>
        </aside>
        </>
      )}

      {/* Lightbox / Fullscreen Image Preview */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 4, 4, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
            backdropFilter: 'blur(10px)',
          }}
        >
          <img 
            src={lightboxUrl} 
            alt="Vista Previa" 
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              animation: 'fadeIn 0.2s ease-out'
            }} 
          />
        </div>
      )}

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

        @keyframes typing {
          0% { opacity: .2; }
          20% { opacity: 1; }
          100% { opacity: .2; }
        }
        .typing-dot {
          width: 4px; height: 4px; border-radius: 50%; background: #EF4444;
          animation: typing 1.4s infinite both;
        }

        .mobile-sidebar-toggle {
          display: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: #8C8C8C;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .mobile-sidebar-toggle:hover {
          background: rgba(255,255,255,0.08);
          color: #F2F2F2;
        }
        @media (max-width: 768px) {
          .mobile-sidebar-toggle { display: flex; }
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Modal de asignación */}
      {assignModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}
          onClick={() => { setAssignModalOpen(false); setAssignSearch(''); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '1.5rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#F2F2F2', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seleccionar agente</h2>
              <button onClick={() => { setAssignModalOpen(false); setAssignSearch(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#8C8C8C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ padding: '1rem 1.5rem', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#444', width: '1rem', height: '1rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  autoFocus
                  style={{ width: '100%', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '0.85rem 1rem 0.85rem 3rem', color: '#F2F2F2', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.5rem 1.5rem' }}>
              <button
                onClick={() => handleAssign(null)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid transparent', borderRadius: '16px', color: '#666', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', marginBottom: '0.25rem' }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                  <svg style={{ width: '1.1rem', height: '1.1rem' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <span>Sin asignar</span>
              </button>
              {filteredUsers.map(u => {
                const isCurrent = selectedConv?.assignedToUserId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleAssign(u.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: isCurrent ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)', border: isCurrent ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent', borderRadius: '16px', cursor: 'pointer', textAlign: 'left', marginBottom: '0.25rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isCurrent ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrent ? '#EF4444' : '#444' }}>
                      <svg style={{ width: '1.1rem', height: '1.1rem' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '0.9rem', color: '#F2F2F2', fontWeight: 600 }}>{u.displayName || 'Sin Nombre'}</span>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>{u.email}</span>
                    </div>
                    {isCurrent && <span style={{ fontSize: '0.9rem', color: '#EF4444', fontWeight: 800 }}>✓</span>}
                  </button>
                );
              })}
              {filteredUsers.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>No se encontraron agentes.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
