import { MindfulnessProgram, ProgramSession } from '../types/mindfulnessProgram';
import { ProposalData } from '../types/proposal';

/**
 * Generate ProposalData from a mindfulness program and its sessions
 * This creates a proposal structure matching the markdown document format
 * 
 * @param existingPricing - Optional existing pricing to preserve (base prices and discount)
 */
export const generateMindfulnessProposalData = (
  program: MindfulnessProgram,
  sessions: ProgramSession[],
  clientName: string,
  clientEmail?: string,
  existingPricing?: {
    inPersonPricePerSession?: number;
    virtualPricePerSession?: number;
    resourcesPrice?: number;
    discountPercent?: number;
  }
): ProposalData => {
  // Calculate costs from sessions
  const inPersonSessions = sessions.filter(s => s.session_type === 'in-person');
  const virtualSessions = sessions.filter(s => s.session_type === 'virtual');
  
  // Use existing pricing if provided, otherwise use defaults
  const inPersonPricePerSession = existingPricing?.inPersonPricePerSession ?? 1500; // $1,500 per 45-min in-person
  const virtualPricePerSession = existingPricing?.virtualPricePerSession ?? 1250; // $1,250 per 30-min virtual
  const resourcesPrice = existingPricing?.resourcesPrice ?? 2000; // $2,000 for resources
  const discountPercent = existingPricing?.discountPercent ?? 0;

  const inPersonTotal = inPersonSessions.length * inPersonPricePerSession;
  const virtualTotal = virtualSessions.length * virtualPricePerSession;
  const subtotal = inPersonTotal + virtualTotal + resourcesPrice;
  
  // Calculate discount amount and final total
  const discountAmount = subtotal * (discountPercent / 100);
  const totalCost = subtotal - discountAmount;

  // Format dates (handle TBD)
  const startDate = program.start_date === 'TBD' 
    ? 'Date TBD'
    : new Date(program.start_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const endDate = program.end_date === 'TBD'
    ? 'Date TBD'
    : new Date(program.end_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Get facilitator name
  const facilitatorName = program.facilitator?.name || 'Courtney Schulnick';

  // Create proposal data structure
  const proposalData: ProposalData = {
    clientName: clientName,
    clientEmail: clientEmail,
    clientLogoUrl: program.client_logo_url,
    eventDates: sessions.map(s => s.session_date).filter(d => d !== 'TBD').sort(),
    locations: {}, // Mindfulness programs don't use the same location structure
    services: {
      // Create a single "service" entry for the mindfulness program
      'mindfulness-program': {
        'program-overview': {
          date: program.start_date,
          services: [{
            name: 'Mindfulness Program',
            description: 'A comprehensive mindfulness meditation program designed to reduce stress and enhance productivity for your team.',
            date: program.start_date,
            location: 'Multiple',
            totalHours: sessions.reduce((sum, s) => sum + (s.session_duration_minutes || 0), 0) / 60,
            numPros: 1, // One facilitator
            proHourly: 0, // Not applicable
            hourlyRate: 0, // Not applicable
            earlyArrival: 0,
            discountPercent: 0,
            // Mindfulness-specific fields
            classLength: sessions[0]?.session_duration_minutes || 30,
            participants: program.total_participants || 0,
            fixedPrice: totalCost,
            mindfulnessType: 'program'
          }]
        }
      }
    },
    summary: {
      totalAppointments: program.total_participants || 0,
      totalEventCost: totalCost,
      totalProRevenue: 0,
      netProfit: 0,
      profitMargin: 0
    },
    // Add mindfulness-specific metadata
    mindfulnessProgram: {
      programId: program.id,
      programName: program.program_name,
      facilitatorName: facilitatorName,
      startDate: startDate,
      endDate: endDate,
      totalSessions: sessions.length,
      inPersonSessions: inPersonSessions.length,
      virtualSessions: virtualSessions.length,
      sessions: sessions.map(s => ({
        sessionNumber: s.session_number,
        date: s.session_date,
        time: s.session_time,
        duration: s.session_duration_minutes || 30,
        type: s.session_type,
        title: s.session_title || `Class ${s.session_number}`,
        content: s.session_content || '',
        location: s.location,
        meetingLink: s.meeting_link
      })),
      pricing: {
        inPersonPricePerSession: inPersonPricePerSession,
        virtualPricePerSession: virtualPricePerSession,
        resourcesPrice: resourcesPrice,
        discountPercent: discountPercent,
        inPersonTotal: inPersonTotal,
        virtualTotal: virtualTotal,
        subtotal: subtotal,
        discountAmount: discountAmount,
        totalCost: totalCost,
        costPerParticipant: program.total_participants > 0 
          ? totalCost / program.total_participants 
          : 0,
        costPerSession: sessions.length > 0 
          ? totalCost / sessions.length 
          : 0
      }
    }
  };

  return proposalData;
};

