import { supabase } from '../lib/supabaseClient';

export class SMSService {
  static async sendGalleryReminderSMS(
    phoneNumber: string,
    employeeName: string,
    galleryUrl: string,
    eventName: string,
    deadline?: string
  ): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          employeeName,
          galleryUrl,
          eventName,
          deadline
        }
      });

      if (error) {
        console.error('SMS function error:', error);
        throw new Error(error.message || 'Failed to send SMS');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send SMS');
      }

      console.log('SMS sent successfully:', data);
    } catch (error) {
      console.error('Error in sendGalleryReminderSMS:', error);
      throw error;
    }
  }
}
