import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// The console holds a super admin's token in the browser. The Content Security Policy
// is what stops injected script from running and reading it, so it must stay strict,
// and the page must not need anything it forbids.

const root = path.resolve(__dirname, '..');
const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
const headers: Record<string, string> = Object.fromEntries(
  firebase.hosting.headers.find((h: { source: string }) => h.source === '**').headers.map((h: { key: string; value: string }) => [h.key, h.value]),
);
const csp = headers['Content-Security-Policy'];
const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) || '';

describe('hosting headers', () => {
  it('lets only our own scripts run', () => {
    expect(directive('script-src')).toBe("script-src 'self'");
    expect(csp).not.toMatch(/unsafe-eval/);
  });

  it('cannot be framed, and sends nothing to sites it does not use', () => {
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive('connect-src')).toBe("connect-src 'self' https://api.voltava.in wss://api.voltava.in");
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });
});

describe('index.html', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  it('has no inline script or event handler for the policy to block', () => {
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    const scripts = html.match(/<script\b[^>]*>/gi) || [];
    scripts.forEach((tag) => expect(tag).toMatch(/\bsrc=/));
  });
});
