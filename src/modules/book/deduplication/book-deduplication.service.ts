import { Book } from 'src/modules/book/book.model';

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeTitle(value: string): string {
  return normalize(value)
    .replace(/\(([^)]*)\)|\[([^\]]*)\]|\{([^}]*)\}/g, ' ')
    .replace(/[:;,_./\\-]+/g, ' ')
    .replace(/\b(a|an|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAuthor(value: string): string {
  return normalize(value)
    .replace(/[.,/\\-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

function titlesLikelyMatch(a: string, b: string): boolean {
  const normalizedA = normalizeTitle(a);
  const normalizedB = normalizeTitle(b);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA === normalizedB || normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

function authorsLikelyMatch(a: string, b: string): boolean {
  const normalizedA = normalizeAuthor(a);
  const normalizedB = normalizeAuthor(b);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA === normalizedB || normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

/**
 * Determines whether two books should be considered metadata-identical.
 * Uses ISBN comparison when both books have an ISBN; otherwise falls back
 * to a normalized title + author comparison.
 */
export function metadataMatches(a: Book, b: { title: string; author: string; isbn?: string }): boolean {
  if (a.isbn && b.isbn) {
    return normalize(a.isbn) === normalize(b.isbn);
  }
  return normalize(a.title) === normalize(b.title) && normalize(a.author) === normalize(b.author);
}

export function logicalBookMatches(a: Book, b: { title: string; author: string; isbn?: string }): boolean {
  if (a.isbn && b.isbn) {
    return normalize(a.isbn) === normalize(b.isbn);
  }

  return titlesLikelyMatch(a.title, b.title) && authorsLikelyMatch(a.author, b.author);
}
