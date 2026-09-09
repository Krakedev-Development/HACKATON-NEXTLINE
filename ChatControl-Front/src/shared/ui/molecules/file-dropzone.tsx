'use client';

import { useRef, useState } from 'react';

function UploadIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: '1.5rem', height: '1.5rem', ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

interface FileDropzoneProps {
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  /** Nombre del tipo de archivo esperado para el texto de ayuda, ej. "video", "imagen". */
  hint?: string;
}

export function FileDropzone({ onFile, accept, disabled, hint }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '2rem 1.5rem', borderRadius: '14px', textAlign: 'center',
        border: `1.5px dashed ${dragOver ? '#EF4444' : 'rgba(255,255,255,0.15)'}`,
        background: dragOver ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <UploadIcon style={{ color: dragOver ? '#EF4444' : '#666' }} />
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: dragOver ? '#EF4444' : '#AAA' }}>
        Arrastrá {hint ? `el ${hint}` : 'el archivo'} aquí o <span style={{ color: '#EF4444', textDecoration: 'underline' }}>hacé clic para seleccionar</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}
