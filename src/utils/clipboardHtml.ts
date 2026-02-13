/**
 * Copy rich HTML to clipboard so it pastes formatted into Gmail.
 * Uses ClipboardItem API with text/html blob, with execCommand fallback.
 */
export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  try {
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([html.replace(/<[^>]*>/g, '')], { type: 'text/plain' });
    const clipboardItem = new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch {
    // Fallback: hidden div + execCommand for older browsers / Safari
    try {
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.opacity = '0';
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      document.execCommand('copy');
      document.body.removeChild(container);
      return true;
    } catch {
      console.error('Failed to copy HTML to clipboard');
      return false;
    }
  }
}
