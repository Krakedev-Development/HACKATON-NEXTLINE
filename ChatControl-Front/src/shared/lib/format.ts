/** Formato visual del teléfono: añade "+" al inicio si no lo tiene (solo para mostrar). */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (phone == null || phone === '') return '';
  return phone.startsWith('+') ? phone : `+${phone}`;
}

/**
 * Nombres de plantillas de WhatsApp vienen en snake_case (regla de Meta) y a veces con el
 * idioma pegado entre paréntesis (ej. "becas_generacion_7_krake (es)"). Esto los convierte
 * en algo legible para mostrar en la UI, sin tocar el nombre técnico real usado para enviar.
 */
export function humanizeTemplateName(raw: string): { label: string; language: string | null } {
  const match = raw.match(/^(.*)\s\(([^)]+)\)\s*$/);
  const namePart = match ? match[1] : raw;
  const language = match ? match[2] : null;
  const label = namePart
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return { label: label || raw, language };
}
