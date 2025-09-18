import { supabase } from '../lib/supabaseClient';
import { 
  HeadshotEvent, 
  EmployeeGallery, 
  GalleryPhoto, 
  HeadshotNotification,
  CSVEmployeeData,
  HeadshotEventStats,
  GalleryAccessData
} from '../types/headshot';

export class HeadshotService {
  // Headshot Events
  static async createEvent(eventData: Omit<HeadshotEvent, 'id' | 'created_at' | 'updated_at'>): Promise<HeadshotEvent> {
    const { data, error } = await supabase
      .from('headshot_events')
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getEvents(): Promise<HeadshotEvent[]> {
    const { data, error } = await supabase
      .from('headshot_events')
      .select('*')
      .order('event_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getEvent(id: string): Promise<HeadshotEvent> {
    const { data, error } = await supabase
      .from('headshot_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateEvent(id: string, updates: Partial<HeadshotEvent>): Promise<HeadshotEvent> {
    const { data, error } = await supabase
      .from('headshot_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('headshot_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Employee Galleries
  static async createEmployeeGalleries(eventId: string, employees: CSVEmployeeData[]): Promise<EmployeeGallery[]> {
    const galleries = employees.map(emp => ({
      event_id: eventId,
      employee_name: emp.name,
      email: emp.email,
      phone: emp.phone || null,
      unique_token: this.generateUniqueToken()
    }));

    const { data, error } = await supabase
      .from('employee_galleries')
      .insert(galleries)
      .select();

    if (error) throw error;
    return data;
  }

  static async getGalleriesByEvent(eventId: string): Promise<EmployeeGallery[]> {
    console.log('HeadshotService: Getting galleries for eventId:', eventId);
    
    // First, let's try a simple query without the photos relation
    const { data: simpleData, error: simpleError } = await supabase
      .from('employee_galleries')
      .select('*')
      .eq('event_id', eventId);
    
    console.log('HeadshotService: Simple query result:', { simpleData, simpleError });
    
    // Now try the full query with photos - specify the exact relationship
    const { data, error } = await supabase
      .from('employee_galleries')
      .select(`
        *,
        photos:gallery_photos!gallery_photos_gallery_id_fkey(*)
      `)
      .eq('event_id', eventId)
      .order('employee_name');

    console.log('HeadshotService: Full query result:', { data, error });
    if (error) throw error;
    return data;
  }

  static async getGalleryByToken(token: string): Promise<EmployeeGallery | null> {
    const { data, error } = await supabase
      .from('employee_galleries')
      .select(`
        *,
        photos:gallery_photos!gallery_photos_gallery_id_fkey(*)
      `)
      .eq('unique_token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data;
  }

  static async updateGalleryStatus(id: string, status: EmployeeGallery['status'], selectedPhotoId?: string): Promise<EmployeeGallery> {
    const updates: any = { status };
    if (selectedPhotoId) {
      updates.selected_photo_id = selectedPhotoId;
      
      // First, unselect all photos in this gallery
      await supabase
        .from('gallery_photos')
        .update({ is_selected: false })
        .eq('gallery_id', id);

      // Then select the chosen photo
      await supabase
        .from('gallery_photos')
        .update({ is_selected: true })
        .eq('id', selectedPhotoId);
    }

    const { data, error } = await supabase
      .from('employee_galleries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Gallery Photos
  static async uploadPhoto(galleryId: string, file: File, photoName?: string): Promise<GalleryPhoto> {
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${galleryId}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('headshot-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('headshot-photos')
      .getPublicUrl(fileName);

    // Save photo record to database
    const { data, error } = await supabase
      .from('gallery_photos')
      .insert({
        gallery_id: galleryId,
        photo_url: urlData.publicUrl,
        photo_name: photoName || file.name
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async uploadMultiplePhotos(galleryId: string, files: File[]): Promise<GalleryPhoto[]> {
    const uploadPromises = files.map(file => this.uploadPhoto(galleryId, file));
    return Promise.all(uploadPromises);
  }

  static async selectPhoto(photoId: string, galleryId: string): Promise<void> {
    // First, unselect all photos in this gallery
    await supabase
      .from('gallery_photos')
      .update({ is_selected: false })
      .eq('gallery_id', galleryId);

    // Then select the chosen photo
    const { error } = await supabase
      .from('gallery_photos')
      .update({ is_selected: true })
      .eq('id', photoId);

    if (error) throw error;

    // Update gallery status
    await this.updateGalleryStatus(galleryId, 'selection_made', photoId);
  }

  static async uploadFinalPhoto(galleryId: string, file: File): Promise<GalleryPhoto> {
    // Upload final photo
    const photo = await this.uploadPhoto(galleryId, file, 'final_retouched.jpg');
    
    // Mark as final
    await supabase
      .from('gallery_photos')
      .update({ is_final: true })
      .eq('id', photo.id);

    // Update gallery status
    await this.updateGalleryStatus(galleryId, 'completed');

    return photo;
  }

  static async updateEmployeeGallery(
    galleryId: string, 
    updates: { employee_name?: string; email?: string; phone?: string }
  ): Promise<EmployeeGallery> {
    const { data, error } = await supabase
      .from('employee_galleries')
      .update(updates)
      .eq('id', galleryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteEmployeeGallery(galleryId: string): Promise<void> {
    // First, get all photos for this gallery
    const { data: photos, error: photosError } = await supabase
      .from('gallery_photos')
      .select('photo_url')
      .eq('gallery_id', galleryId);

    if (photosError) throw photosError;

    // Delete all photos from storage
    if (photos && photos.length > 0) {
      const fileNames = photos
        .map(photo => photo.photo_url.split('/').pop())
        .filter(Boolean);
      
      if (fileNames.length > 0) {
        await supabase.storage
          .from('headshot-photos')
          .remove(fileNames);
      }
    }

    // Delete all photos from database
    await supabase
      .from('gallery_photos')
      .delete()
      .eq('gallery_id', galleryId);

    // Delete the gallery
    const { error } = await supabase
      .from('employee_galleries')
      .delete()
      .eq('id', galleryId);

    if (error) throw error;
  }

  static async deletePhoto(photoId: string): Promise<void> {
    // Get photo info first
    const { data: photo, error: fetchError } = await supabase
      .from('gallery_photos')
      .select('photo_url')
      .eq('id', photoId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const fileName = photo.photo_url.split('/').pop();
    if (fileName) {
      await supabase.storage
        .from('headshot-photos')
        .remove([fileName]);
    }

    // Delete from database
    const { error } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
  }

  // Notifications
  static async sendNotification(galleryId: string, type: HeadshotNotification['type'], emailAddress: string, messageContent?: string): Promise<HeadshotNotification> {
    const { data, error } = await supabase
      .from('headshot_notifications')
      .insert({
        gallery_id: galleryId,
        type,
        email_address: emailAddress,
        message_content: messageContent
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getNotificationsByGallery(galleryId: string): Promise<HeadshotNotification[]> {
    const { data, error } = await supabase
      .from('headshot_notifications')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Statistics
  static async getEventStats(eventId: string): Promise<HeadshotEventStats> {
    const { data, error } = await supabase
      .from('employee_galleries')
      .select('status')
      .eq('event_id', eventId);

    if (error) throw error;

    const stats = {
      total_employees: data.length,
      photos_uploaded: data.filter(g => g.status !== 'pending').length,
      selections_made: data.filter(g => g.status === 'selection_made' || g.status === 'retouching' || g.status === 'completed').length,
      retouching_in_progress: data.filter(g => g.status === 'retouching').length,
      completed: data.filter(g => g.status === 'completed').length
    };

    return stats;
  }

  // Utility functions
  private static generateUniqueToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // CSV Processing
  static parseCSV(csvContent: string): CSVEmployeeData[] {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    console.log('CSV Headers:', headers);
    
    // Find column indices by looking for keywords in headers
    const nameIndex = headers.findIndex(h => 
      h.includes('name') || h.includes('employee') || h.includes('full')
    );
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail') || h.includes('@')
    );
    const phoneIndex = headers.findIndex(h => 
      h.includes('phone') || h.includes('mobile') || h.includes('cell') || h.includes('number')
    );
    
    console.log('Column indices:', { nameIndex, emailIndex, phoneIndex });
    
    const employees: CSVEmployeeData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      const employee: CSVEmployeeData = {
        name: nameIndex >= 0 ? values[nameIndex] || '' : values[0] || '',
        email: emailIndex >= 0 ? values[emailIndex] || '' : values[1] || '',
        phone: phoneIndex >= 0 ? values[phoneIndex] || undefined : values[2] || undefined
      };
      
      console.log('Parsed employee:', employee);
      
      if (employee.name && employee.email) {
        employees.push(employee);
      }
    }
    
    return employees;
  }
}
