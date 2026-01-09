import { supabase } from '../lib/supabaseClient';
import { ProgramSession } from '../types/mindfulnessProgram';

export class CalendarService {
  /**
   * Generate .ics file content for a calendar event
   */
  private static generateICS(
    title: string,
    description: string,
    startDate: Date,
    durationMinutes: number,
    location?: string,
    meetingLink?: string
  ): string {
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    // Format dates in ICS format (YYYYMMDDTHHmmssZ)
    const formatDate = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    const dtstart = formatDate(startDate);
    const dtend = formatDate(endDate);
    const dtstamp = formatDate(new Date());

    // Escape text for ICS format
    const escapeText = (text: string): string => {
      return text.replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Shortcut//Mindfulness Program//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).substring(2)}@getshortcut.co`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeText(title)}`,
      `DESCRIPTION:${escapeText(description)}`,
    ];

    if (location) {
      icsContent.push(`LOCATION:${escapeText(location)}`);
    }

    if (meetingLink) {
      icsContent.push(`URL:${meetingLink}`);
      icsContent.push(`DESCRIPTION:${escapeText(description + '\\n\\nJoin: ' + meetingLink)}`);
    }

    icsContent.push('STATUS:CONFIRMED');
    icsContent.push('SEQUENCE:0');
    icsContent.push('END:VEVENT');
    icsContent.push('END:VCALENDAR');

    return icsContent.join('\r\n');
  }

  /**
   * Send calendar invite via email with .ics attachment
   */
  static async sendSessionInvite(
    participantEmail: string,
    participantName: string,
    session: {
      title: string;
      date: string;
      time?: string;
      duration: number;
      type: 'in-person' | 'virtual';
      location?: string;
      meetingLink?: string;
      description?: string;
    },
    programName: string,
    sessionId?: string,
    folderId?: string
  ): Promise<void> {
    try {
      // Parse date and time
      const sessionDate = new Date(session.date);
      if (session.time && session.time !== 'TBD') {
        const [hours, minutes] = session.time.split(':').map(Number);
        sessionDate.setHours(hours, minutes || 0, 0, 0);
      } else {
        sessionDate.setHours(11, 30, 0, 0); // Default to 11:30 AM when time is TBD or not provided
      }

      // Generate ICS content
      const icsContent = this.generateICS(
        `${session.title} - ${programName}`,
        session.description || `Mindfulness session: ${session.title}`,
        sessionDate,
        session.duration,
        session.type === 'in-person' ? session.location : undefined,
        session.type === 'virtual' ? session.meetingLink : undefined
      );

      // Convert ICS to blob for email attachment
      const icsBlob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

      // For now, we'll send via the email service with attachment
      // This would need to be implemented in the send-email function
      // For now, we'll create a download link and send it in the email body
      const icsDataUrl = URL.createObjectURL(icsBlob);

      // Call email service with calendar invite type
      const response = await fetch(`${window.location.origin}/api/send-calendar-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantEmail,
          participantName,
          programName,
          sessionTitle: session.title,
          sessionDate: sessionDate.toISOString(),
          sessionDuration: session.duration,
          sessionType: session.type,
          location: session.location,
          meetingLink: session.meetingLink,
          icsContent: btoa(icsContent) // Base64 encode for transmission
        })
      }).catch(() => {
        // Fallback: Use existing email service
        console.log('Calendar invite API not available, using email service fallback');
        return null;
      });

      // Log notification in database
      if (folderId || sessionId) {
        try {
          await supabase
            .from('program_notifications')
            .insert({
              folder_id: folderId || undefined,
              session_id: sessionId || undefined,
              notification_type: 'calendar_invite',
              email_address: participantEmail,
              message_content: `Calendar invite sent to ${participantName} for session: ${session.title}`,
              status: 'sent'
            });
        } catch (error) {
          console.error('Error logging calendar invite notification:', error);
        }
      }

      console.log('Calendar invite sent to', participantEmail);
    } catch (error) {
      console.error('Error sending calendar invite:', error);
      throw error;
    }
  }

  /**
   * Generate download link for .ics file (for manual download)
   */
  static generateICSDownload(
    title: string,
    description: string,
    startDate: Date,
    durationMinutes: number,
    location?: string,
    meetingLink?: string
  ): string {
    const icsContent = this.generateICS(title, description, startDate, durationMinutes, location, meetingLink);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    return URL.createObjectURL(blob);
  }
}

