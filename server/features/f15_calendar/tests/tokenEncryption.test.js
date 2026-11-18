const { encryptToken, decryptToken } = require('../../../services/tokenEncryption');

describe('Token Encryption Service (AES-256-GCM)', () => {
  test('encrypts and decrypts OAuth token back to original string', () => {
    const originalToken = 'ya29.a0AfH6SMA_mock_google_oauth_access_token_12345';
    const encrypted = encryptToken(originalToken);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  test('throws error on tampered ciphertext or auth tag', () => {
    const originalToken = 'refresh_token_xyz987';
    const encrypted = encryptToken(originalToken);
    const [ivHex, tagHex, cipherHex] = encrypted.split(':');

    // Tamper the ciphertext
    const tamperedCipher = cipherHex.slice(0, -2) + (cipherHex.slice(-2) === 'aa' ? 'bb' : 'aa');
    const tampered = `${ivHex}:${tagHex}:${tamperedCipher}`;

    expect(() => decryptToken(tampered)).toThrow();
  });

  test('handles empty or null gracefully', () => {
    expect(encryptToken('')).toBe('');
    expect(decryptToken('')).toBe('');
  });
});
