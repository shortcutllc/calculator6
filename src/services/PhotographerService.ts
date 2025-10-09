import { supabase } from '../lib/supabaseClient';
import { CustomUrlService } from './CustomUrlService';
import { PhotographerToken, PhotographerAccess, PhotographerEventAssignment } from '../types/photographer';

export class PhotographerService {
  // Validate photographer token and get access info
  static async validateToken(token: string): Promise<PhotographerAccess | null> {
    const { data, error } = await supabase
      .from('photographer_tokens')
      .select('token, photographer_name, permissions')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      token: data.token,
      photographer_name: data.photographer_name,
      permissions: data.permissions
    };
  }

  // Create a new photographer token
  static async createToken(
    photographerName: string, 
    photographerEmail?: string,
    permissions?: Partial<PhotographerToken['permissions']>
  ): Promise<PhotographerToken> {
    const token = 'ph_' + Math.random().toString(36).substr(2, 20);
    
    const defaultPermissions = {
      can_manage_events: true,
      can_upload_photos: true,
      can_manage_galleries: true,
      ...permissions
    };

    const { data, error } = await supabase
      .from('photographer_tokens')
      .insert({
        token,
        photographer_name: photographerName,
        photographer_email: photographerEmail,
        permissions: defaultPermissions
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-generate custom URL for the photographer token
    try {
      await CustomUrlService.autoGenerateCustomUrl(
        data.id,
        'photographer_token',
        {
          clientName: 'photographers',
          photographerName: data.photographer_name
        }
      );
    } catch (urlError) {
      console.warn('Failed to generate custom URL for photographer token:', urlError);
      // Don't fail the token creation if URL generation fails
    }

    return data;
  }

  // Get all photographer tokens (admin only)
  static async getAllTokens(): Promise<PhotographerToken[]> {
    const { data, error } = await supabase
      .from('photographer_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Update photographer token
  static async updateToken(
    id: string, 
    updates: Partial<Omit<PhotographerToken, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<PhotographerToken> {
    const { data, error } = await supabase
      .from('photographer_tokens')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Deactivate photographer token
  static async deactivateToken(id: string): Promise<void> {
    const { error } = await supabase
      .from('photographer_tokens')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  // Delete photographer token
  static async deleteToken(id: string): Promise<void> {
    const { error } = await supabase
      .from('photographer_tokens')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Event Assignment Methods
  static async assignPhotographerToEvent(
    photographerTokenId: string,
    eventId: string
  ): Promise<PhotographerEventAssignment> {
    const { data, error } = await supabase
      .from('photographer_event_assignments')
      .insert({
        photographer_token_id: photographerTokenId,
        event_id: eventId
      })
      .select(`
        *,
        event:headshot_events(id, event_name, event_date, status),
        photographer:photographer_tokens(id, photographer_name, photographer_email, token)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async removePhotographerFromEvent(
    photographerTokenId: string,
    eventId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('photographer_event_assignments')
      .delete()
      .eq('photographer_token_id', photographerTokenId)
      .eq('event_id', eventId);

    if (error) throw error;
  }

  static async getPhotographerAssignments(photographerTokenId: string): Promise<PhotographerEventAssignment[]> {
    const { data, error } = await supabase
      .from('photographer_event_assignments')
      .select(`
        *,
        event:headshot_events(id, event_name, event_date, status)
      `)
      .eq('photographer_token_id', photographerTokenId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getEventAssignments(eventId: string): Promise<PhotographerEventAssignment[]> {
    const { data, error } = await supabase
      .from('photographer_event_assignments')
      .select(`
        *,
        photographer:photographer_tokens(id, photographer_name, photographer_email, token)
      `)
      .eq('event_id', eventId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getAssignedEventsForPhotographer(photographerToken: string): Promise<any[]> {
    // Get photographer token ID first
    const { data: tokenData, error: tokenError } = await supabase
      .from('photographer_tokens')
      .select('id')
      .eq('token', photographerToken)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Invalid photographer token');
    }

    // Get assigned events
    const { data, error } = await supabase
      .from('photographer_event_assignments')
      .select(`
        event:headshot_events(*)
      `)
      .eq('photographer_token_id', tokenData.id)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data.map(assignment => assignment.event);
  }
}
