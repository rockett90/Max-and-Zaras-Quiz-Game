/** Case- and accent-insensitive, whitespace-collapsed form of a string (REQ-ANS-001). */
export function normaliseAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
