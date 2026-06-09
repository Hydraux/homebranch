import { Request } from 'express';
import { buildExternalBaseUrl } from 'src/common/utils/external-url';

function createRequest(overrides: Partial<Request> = {}, host = 'localhost:3000'): Request {
  const get = ((headerName: string) => {
    if (headerName.toLowerCase() === 'host') {
      return host;
    }

    return undefined;
  }) as Request['get'];

  return {
    headers: {},
    protocol: 'http',
    get,
    ...overrides,
  } as Request;
}

describe('buildExternalBaseUrl', () => {
  test('prefers forwarded proto, host, and prefix for proxied requests', () => {
    const request = createRequest({
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'homebranch-qa.hydraux-homelab.com',
        'x-forwarded-prefix': '/api',
      },
      protocol: 'http',
    });

    expect(buildExternalBaseUrl(request, { includeForwardedPrefix: true })).toBe(
      'https://homebranch-qa.hydraux-homelab.com/api',
    );
  });

  test('uses the first forwarded value when proxies append multiple entries', () => {
    const request = createRequest({
      headers: {
        'x-forwarded-proto': 'https, http',
        'x-forwarded-host': 'homebranch-qa.hydraux-homelab.com, qa-homebranch.lan',
      },
    });

    expect(buildExternalBaseUrl(request)).toBe('https://homebranch-qa.hydraux-homelab.com');
  });

  test('falls back to request protocol and host when forwarded headers are absent', () => {
    const request = createRequest({ protocol: 'http' }, 'qa-homebranch.lan:3000');

    expect(buildExternalBaseUrl(request, { includeForwardedPrefix: true })).toBe('http://qa-homebranch.lan:3000');
  });
});
