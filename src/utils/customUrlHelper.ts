import { CustomUrlService } from '../services/CustomUrlService';

/**
 * Utility functions for working with custom URLs
 */
export class CustomUrlHelper {
  /**
   * Get custom URL for a record, falling back to original URL if custom doesn't exist
   */
  static async getCustomUrl(
    originalId: string,
    type: 'proposal' | 'headshot_event' | 'employee_gallery' | 'photographer_token',
    fallbackUrl: string
  ): Promise<string> {
    try {
      const customUrl = await CustomUrlService.getByOriginalId(originalId, type);
      if (customUrl) {
        return CustomUrlService.generateCustomUrl(
          customUrl.client_name,
          customUrl.custom_slug,
          type
        );
      }
    } catch (error) {
      console.warn('Failed to get custom URL:', error);
    }
    
    return fallbackUrl;
  }

  /**
   * Get custom URL for an employee gallery
   */
  static async getEmployeeGalleryUrl(
    galleryId: string,
    originalToken: string
  ): Promise<string> {
    return this.getCustomUrl(
      galleryId,
      'employee_gallery',
      `${window.location.origin}/gallery/${originalToken}`
    );
  }

  /**
   * Get custom URL for a headshot event manager
   */
  static async getManagerUrl(
    eventId: string,
    originalToken: string
  ): Promise<string> {
    return this.getCustomUrl(
      eventId,
      'headshot_event',
      `${window.location.origin}/manager/${originalToken}`
    );
  }

  /**
   * Get custom URL for a photographer portal
   */
  static async getPhotographerUrl(
    tokenId: string,
    originalToken: string
  ): Promise<string> {
    return this.getCustomUrl(
      tokenId,
      'photographer_token',
      `${window.location.origin}/photographer/${originalToken}`
    );
  }

  /**
   * Get custom URL for a proposal
   */
  static async getProposalUrl(
    proposalId: string,
    originalUrl: string
  ): Promise<string> {
    return this.getCustomUrl(
      proposalId,
      'proposal',
      originalUrl
    );
  }
}

