import { urlBase64ToUint8Array } from './push-client';

describe('urlBase64ToUint8Array', () => {
  it('decodes a known VAPID-style base64url string to a Uint8Array', () => {
    const result = urlBase64ToUint8Array('BNbXq7-l-_2KhSjt-K7m9w');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles strings that need padding', () => {
    expect(() => urlBase64ToUint8Array('abc')).not.toThrow();
  });
});
