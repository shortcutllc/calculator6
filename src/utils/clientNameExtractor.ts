/**
 * Utility functions for extracting and formatting client names from various sources
 */

export class ClientNameExtractor {
  /**
   * Extract client name from event name
   * Examples:
   * - "DraftKings Headshot Event" -> "draftkings"
   * - "Acme Corp Headshots 2024" -> "acme-corp"
   * - "Microsoft Team Photos" -> "microsoft"
   */
  static fromEventName(eventName: string): string {
    // Remove common suffixes
    const cleaned = eventName
      .replace(/\s+(headshot|headshots|event|events|photos|team|corporate|session|shoot).*$/i, '')
      .trim();
    
    // Convert to URL-friendly format
    return this.toUrlFriendly(cleaned);
  }

  /**
   * Extract client name from employee name
   * Examples:
   * - "john.smith@draftkings.com" -> "draftkings"
   * - "sarah@acme-corp.com" -> "acme-corp"
   */
  static fromEmail(email: string): string {
    const domain = email.split('@')[1];
    if (!domain) return 'unknown';
    
    // Remove common TLDs and subdomains
    const cleaned = domain
      .replace(/\.(com|org|net|co|io|us|uk|ca|au)$/i, '')
      .replace(/^(www|mail|email)\./i, '');
    
    return this.toUrlFriendly(cleaned);
  }

  /**
   * Extract client name from company name
   * Examples:
   * - "DraftKings Inc." -> "draftkings"
   * - "Acme Corporation" -> "acme"
   * - "Microsoft LLC" -> "microsoft"
   */
  static fromCompanyName(companyName: string): string {
    const cleaned = companyName
      .replace(/\s+(inc|inc\.|corporation|corp|corp\.|llc|ltd|ltd\.|company|co|co\.).*$/i, '')
      .trim();
    
    return this.toUrlFriendly(cleaned);
  }

  /**
   * Convert any string to URL-friendly format
   */
  static toUrlFriendly(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .trim();
  }

  /**
   * Generate a fallback client name if extraction fails
   */
  static generateFallback(prefix: string = 'client'): string {
    const timestamp = Date.now().toString(36);
    return `${prefix}-${timestamp}`;
  }
}

