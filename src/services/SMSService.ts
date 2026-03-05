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

  static async sendAgreementReminderSMS(
    phoneNumber: string,
    proName: string,
    signingUrl: string,
    documentName: string
  ): Promise<void> {
    const firstName = proName.split(' ')[0];
    const message = `Hi ${firstName}! This is a friendly reminder to sign your ${documentName} for Shortcut Wellness.\n\nPlease review and sign here: ${signingUrl}\n\nThanks!\nTeam Shortcut`;

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message
        }
      });

      if (error) {
        console.error('SMS function error:', error);
        throw new Error(error.message || 'Failed to send SMS');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send SMS');
      }

      console.log('Agreement SMS sent successfully:', data);
    } catch (error) {
      console.error('Error in sendAgreementReminderSMS:', error);
      throw error;
    }
  }
}
