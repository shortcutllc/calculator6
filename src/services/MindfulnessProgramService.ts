import { supabase } from '../lib/supabaseClient';
import { CustomUrlService } from './CustomUrlService';
import { ClientNameExtractor } from '../utils/clientNameExtractor';
import {
  MindfulnessProgram,
  ParticipantFolder,
  ProgramDocument,
  ProgramSession,
  ProgramNotification,
  Facilitator,
  FacilitatorProgramAccess,
  CSVParticipantData,
  MindfulnessProgramStats
} from '../types/mindfulnessProgram';

export class MindfulnessProgramService {
  // Facilitators
  static async getFacilitators(): Promise<Facilitator[]> {
    const { data, error } = await supabase
      .from('facilitators')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  static async getFacilitator(id: string): Promise<Facilitator> {
    const { data, error } = await supabase
      .from('facilitators')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Mindfulness Programs
  static async createProgram(
    programData: Omit<MindfulnessProgram, 'id' | 'created_at' | 'updated_at' | 'total_participants'>
  ): Promise<MindfulnessProgram> {
    // Match the simple pattern from HeadshotService - minimal cleaning
    const cleanedData: any = { ...programData };
    
    // Only convert empty strings to null for UUID fields
    if (cleanedData.proposal_id === '') {
      cleanedData.proposal_id = null;
    }
    if (cleanedData.facilitator_id === '') {
      cleanedData.facilitator_id = null;
    }
    if (cleanedData.client_logo_url === '') {
      cleanedData.client_logo_url = null;
    }

    const { data, error } = await supabase
      .from('mindfulness_programs')
      .insert(cleanedData)
      .select(`
        *,
        facilitator:facilitators(*)
      `)
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      console.error('Insert data being sent:', cleanedData);
      throw error;
    }

    // Auto-generate custom URL for the program
    try {
      await CustomUrlService.autoGenerateCustomUrl(
        data.id,
        'mindfulness_program',
        {
          clientName: ClientNameExtractor.fromEventName(data.program_name),
          programName: data.program_name
        }
      );
    } catch (urlError) {
      console.warn('Failed to generate custom URL for program:', urlError);
    }

    // If facilitator_id is provided, grant access
    if (data.facilitator_id) {
      try {
        await this.grantFacilitatorAccess(data.facilitator_id, data.id, 'full');
      } catch (accessError) {
        console.warn('Failed to grant facilitator access:', accessError);
      }
    }

    return data;
  }

  static async getPrograms(): Promise<MindfulnessProgram[]> {
    const { data, error } = await supabase
      .from('mindfulness_programs')
      .select(`
        *,
        facilitator:facilitators(*)
      `)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getProgram(id: string): Promise<MindfulnessProgram> {
    const { data, error } = await supabase
      .from('mindfulness_programs')
      .select(`
        *,
        facilitator:facilitators(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProgram(id: string, updates: Partial<MindfulnessProgram>): Promise<MindfulnessProgram> {
    // Match the simple pattern from HeadshotService - just pass updates directly
    // Only clean up empty strings for UUID fields that need null
    const cleanedUpdates: any = { ...updates };
    
    if (cleanedUpdates.proposal_id === '') {
      cleanedUpdates.proposal_id = null;
    }
    if (cleanedUpdates.facilitator_id === '') {
      cleanedUpdates.facilitator_id = null;
    }
    if (cleanedUpdates.client_logo_url === '') {
      cleanedUpdates.client_logo_url = null;
    }

    console.log('🔍 MindfulnessProgramService - updateProgram called:', {
      programId: id,
      hasLogo: !!cleanedUpdates.client_logo_url,
      logoUrl: cleanedUpdates.client_logo_url,
      allUpdates: cleanedUpdates
    });

    const { data, error } = await supabase
      .from('mindfulness_programs')
      .update(cleanedUpdates)
      .eq('id', id)
      .select(`
        *,
        facilitator:facilitators(*)
      `)
      .single();

    if (error) {
      console.error('❌ Supabase update error:', error);
      console.error('Update data being sent:', cleanedUpdates);
      throw error;
    }
    
    console.log('✅ MindfulnessProgramService - updateProgram success:', {
      hasLogo: !!data.client_logo_url,
      logoUrl: data.client_logo_url
    });
    
    return data;
  }

  static async deleteProgram(id: string): Promise<void> {
    const { error } = await supabase
      .from('mindfulness_programs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Participant Folders
  static async createParticipantFolders(
    programId: string,
    participants: CSVParticipantData[]
  ): Promise<ParticipantFolder[]> {
    const folders = participants.map(participant => ({
      program_id: programId,
      participant_name: participant.name,
      email: participant.email,
      phone: participant.phone || null,
      unique_token: this.generateUniqueToken()
    }));

    const { data, error } = await supabase
      .from('participant_folders')
      .insert(folders)
      .select();

    if (error) throw error;

    // Update program total_participants count
    try {
      await supabase.rpc('increment', {
        table_name: 'mindfulness_programs',
        column_name: 'total_participants',
        id: programId,
        increment: folders.length
      });
    } catch (error) {
      // Fallback: manual update if RPC doesn't exist
      const { data: program } = await supabase
        .from('mindfulness_programs')
        .select('total_participants')
        .eq('id', programId)
        .single();
      
      if (program) {
        await supabase
          .from('mindfulness_programs')
          .update({ total_participants: (program.total_participants || 0) + folders.length })
          .eq('id', programId);
      }
    }

    // Auto-generate custom URLs for each participant folder
    try {
      const { data: program } = await supabase
        .from('mindfulness_programs')
        .select('program_name')
        .eq('id', programId)
        .single();

      const clientName = program ? ClientNameExtractor.fromEventName(program.program_name) : 'client';

      for (const folder of data) {
        try {
          await CustomUrlService.autoGenerateCustomUrl(
            folder.id,
            'participant_folder',
            {
              clientName,
              participantName: folder.participant_name,
              programName: program?.program_name
            }
          );
        } catch (urlError) {
          console.warn(`Failed to generate custom URL for participant ${folder.participant_name}:`, urlError);
        }
      }
    } catch (urlError) {
      console.warn('Failed to generate custom URLs for participant folders:', urlError);
    }

    return data;
  }

  static async getFoldersByProgram(programId: string): Promise<ParticipantFolder[]> {
    const { data, error } = await supabase
      .from('participant_folders')
      .select(`
        *,
        documents:program_documents(*)
      `)
      .eq('program_id', programId)
      .order('participant_name');

    if (error) throw error;
    return data;
  }

  static async getFolderByToken(token: string): Promise<ParticipantFolder | null> {
    const { data, error } = await supabase
      .from('participant_folders')
      .select(`
        *,
        documents:program_documents(*),
        program:mindfulness_programs(
          *,
          facilitator:facilitators(*)
        )
      `)
      .eq('unique_token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data;
  }

  static async updateParticipantFolder(
    folderId: string,
    updates: Partial<ParticipantFolder>
  ): Promise<ParticipantFolder> {
    const { data, error } = await supabase
      .from('participant_folders')
      .update(updates)
      .eq('id', folderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteParticipantFolder(folderId: string): Promise<void> {
    // Get all documents for this folder
    const { data: documents } = await supabase
      .from('program_documents')
      .select('document_url')
      .eq('folder_id', folderId);

    // Delete documents from storage
    if (documents && documents.length > 0) {
      const fileNames = documents
        .map(doc => {
          const urlParts = doc.document_url.split('/');
          return urlParts.slice(urlParts.indexOf('mindfulness-program-documents')).join('/');
        })
        .filter(Boolean);

      if (fileNames.length > 0) {
        await supabase.storage
          .from('mindfulness-program-documents')
          .remove(fileNames);
      }
    }

    // Delete documents from database (cascade should handle this, but being explicit)
    await supabase
      .from('program_documents')
      .delete()
      .eq('folder_id', folderId);

    // Get program_id before deleting to update count
    const { data: folder } = await supabase
      .from('participant_folders')
      .select('program_id')
      .eq('id', folderId)
      .single();

    // Delete the folder
    const { error } = await supabase
      .from('participant_folders')
      .delete()
      .eq('id', folderId);

    if (error) throw error;

    // Update program total_participants count
    if (folder) {
      const { data: program } = await supabase
        .from('mindfulness_programs')
        .select('total_participants')
        .eq('id', folder.program_id)
        .single();

      if (program && program.total_participants > 0) {
        await supabase
          .from('mindfulness_programs')
          .update({ total_participants: program.total_participants - 1 })
          .eq('id', folder.program_id);
      }
    }
  }

  // Program Documents
  static async uploadDocument(
    folderId: string,
    file: File,
    documentType: ProgramDocument['document_type'],
    documentName?: string
  ): Promise<ProgramDocument> {
    // Get program_id from folder to organize storage
    const { data: folder } = await supabase
      .from('participant_folders')
      .select('program_id')
      .eq('id', folderId)
      .single();

    if (!folder) throw new Error('Folder not found');

    // Organize by program -> folder -> document type
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder.program_id}/${folderId}/${documentType}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mindfulness-program-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('mindfulness-program-documents')
      .getPublicUrl(fileName);

    // Get current user for uploaded_by
    const { data: { user } } = await supabase.auth.getUser();

    // Save document record to database
    const { data, error } = await supabase
      .from('program_documents')
      .insert({
        folder_id: folderId,
        document_url: urlData.publicUrl,
        document_name: documentName || file.name,
        document_type: documentType,
        uploaded_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async uploadMultipleDocuments(
    folderId: string,
    files: File[],
    documentType: ProgramDocument['document_type']
  ): Promise<ProgramDocument[]> {
    const uploadPromises = files.map(file => this.uploadDocument(folderId, file, documentType));
    return Promise.all(uploadPromises);
  }

  static async deleteDocument(documentId: string): Promise<void> {
    // Get document info first
    const { data: document, error: fetchError } = await supabase
      .from('program_documents')
      .select('document_url')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const urlParts = document.document_url.split('/');
    const fileName = urlParts.slice(urlParts.indexOf('mindfulness-program-documents') + 1).join('/');
    
    if (fileName) {
      await supabase.storage
        .from('mindfulness-program-documents')
        .remove([fileName]);
    }

    // Delete from database
    const { error } = await supabase
      .from('program_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }

  // Program Sessions
  static async createSessions(programId: string, sessions: Omit<ProgramSession, 'id' | 'program_id' | 'created_at' | 'updated_at'>[]): Promise<ProgramSession[]> {
    const sessionsWithProgramId = sessions.map(session => ({
      ...session,
      program_id: programId
    }));

    // Use upsert to handle conflicts - if a session with the same program_id and session_number exists, update it
    const { data, error } = await supabase
      .from('program_sessions')
      .upsert(sessionsWithProgramId, {
        onConflict: 'program_id,session_number',
        ignoreDuplicates: false
      })
      .select();

    if (error) throw error;
    return data;
  }

  static async getSessionsByProgram(programId: string): Promise<ProgramSession[]> {
    const { data, error } = await supabase
      .from('program_sessions')
      .select('*')
      .eq('program_id', programId)
      .order('session_number', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async updateSession(sessionId: string, updates: Partial<ProgramSession>): Promise<ProgramSession> {
    const { data, error } = await supabase
      .from('program_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('program_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  // Facilitator Access
  static async grantFacilitatorAccess(
    facilitatorId: string,
    programId: string,
    accessLevel: FacilitatorProgramAccess['access_level'] = 'full'
  ): Promise<FacilitatorProgramAccess> {
    const { data, error } = await supabase
      .from('facilitator_program_access')
      .insert({
        facilitator_id: facilitatorId,
        program_id: programId,
        access_level: accessLevel
      })
      .select()
      .single();

    if (error) {
      // If already exists, update it
      if (error.code === '23505') {
        const { data: updated, error: updateError } = await supabase
          .from('facilitator_program_access')
          .update({ access_level: accessLevel })
          .eq('facilitator_id', facilitatorId)
          .eq('program_id', programId)
          .select()
          .single();

        if (updateError) throw updateError;
        return updated;
      }
      throw error;
    }

    return data;
  }

  static async getProgramsByFacilitator(facilitatorId: string): Promise<MindfulnessProgram[]> {
    const { data, error } = await supabase
      .from('facilitator_program_access')
      .select(`
        program:mindfulness_programs(
          *,
          facilitator:facilitators(*)
        )
      `)
      .eq('facilitator_id', facilitatorId);

    if (error) throw error;
    return data.map((item: any) => item.program).filter(Boolean);
  }

  // Statistics
  static async getProgramStats(programId: string): Promise<MindfulnessProgramStats> {
    const { data, error } = await supabase
      .from('participant_folders')
      .select('status')
      .eq('program_id', programId);

    if (error) throw error;

    const stats = {
      total_participants: data.length,
      enrolled: data.filter(f => f.status === 'enrolled' || f.status === 'active' || f.status === 'completed').length,
      active: data.filter(f => f.status === 'active').length,
      completed: data.filter(f => f.status === 'completed').length
    };

    return stats;
  }

  // Notifications
  static async createNotification(notification: Omit<ProgramNotification, 'id' | 'sent_at'>): Promise<ProgramNotification> {
    const { data, error } = await supabase
      .from('program_notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getNotificationsByFolder(folderId: string): Promise<ProgramNotification[]> {
    const { data, error } = await supabase
      .from('program_notifications')
      .select('*')
      .eq('folder_id', folderId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data;
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
  static parseCSV(csvContent: string): CSVParticipantData[] {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Find column indices by looking for keywords in headers
    const nameIndex = headers.findIndex(h =>
      h.includes('name') || h.includes('participant') || h.includes('full')
    );
    const emailIndex = headers.findIndex(h =>
      h.includes('email') || h.includes('e-mail') || h.includes('@')
    );
    const phoneIndex = headers.findIndex(h =>
      h.includes('phone') || h.includes('mobile') || h.includes('cell') || h.includes('number')
    );

    const participants: CSVParticipantData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const participant: CSVParticipantData = {
        name: nameIndex >= 0 ? values[nameIndex] || '' : values[0] || '',
        email: emailIndex >= 0 ? values[emailIndex] || '' : values[1] || '',
        phone: phoneIndex >= 0 ? values[phoneIndex] || undefined : values[2] || undefined
      };

      if (participant.name && participant.email) {
        participants.push(participant);
      }
    }

    return participants;
  }

  // CSV Processing for Sessions
  static parseSessionsCSV(csvContent: string): Omit<ProgramSession, 'id' | 'program_id' | 'created_at' | 'updated_at'>[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Helper function to parse CSV line handling quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
    
    // Find column indices
    const sessionNumberIndex = headers.findIndex(h => {
      const lowerH = h.toLowerCase();
      return (lowerH.includes('session') && (lowerH.includes('number') || lowerH.includes('num') || lowerH.includes('#'))) ||
             lowerH === 'class';
    });
    const dateIndex = headers.findIndex(h => 
      h.includes('date') || h.includes('session date')
    );
    const timeIndex = headers.findIndex(h => 
      h.includes('time') || h.includes('session time') ||
      h.toLowerCase() === 'session time'
    );
    const durationIndex = headers.findIndex(h => 
      h.includes('duration') || h.includes('minutes') || h.includes('min') || 
      (h.includes('session') && h.includes('length')) ||
      h.toLowerCase() === 'session length'
    );
    const typeIndex = headers.findIndex(h => 
      h.includes('type') || h.includes('delivery') || h.includes('format') ||
      h.toLowerCase() === 'delivery type'
    );
    const titleIndex = headers.findIndex(h => 
      h.includes('title') || h.includes('name') ||
      h.toLowerCase() === 'session title'
    );
    const contentIndex = headers.findIndex(h => 
      h.includes('content') || h.includes('description') || h.includes('desc') || 
      (h.includes('session') && (h.includes('description') || h.includes('desc')))
    );
    const locationIndex = headers.findIndex(h => 
      h.includes('location') || h.includes('address')
    );
    const meetingLinkIndex = headers.findIndex(h => 
      h.includes('link') || h.includes('url') || h.includes('meeting')
    );

    const sessions: Omit<ProgramSession, 'id' | 'program_id' | 'created_at' | 'updated_at'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      // Extract session number from "Class 1", "Class 2", etc. or just a number
      let sessionNumber = i;
      if (sessionNumberIndex >= 0 && values[sessionNumberIndex]) {
        const classValue = values[sessionNumberIndex].trim();
        // Try to extract number from "Class 1" format
        const numberMatch = classValue.match(/\d+/);
        if (numberMatch) {
          sessionNumber = parseInt(numberMatch[0]);
        } else {
          sessionNumber = parseInt(classValue) || i;
        }
      }
      
      // Handle date - blank means TBD
      const date = dateIndex >= 0 && values[dateIndex] && values[dateIndex].trim()
        ? values[dateIndex].trim()
        : 'TBD';
      
      // Handle time - blank means TBD
      const timeValue = timeIndex >= 0 && values[timeIndex] ? values[timeIndex].trim() : '';
      const time = !timeValue || timeValue === '' 
        ? 'TBD'
        : (timeValue.toUpperCase() === 'TBD' ? 'TBD' : timeValue);
      
      // Extract duration from "45m", "30m" format or just a number
      let duration = 30;
      if (durationIndex >= 0 && values[durationIndex]) {
        const durationValue = values[durationIndex].trim();
        // Extract number from "45m" format
        const numberMatch = durationValue.match(/\d+/);
        if (numberMatch) {
          duration = parseInt(numberMatch[0]);
        } else {
          duration = parseInt(durationValue) || 30;
        }
      }
      
      // Handle delivery type - "In-person/Virtual" or "In-person" should be "in-person"
      let type = 'virtual';
      if (typeIndex >= 0 && values[typeIndex]) {
        const typeStr = values[typeIndex].trim().toLowerCase();
        if (typeStr.includes('person') || typeStr.includes('in-person')) {
          type = 'in-person';
        } else if (typeStr === 'virtual') {
          type = 'virtual';
        }
      }
      
      // Handle optional fields - blank means undefined (not TBD)
      const title = titleIndex >= 0 && values[titleIndex] && values[titleIndex].trim()
        ? values[titleIndex].trim()
        : undefined;
      const content = contentIndex >= 0 && values[contentIndex] && values[contentIndex].trim()
        ? values[contentIndex].trim()
        : undefined;
      const location = locationIndex >= 0 && values[locationIndex] && values[locationIndex].trim()
        ? values[locationIndex].trim()
        : undefined;
      const meetingLink = meetingLinkIndex >= 0 && values[meetingLinkIndex] && values[meetingLinkIndex].trim()
        ? values[meetingLinkIndex].trim()
        : undefined;

      sessions.push({
        session_number: sessionNumber,
        session_date: date,
        session_time: time,
        session_duration_minutes: duration,
        session_type: type,
        session_title: title,
        session_content: content,
        location: location,
        meeting_link: meetingLink
      });
    }

    return sessions;
  }
}

