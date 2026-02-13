/**
 * Shorten a URL using TinyURL's free API (no key required).
 * Returns the shortened URL, or the original if shortening fails.
 */
export async function shortenUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return url;

  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('TinyURL API error');
    const shortened = await response.text();
    return shortened.trim();
  } catch {
    console.warn('URL shortening failed, using original URL');
    return url;
  }
}
