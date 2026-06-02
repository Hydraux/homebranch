import { Request } from 'express';

function getForwardedHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (!value) {
    return undefined;
  }

  const firstValue = value
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  return firstValue || undefined;
}

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) {
    return '';
  }

  const trimmedPrefix = prefix.trim();
  if (!trimmedPrefix || trimmedPrefix === '/') {
    return '';
  }

  const withLeadingSlash = trimmedPrefix.startsWith('/') ? trimmedPrefix : `/${trimmedPrefix}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

export function buildExternalBaseUrl(request: Request, options: { includeForwardedPrefix?: boolean } = {}): string {
  const protocol = getForwardedHeaderValue(request.headers['x-forwarded-proto']) ?? request.protocol;
  const host = getForwardedHeaderValue(request.headers['x-forwarded-host']) ?? request.get('host') ?? 'localhost';
  const prefix = options.includeForwardedPrefix
    ? normalizePrefix(getForwardedHeaderValue(request.headers['x-forwarded-prefix']))
    : '';

  return `${protocol}://${host}${prefix}`;
}
