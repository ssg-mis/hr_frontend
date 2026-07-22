/**
 * Reversible base64 encoding with salt/scrambling to generate an obfuscated token.
 * Prevents candidates from guessing application numbers directly from the URL.
 */
export const encodeAppNumber = (appNumber) => {
  if (!appNumber) return '';
  const reversed = appNumber.split('').reverse().join('');
  const salted = `verify_${reversed}_token`;
  return btoa(salted)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const decodeAppNumber = (token) => {
  if (!token) return null;
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decoded = atob(base64);
    const match = decoded.match(/^verify_(.+)_token$/);
    if (!match) return null;
    const reversed = match[1];
    return reversed.split('').reverse().join('');
  } catch (err) {
    return null;
  }
};
