import { supabase } from '../lib/supabaseClient';

export interface CustomUrlData {
  id: string;
  original_id: string;
  type: 'proposal' | 'headshot_event' | 'employee_gallery' | 'photographer_token';
  custom_slug: string;
  client_name: string;
  created_at: string;
  updated_at: string;
}

export class CustomUrlService {
  /**
   * Generate a URL-friendly slug from text
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  /**
   * Auto-generate custom URL based on type and data
   */
  static async autoGenerateCustomUrl(
    originalId: string,
    type: CustomUrlData['type'],
    data: {
      clientName?: string;
      employeeName?: string;
      photographerName?: string;
      eventName?: string;
    }
  ): Promise<CustomUrlData> {
    let customSlug: string;
    let clientName: string;

    switch (type) {
      case 'proposal':
        // Standalone proposal: client name
        clientName = data.clientName || this.extractClientName(data.eventName || '');
        customSlug = this.generateSlug(clientName);
        break;

      case 'headshot_event':
        // Headshot Manager gallery: client name
        clientName = data.clientName || this.extractClientName(data.eventName || '');
        customSlug = this.generateSlug(clientName);
        break;

      case 'employee_gallery':
        // Employee Gallery: first name and last initial
        if (!data.employeeName) {
          throw new Error('Employee name is required for employee gallery');
        }
        clientName = data.clientName || this.extractClientName(data.eventName || '');
        customSlug = this.generateEmployeeSlug(data.employeeName);
        break;

      case 'photographer_token':
        // Photographer gallery: first name and last initial
        if (!data.photographerName) {
          throw new Error('Photographer name is required for photographer token');
        }
        clientName = data.clientName || 'photographers';
        customSlug = this.generatePhotographerSlug(data.photographerName);
        break;

      default:
        throw new Error(`Unknown type: ${type}`);
    }

    // Ensure uniqueness
    const finalSlug = await this.ensureUniqueSlug(clientName, customSlug, type, originalId);

    return this.setCustomUrl(originalId, type, finalSlug, clientName);
  }

  /**
   * Generate employee slug: first name + last initial
   */
  private static generateEmployeeSlug(employeeName: string): string {
    const parts = employeeName.trim().split(/\s+/);
    if (parts.length === 1) {
      return this.generateSlug(parts[0]);
    }
    
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0);
    return this.generateSlug(`${firstName}-${lastInitial}`);
  }

  /**
   * Generate photographer slug: first name + last initial
   */
  private static generatePhotographerSlug(photographerName: string): string {
    return this.generateEmployeeSlug(photographerName); // Same logic as employee
  }

  /**
   * Extract client name from event name or other sources
   */
  private static extractClientName(eventName: string): string {
    if (!eventName) return 'client';
    
    // Remove common suffixes
    const cleaned = eventName
      .replace(/\s+(headshot|headshots|event|events|photos|team|corporate|session|shoot).*$/i, '')
      .trim();
    
    return this.generateSlug(cleaned) || 'client';
  }

  /**
   * Ensure slug is unique by adding numeric suffix if needed
   */
  private static async ensureUniqueSlug(
    clientName: string,
    baseSlug: string,
    type: CustomUrlData['type'],
    originalId: string
  ): Promise<string> {
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from('custom_urls')
        .select('id')
        .eq('client_name', clientName)
        .eq('custom_slug', finalSlug)
        .eq('type', type)
        .neq('original_id', originalId)
        .single();

      if (!existing) {
        break; // Slug is unique
      }

      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }

  /**
   * Create or update a custom URL
   */
  static async setCustomUrl(
    originalId: string,
    type: CustomUrlData['type'],
    customSlug: string,
    clientName: string
  ): Promise<CustomUrlData> {
    // Ensure the slug is URL-friendly
    const cleanSlug = this.generateSlug(customSlug);
    
    if (!cleanSlug) {
      throw new Error('Custom slug cannot be empty');
    }

    // Check if this slug already exists for this client and type
    const { data: existing } = await supabase
      .from('custom_urls')
      .select('id, original_id')
      .eq('client_name', clientName)
      .eq('custom_slug', cleanSlug)
      .eq('type', type)
      .neq('original_id', originalId)
      .single();

    if (existing) {
      throw new Error(`Custom URL "${cleanSlug}" already exists for ${clientName}`);
    }

    // Upsert the custom URL
    const { data, error } = await supabase
      .from('custom_urls')
      .upsert({
        original_id: originalId,
        type,
        custom_slug: cleanSlug,
        client_name: clientName
      })
      .select()
      .single();

    if (error) throw error;

    // Also update the original table with the custom slug
    const tableMap = {
      proposal: 'proposals',
      headshot_event: 'headshot_events',
      employee_gallery: 'employee_galleries',
      photographer_token: 'photographer_tokens'
    };

    const { error: updateError } = await supabase
      .from(tableMap[type])
      .update({ custom_url_slug: cleanSlug })
      .eq('id', originalId);

    if (updateError) {
      console.warn('Failed to update original table with custom slug:', updateError);
    }

    return data;
  }

  /**
   * Get custom URL by client and slug
   */
  static async getByCustomUrl(
    clientName: string,
    customSlug: string,
    type: CustomUrlData['type']
  ): Promise<CustomUrlData | null> {
    const { data, error } = await supabase
      .from('custom_urls')
      .select('*')
      .eq('client_name', clientName)
      .eq('custom_slug', customSlug)
      .eq('type', type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data;
  }

  /**
   * Get custom URL by original ID
   */
  static async getByOriginalId(
    originalId: string,
    type: CustomUrlData['type']
  ): Promise<CustomUrlData | null> {
    const { data, error } = await supabase
      .from('custom_urls')
      .select('*')
      .eq('original_id', originalId)
      .eq('type', type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data;
  }

  /**
   * Delete custom URL
   */
  static async deleteCustomUrl(
    originalId: string,
    type: CustomUrlData['type']
  ): Promise<void> {
    const { error } = await supabase
      .from('custom_urls')
      .delete()
      .eq('original_id', originalId)
      .eq('type', type);

    if (error) throw error;

    // Also clear the custom_url_slug from the original table
    const tableMap = {
      proposal: 'proposals',
      headshot_event: 'headshot_events',
      employee_gallery: 'employee_galleries',
      photographer_token: 'photographer_tokens'
    };

    const { error: updateError } = await supabase
      .from(tableMap[type])
      .update({ custom_url_slug: null })
      .eq('id', originalId);

    if (updateError) {
      console.warn('Failed to clear custom slug from original table:', updateError);
    }
  }

  /**
   * Generate a custom URL
   */
  static generateCustomUrl(
    clientName: string,
    customSlug: string,
    type: CustomUrlData['type']
  ): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${clientName}/${type}/${customSlug}`;
  }

  /**
   * Get all custom URLs for a client
   */
  static async getClientCustomUrls(clientName: string): Promise<CustomUrlData[]> {
    const { data, error } = await supabase
      .from('custom_urls')
      .select('*')
      .eq('client_name', clientName)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
