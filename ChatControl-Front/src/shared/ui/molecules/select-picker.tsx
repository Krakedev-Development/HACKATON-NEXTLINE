'use client';

import { useEffect, useRef, useState } from 'react';

function ChevronDownIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.1rem', height: '1.1rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectPickerProps {
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Reemplazo de <select> nativo: el popup de opciones de un <select> lo pinta el SO/navegador
 * y en la práctica no se puede re-estilar de forma consistente entre navegadores.
 */
export function SelectPicker({ id, options, value, onChange, placeholder = 'Seleccionar...' }: SelectPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number | null; bottom: number | null; left: number; width: number; maxHeight: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
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
      const maxHeight = Math.max(160, Math.min(300, openUpward ? spaceAbove : spaceBelow));
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
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleScroll(e: Event) {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      setOpen(false);
    }
    function handleResize() {
      setOpen(false);
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
    <div ref={ref} id={id} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleDropdown}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(64,64,64,0.3)',
          borderRadius: 10,
          padding: '0.85rem 1rem',
          color: selected ? '#F2F2F2' : '#666',
          fontSize: '0.95rem',
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          textAlign: 'left',
          transition: 'border-color 0.2s ease',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
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
          background: '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflowY: 'auto',
        }} className="custom-scrollbar">
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                style={{
                  width: '100%', display: 'block', textAlign: 'left', padding: '0.75rem 1rem', border: 'none',
                  background: isSelected ? 'rgba(239,68,68,0.1)' : 'transparent', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#EF4444' : '#F2F2F2',
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
