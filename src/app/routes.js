// Malformed percent escapes are untrusted URL input, not a reason to break navigation.
export function parseHash(hash) {
  const [path] = hash.replace(/^#\/?/, '').split('?');
  try { return path.split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return ['not-found']; }
}
