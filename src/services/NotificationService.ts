import { supabase } from '../lib/supabaseClient';
import { config } from '../config';

export interface EmailNotificationRequest {
  type: 'gallery_ready' | 'final_photo_ready';
  employeeName: string;
  employeeEmail: string;
  galleryUrl: string;
  eventName: string;
  clientLogoUrl?: string;
  selectionDeadline?: string;
}

export class NotificationService {
  // Helper function to check if a gallery has photos
  private static async checkGalleryHasPhotos(galleryId: string): Promise<boolean> {
    try {
      const { data: photos, error } = await supabase
        .from('gallery_photos')
        .select('id')
        .eq('gallery_id', galleryId)
        .limit(1);

      if (error) {
        console.error('Error checking gallery photos:', error);
        return false;
      }

      return photos && photos.length > 0;
    } catch (error) {
      console.error('Error checking gallery photos:', error);
      return false;
    }
  }

  static async sendGalleryReadyNotification(
    employeeName: string,
    employeeEmail: string,
    galleryUrl: string,
    eventName: string,
    galleryId?: string
  ): Promise<void> {
    console.log('sendGalleryReadyNotification called with:', {
      employeeName,
      employeeEmail,
      galleryUrl,
      eventName,
      galleryId
    });

    // If galleryId is provided, check if gallery has photos
    if (galleryId) {
      const hasPhotos = await this.checkGalleryHasPhotos(galleryId);
      if (!hasPhotos) {
        console.log(`Skipping notification for ${employeeName} - no photos in gallery`);
        return;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeEmail)) {
      throw new Error(`Invalid email address: ${employeeEmail}`);
    }

    // Get event data (name and client logo) if galleryId is provided
    let actualEventName = eventName; // fallback to passed eventName
    let clientLogoUrl: string | undefined;
    let selectionDeadline: string | undefined;
    
    if (galleryId) {
      try {
        const { data: gallery, error } = await supabase
          .from('employee_galleries')
          .select('event_id')
          .eq('id', galleryId)
          .single();

        if (!error && gallery) {
          const { data: event, error: eventError } = await supabase
            .from('headshot_events')
            .select('event_name, client_logo_url, selection_deadline')
            .eq('id', gallery.event_id)
            .single();

          if (!eventError && event) {
            actualEventName = event.event_name; // Use the actual event name from database
            clientLogoUrl = event.client_logo_url;
            selectionDeadline = event.selection_deadline;
          }
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
        // Continue with fallback values
      }
    }

    const request: EmailNotificationRequest = {
      type: 'gallery_ready',
      employeeName,
      employeeEmail,
      galleryUrl,
      eventName: actualEventName,
      clientLogoUrl,
      selectionDeadline
    };

    await this.sendEmailNotification(request);
  }

  static async sendFinalPhotoReadyNotification(
    employeeName: string,
    employeeEmail: string,
    galleryUrl: string,
    eventName: string,
    galleryId?: string
  ): Promise<void> {
    // If galleryId is provided, check if gallery has photos
    if (galleryId) {
      const hasPhotos = await this.checkGalleryHasPhotos(galleryId);
      if (!hasPhotos) {
        console.log(`Skipping final photo notification for ${employeeName} - no photos in gallery`);
        return;
      }
    }

    // Get event data (name and client logo) if galleryId is provided
    let actualEventName = eventName; // fallback to passed eventName
    let clientLogoUrl: string | undefined;
    let selectionDeadline: string | undefined;
    
    if (galleryId) {
      try {
        const { data: gallery, error } = await supabase
          .from('employee_galleries')
          .select('event_id')
          .eq('id', galleryId)
          .single();

        if (!error && gallery) {
          const { data: event, error: eventError } = await supabase
            .from('headshot_events')
            .select('event_name, client_logo_url, selection_deadline')
            .eq('id', gallery.event_id)
            .single();

          if (!eventError && event) {
            actualEventName = event.event_name; // Use the actual event name from database
            clientLogoUrl = event.client_logo_url;
            selectionDeadline = event.selection_deadline;
          }
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
        // Continue with fallback values
      }
    }

    const request: EmailNotificationRequest = {
      type: 'final_photo_ready',
      employeeName,
      employeeEmail,
      galleryUrl,
      eventName: actualEventName,
      clientLogoUrl,
      selectionDeadline
    };

    await this.sendEmailNotification(request);
  }

  private static async sendEmailNotification(request: EmailNotificationRequest): Promise<void> {
    try {
      console.log('Sending email notification:', request);
      console.log('Config:', {
        url: config.supabase.url,
        hasAnonKey: !!config.supabase.anonKey
      });
      
      const response = await fetch(`${config.supabase.url}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify(request)
      });

      console.log('Email function response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email function error:', errorData);
        throw new Error(`Failed to send email: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Email function response data:', data);

      if (!data?.success) {
        console.error('Email sending failed:', data);
        throw new Error('Email sending failed');
      }

      console.log('Email sent successfully:', data);
    } catch (error) {
      console.error('Error sending email notification:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  // Send notifications to all employees in an event
  static async sendBulkGalleryReadyNotifications(eventId: string): Promise<void> {
    try {
      console.log('Starting bulk notification send for event:', eventId);
      
      // Get all galleries for this event with their photos
      const { data: galleries, error } = await supabase
        .from('employee_galleries')
        .select(`
          *,
          event:headshot_events(*),
          photos:gallery_photos!gallery_photos_gallery_id_fkey(*)
        `)
        .eq('event_id', eventId);

      if (error) {
        console.error('Error fetching galleries:', error);
        throw error;
      }

      console.log('Found galleries:', galleries);
      
      // Debug: Log the first gallery's fields
      if (galleries && galleries.length > 0) {
        console.log('First gallery fields:', Object.keys(galleries[0]));
        console.log('First gallery email field:', galleries[0].email);
      }

      if (!galleries || galleries.length === 0) {
        throw new Error('No galleries found for this event');
      }

      // Filter out galleries that don't have any photos
      const galleriesWithPhotos = galleries.filter(gallery => 
        gallery.photos && gallery.photos.length > 0
      );

      console.log(`Found ${galleries.length} total galleries, ${galleriesWithPhotos.length} with photos`);

      if (galleriesWithPhotos.length === 0) {
        throw new Error('No galleries with photos found for this event');
      }

      const eventName = galleriesWithPhotos[0].event?.event_name || 'Headshot Event';
      console.log('Event name:', eventName);
      
      // Send notifications only to employees with photos
      const notificationPromises = galleriesWithPhotos.map(async (gallery) => {
        const galleryUrl = `${window.location.origin}/gallery/${gallery.unique_token}`;
        console.log(`Preparing notification for ${gallery.employee_name} (${gallery.email})`);
        
        try {
          await this.sendGalleryReadyNotification(
            gallery.employee_name,
            gallery.email,
            galleryUrl,
            eventName,
            gallery.id
          );
          console.log(`✅ Gallery ready notification sent to ${gallery.employee_name}`);
        } catch (error) {
          console.error(`❌ Failed to send notification to ${gallery.employee_name}:`, error);
          // Continue with other notifications even if one fails
        }
      });

      await Promise.all(notificationPromises);
      console.log('Bulk notification process completed');
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Send final photo ready notification to a specific employee
  static async sendFinalPhotoNotification(galleryId: string): Promise<void> {
    try {
      // Get gallery details
      const { data: gallery, error } = await supabase
        .from('employee_galleries')
        .select(`
          *,
          event:headshot_events(*)
        `)
        .eq('id', galleryId)
        .single();

      if (error) throw error;

      const eventName = gallery.event?.event_name || 'Headshot Event';
      const galleryUrl = `${window.location.origin}/gallery/${gallery.unique_token}`;

      await this.sendFinalPhotoReadyNotification(
        gallery.employee_name,
        gallery.email,
        galleryUrl,
        eventName,
        galleryId
      );

      console.log(`Final photo notification sent to ${gallery.employee_name}`);
    } catch (error) {
      console.error('Error sending final photo notification:', error);
      throw error;
    }
  }
}
