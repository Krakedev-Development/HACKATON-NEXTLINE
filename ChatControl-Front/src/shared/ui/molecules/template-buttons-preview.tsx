'use client';

import type { BroadcastTemplateButton } from '@/shared/api/chatcontrol/client';

function ReplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function buttonIcon(type: string) {
  switch (type.toUpperCase()) {
    case 'URL':
      return <LinkIcon />;
    case 'PHONE_NUMBER':
      return <PhoneIcon />;
    case 'COPY_CODE':
      return <CopyIcon />;
    default:
      return <ReplyIcon />;
  }
}

function buttonTypeLabel(type: string): string {
  switch (type.toUpperCase()) {
    case 'QUICK_REPLY':
      return 'Respuesta rápida';
    case 'URL':
      return 'Enlace';
    case 'PHONE_NUMBER':
      return 'Llamada';
    case 'COPY_CODE':
      return 'Copiar código';
    case 'FLOW':
      return 'Flujo';
    default:
      return type;
  }
}

export function TemplateButtonsPreview({
  buttons,
  compact = false,
}: {
  buttons: BroadcastTemplateButton[];
  compact?: boolean;
}) {
  if (!buttons.length) return null;

  return (
    <div
      style={{
        marginTop: compact ? '0.85rem' : '1.25rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {buttons.map((btn, i) => (
        <div
          key={`${btn.index}-${btn.text}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: compact ? '0.7rem 0.5rem' : '0.85rem 0.75rem',
            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
            color: '#EF4444',
            fontSize: compact ? '0.82rem' : '0.9rem',
            fontWeight: 700,
            textAlign: 'center',
          }}
          title={buttonTypeLabel(btn.type)}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>{buttonIcon(btn.type)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{btn.text}</span>
        </div>
      ))}
    </div>
  );
}
