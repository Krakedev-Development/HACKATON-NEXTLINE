'use client';

import { useEffect, useRef, useState } from 'react';
import type { Tag } from '@/shared/api/chatcontrol/client';

const PAGE_SIZE = 20;

function SearchIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1rem', height: '1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ChevronDownIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.2rem', height: '1.2rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface TagPickerProps {
  tags: Tag[];
  value: string | null;
  onChange: (tagId: string | null) => void;
  placeholder?: string;
}

export function TagPicker({ tags, value, onChange, placeholder = 'Sin etiqueta' }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number | null; bottom: number | null; left: number; width: number; maxHeight: number } | null>(null);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const ref = useRef<HTMLDivElement>(null);

  const selectedTag = tags.find((t) => t.id === value);
  const filteredTags = tags.filter((t) => !search.trim() || t.name.toLowerCase().includes(search.trim().toLowerCase()));
  const visibleTags = filteredTags.slice(0, visibleCount);

  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredTags.length));
    }
  }

  function handleSelect(tagId: string | null) {
    onChange(tagId);
    setOpen(false);
    setSearch('');
  }

  function toggleDropdown() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const margin = 16;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(340, openUpward ? spaceAbove : spaceBelow));
      setPos({
        top: openUpward ? null : rect.bottom + 8,
        bottom: openUpward ? window.innerHeight - rect.top + 8 : null,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    }
    setOpen(true);
  }

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    function handleScroll(e: Event) {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) {
        return;
      }
      setOpen(false);
      setSearch('');
    }
    function handleResize() {
      setOpen(false);
      setSearch('');
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleDropdown}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.75rem', color: selectedTag ? 'white' : '#666', outline: 'none', fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedTag ? selectedTag.name : placeholder}
        </span>
        <ChevronDownIcon style={{ color: '#EF4444', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && pos && (
        <div style={{
          position: 'fixed',
          top: pos.top ?? undefined,
          bottom: pos.bottom ?? undefined,
          left: pos.left,
          width: pos.width,
          maxHeight: pos.maxHeight,
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar etiqueta..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.6rem 0.75rem 0.6rem 2.2rem', color: 'white', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar" onScroll={handleListScroll}>
            <button
              type="button"
              onClick={() => handleSelect(null)}
              style={{
                width: '100%', display: 'block', textAlign: 'left', padding: '0.75rem 1rem', border: 'none',
                background: value === null ? 'rgba(239,68,68,0.1)' : 'transparent', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: value === null ? '#EF4444' : '#8C8C8C' }}>Sin etiqueta</div>
            </button>
            {filteredTags.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#444', fontSize: '0.8rem' }}>Sin resultados</div>
            ) : visibleTags.map((t) => {
              const isSelected = t.id === value;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  style={{
                    width: '100%', display: 'block', textAlign: 'left', padding: '0.75rem 1rem', border: 'none',
                    background: isSelected ? 'rgba(239,68,68,0.1)' : 'transparent', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#EF4444' : '#F2F2F2' }}>{t.name}</div>
                </button>
              );
            })}
            {visibleTags.length < filteredTags.length && (
              <div style={{ padding: '0.6rem', textAlign: 'center', color: '#444', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Desplazate para ver más
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
