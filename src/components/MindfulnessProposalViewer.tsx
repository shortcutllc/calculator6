import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Edit, Save, Download, Send, History as HistoryIcon, Copy, CheckCircle2, X, ArrowLeft, Check, Pencil, Briefcase, User, Mail, Calendar, Plus, Trash2, ChevronUp, ChevronDown, Brain } from 'lucide-react';
import { useProposal } from '../contexts/ProposalContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { config } from '../config';
import { format } from 'date-fns';
import { generatePDF } from '../utils/pdf';
import { Button } from './Button';
import ShareProposalModal from './ShareProposalModal';
import { ProposalChangeSet, ProposalChange } from '../types/proposal';
import { ChangeSourceBadge } from './ChangeSourceBadge';
import { trackProposalChanges, getChangeDisplayInfo } from '../utils/changeTracker';
import { MindfulnessProposalContent } from './MindfulnessProposalContent';
import { generateMindfulnessProposalData } from '../utils/mindfulnessProposalGenerator';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';
import { LoadingSpinner } from './LoadingSpinner';
import EditableField from './EditableField';
import { getProposalUrl } from '../utils/url';

const MindfulnessProposalViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { updateProposal, currentProposal, loading: contextLoading } = useProposal();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showSendToClientModal, setShowSendToClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [changeSets, setChangeSets] = useState<ProposalChangeSet[]>([]);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [showCopied, setShowCopied] = useState(false);
  
  // Proposal options state
  const [proposalOptions, setProposalOptions] = useState<any[]>([]);
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [editingOptionName, setEditingOptionName] = useState<string | null>(null);
  const [optionNameInput, setOptionNameInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingOptionId, setDeletingOptionId] = useState<string | null>(null);
  
  // Link existing proposals state
  const [showLinkProposalsModal, setShowLinkProposalsModal] = useState(false);
  const [availableProposals, setAvailableProposals] = useState<any[]>([]);
  const [selectedProposalsToLink, setSelectedProposalsToLink] = useState<string[]>([]);
  const [isLinkingProposals, setIsLinkingProposals] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!id) {
      setLoadError('Proposal ID is required');
      setIsLoading(false);
      return;
    }

    const fetchProposal = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const { data, error: fetchError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Proposal not found');

        // Verify this is a mindfulness program proposal - if not, redirect to regular viewer
        if (data.proposal_type !== 'mindfulness-program' && !data.data?.mindfulnessProgram) {
          // Redirect to regular proposal viewer
          navigate(`/proposal/${id}${location.search}`, { replace: true });
          return;
        }

        setProposal(data);

        // Fetch latest program data
        let latestProgramData = null;
        let latestSessions = [];
        let programLogoUrl = null;

        if (data.data?.mindfulnessProgram?.programId) {
          try {
            const programId = data.data.mindfulnessProgram.programId;
            latestProgramData = await MindfulnessProgramService.getProgram(programId);
            if (latestProgramData) {
              programLogoUrl = latestProgramData.client_logo_url;
              latestSessions = await MindfulnessProgramService.getSessionsByProgram(programId);
            }
          } catch (err) {
            console.warn('Could not fetch program data:', err);
          }
        }

        // Preserve pricing BEFORE regeneration (critical for persistence)
        const existingPricing = data.data?.mindfulnessProgram?.pricing ? {
          inPersonPricePerSession: data.data.mindfulnessProgram.pricing.inPersonPricePerSession,
          virtualPricePerSession: data.data.mindfulnessProgram.pricing.virtualPricePerSession,
          resourcesPrice: data.data.mindfulnessProgram.pricing.resourcesPrice,
          discountPercent: data.data.mindfulnessProgram.pricing.discountPercent ?? 0
        } : undefined;

        // Regenerate proposal data with latest program and sessions
        let displayDataToUse = data.data;
        if (latestProgramData) {
          try {
            const sessionsToUse = latestSessions.length > 0 
              ? latestSessions 
              : (data.data?.mindfulnessProgram?.sessions || []);
            
            const regeneratedData = generateMindfulnessProposalData(
              latestProgramData,
              sessionsToUse,
              data.data?.clientName || data.client_name || 'Client',
              data.data?.clientEmail || data.client_email,
              existingPricing // Pass existing pricing to preserve it
            );

            displayDataToUse = {
              ...regeneratedData,
              clientName: data.data?.clientName || data.client_name || regeneratedData.clientName,
              clientEmail: data.data?.clientEmail || data.client_email || regeneratedData.clientEmail
            };
            
            console.log('✅ Regenerated proposal data with preserved pricing:', {
              preservedPricing: existingPricing,
              regeneratedPricing: regeneratedData.mindfulnessProgram?.pricing
            });
          } catch (err) {
            console.warn('Could not regenerate proposal data:', err);
          }
        }

        // Ensure customization object exists and has default intro copy if missing
        const customization = data.customization || {};
        if (!customization.programIntroCopy && data.client_name) {
          // Add default intro copy template if it doesn't exist
          customization.programIntroCopy = `This comprehensive mindfulness program is derived from the evidence-based eight-week Mindfulness-Based Stress Reduction (MBSR) program developed by Jon Kabat-Zinn. We've designed this program to be tailored to ${data.client_name}'s team, blending proven practices with a flexible approach that can be delivered over three months or a custom, extended schedule to fit seamlessly into your workplace culture.

We understand the importance of offering impactful wellness solutions that respect your team's time and maintain consistency.`;
        }
        
        // Ensure pricing exists with defaults if missing (shouldn't happen if regeneration worked)
        if (displayDataToUse.mindfulnessProgram && !displayDataToUse.mindfulnessProgram.pricing) {
          const inPersonSessions = displayDataToUse.mindfulnessProgram.inPersonSessions || 0;
          const virtualSessions = displayDataToUse.mindfulnessProgram.virtualSessions || 0;
          const subtotal = (inPersonSessions * 1500) + (virtualSessions * 1250) + 2000;
          displayDataToUse.mindfulnessProgram.pricing = {
            inPersonPricePerSession: 1500,
            virtualPricePerSession: 1250,
            resourcesPrice: 2000,
            discountPercent: 0,
            inPersonTotal: inPersonSessions * 1500,
            virtualTotal: virtualSessions * 1250,
            subtotal: subtotal,
            discountAmount: 0,
            totalCost: subtotal,
            costPerParticipant: 0,
            costPerSession: 0
          };
          console.warn('⚠️ Pricing was missing after regeneration, initialized with defaults');
        } else if (displayDataToUse.mindfulnessProgram?.pricing) {
          // Ensure all pricing fields are present and recalculate totals
          recalculatePricing(displayDataToUse);
          console.log('✅ Pricing loaded and recalculated:', displayDataToUse.mindfulnessProgram.pricing);
        }
        
        const displayDataWithLogo = {
          ...displayDataToUse,
          customization: customization,
          clientLogoUrl: displayDataToUse?.clientLogoUrl || data.client_logo_url || programLogoUrl || null
        };

        setDisplayData(displayDataWithLogo);
        setEditedData(displayDataWithLogo);
        setNotes(data.notes || '');

        // Load change history
        fetchChangeSets(data);

        if (displayDataWithLogo?.clientLogoUrl) {
          setLogoUrl(displayDataWithLogo.clientLogoUrl);
        }
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
    fetchProposalOptions();
  }, [id]);

  const fetchChangeSets = async (proposalData?: any) => {
    const dataToUse = proposalData || proposal;
    if (!dataToUse || !dataToUse.original_data || !dataToUse.data) {
      setChangeSets([]);
      return;
    }

    try {
      const changes = trackProposalChanges(dataToUse.original_data, dataToUse.data, dataToUse.client_email, dataToUse.client_name);
      
      if (changes.length > 0) {
        setChangeSets([{
          id: dataToUse.id,
          proposalId: dataToUse.id,
          changes,
          clientEmail: dataToUse.client_email,
          clientName: dataToUse.client_name,
          clientComment: dataToUse.client_comment || '',
          status: dataToUse.pending_review ? 'pending' : (dataToUse.status === 'approved' ? 'approved' : 'pending'),
          submittedAt: dataToUse.updated_at,
          reviewedBy: null,
          reviewedAt: null,
          changeSource: dataToUse.change_source || 'client',
          userId: dataToUse.user_id
        }]);
      } else {
        setChangeSets([]);
      }
    } catch (err) {
      console.error('Error tracking changes:', err);
      setChangeSets([]);
    }
  };

  useEffect(() => {
    if (displayData?.clientLogoUrl) {
      setLogoUrl(displayData.clientLogoUrl);
    } else {
      setLogoUrl('');
    }
  }, [displayData?.clientLogoUrl]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo file must be less than 5MB');
      return;
    }
    
    if (!user) {
      setLogoUploadError('You must be logged in to upload files. Please log in and try again.');
      return;
    }
    
    setLogoUploadError(null);
    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${id}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('client-logos')
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('client-logos')
        .getPublicUrl(fileName);
      
      setLogoUrl(publicUrlData.publicUrl);
      setLogoFile(file);
      setHasChanges(true);
      setEditedData((prev: any) => ({ ...prev, clientLogoUrl: publicUrlData.publicUrl }));
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setLogoUploadError(err.message || 'Failed to upload logo. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value);
    setLogoFile(null);
    setLogoUploadError(null);
    setHasChanges(true);
    setEditedData((prev: any) => ({ ...prev, clientLogoUrl: e.target.value }));
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoFile(null);
    setLogoUploadError(null);
    setHasChanges(true);
    setEditedData((prev: any) => ({ ...prev, clientLogoUrl: '' }));
  };

  const handleFieldChange = (path: (string | number)[], value: any) => {
    if (!editedData || !isEditing) return;

    const newData = { ...editedData };
    let current = newData;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) {
        current[key] = typeof path[i + 1] === 'number' ? [] : {};
      }
      current = current[key];
    }

    current[path[path.length - 1]] = value;
    
    // If pricing changed, recalculate totals
    if (path[0] === 'mindfulnessProgram' && path[1] === 'pricing') {
      recalculatePricing(newData);
    }
    
    setEditedData(newData);
    setHasChanges(true);
  };

  // Fetch all proposals in the same group
  const fetchProposalOptions = async () => {
    if (!id) return;
    
    try {
      // First, get the current proposal to check if it's part of a group
      const { data: currentProposal, error: currentError } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();

      if (currentError || !currentProposal) {
        setProposalOptions([]);
        return;
      }

      const groupId = currentProposal.proposal_group_id || currentProposal.id;

      // Fetch all proposals in the group (including both regular and mindfulness proposals)
      const { data: options, error } = await supabase
        .from('proposals')
        .select('id, option_name, option_order, status, client_name, created_at, proposal_group_id, proposal_type')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`)
        .order('option_order', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching proposal options:', error);
        setProposalOptions([]);
        return;
      }

      // Show all proposals in the group (both regular and mindfulness)
      // Sort by option_order, with nulls last, then by created_at
      const sortedOptions = (options || []).sort((a, b) => {
        if (a.option_order !== null && b.option_order !== null) {
          return a.option_order - b.option_order;
        }
        if (a.option_order !== null) return -1;
        if (b.option_order !== null) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setProposalOptions(sortedOptions);
    } catch (err) {
      console.error('Error fetching proposal options:', err);
      setProposalOptions([]);
    }
  };

  // Create a duplicate proposal as a new option
  const handleCreateOption = async () => {
    if (!id || !proposal || !displayData) return;

    setIsCreatingOption(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a proposal');

      // Determine the group ID - use existing group_id or current proposal ID as the group anchor
      const { data: currentProposalData } = await supabase
        .from('proposals')
        .select('proposal_group_id')
        .eq('id', id)
        .single();

      const groupId = currentProposalData?.proposal_group_id || id;

      // Get the next option order
      const { data: existingOptions } = await supabase
        .from('proposals')
        .select('option_order')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`);

      const maxOrder = existingOptions?.reduce((max, opt) => 
        opt.option_order !== null && opt.option_order > max ? opt.option_order : max, 0
      ) || 0;
      const nextOrder = maxOrder + 1;

      // Create duplicate proposal data
      const duplicateData = {
        data: displayData,
        customization: proposal.customization,
        is_editable: true,
        user_id: user.id,
        status: 'draft',
        pending_review: false,
        has_changes: false,
        original_data: displayData,
        client_name: displayData.clientName?.trim() || proposal.client_name?.trim() || '',
        notes: '',
        proposal_group_id: groupId,
        option_name: `Option ${nextOrder}`,
        option_order: nextOrder,
        client_email: proposal.client_email,
        client_logo_url: proposal.client_logo_url,
        proposal_type: 'mindfulness-program'
      };

      // If this is the first option (current proposal doesn't have a group), update it too
      if (!currentProposalData?.proposal_group_id) {
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: 'Option 1',
            option_order: 1
          })
          .eq('id', id);
      }

      const { data: newProposal, error } = await supabase
        .from('proposals')
        .insert(duplicateData)
        .select()
        .single();

      if (error) throw error;
      if (!newProposal) throw new Error('No proposal data returned after creation');

      // Refresh options list
      await fetchProposalOptions();
      
      // Navigate to the new proposal
      navigate(`/proposal/${newProposal.id}`);
    } catch (err) {
      console.error('Error creating option:', err);
      alert(err instanceof Error ? err.message : 'Failed to create option');
    } finally {
      setIsCreatingOption(false);
    }
  };

  // Update option name
  const handleUpdateOptionName = async (optionId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .update({ option_name: newName.trim() })
        .eq('id', optionId);

      if (error) throw error;

      await fetchProposalOptions();
      setEditingOptionName(null);
      setOptionNameInput('');
    } catch (err) {
      console.error('Error updating option name:', err);
      alert(err instanceof Error ? err.message : 'Failed to update option name');
    }
  };

  // Reorder options
  const handleReorderOption = async (optionId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ option_order: newOrder })
        .eq('id', optionId);

      if (error) throw error;

      await fetchProposalOptions();
    } catch (err) {
      console.error('Error reordering option:', err);
      alert(err instanceof Error ? err.message : 'Failed to reorder option');
    }
  };

  // Fetch available proposals to link (exclude current proposal and proposals already in a different group)
  const fetchAvailableProposals = async () => {
    if (!id) return;

    try {
      // Get current proposal's group ID
      const { data: currentProposal } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();

      const currentGroupId = currentProposal?.proposal_group_id || currentProposal?.id;

      // Fetch all proposals except the current one (both regular and mindfulness)
      const { data: allProposals, error } = await supabase
        .from('proposals')
        .select('id, client_name, created_at, proposal_group_id, option_name, status, proposal_type')
        .neq('id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter proposals that can be linked:
      // 1. Not already in a different group, OR
      // 2. Already in the same group (shouldn't happen, but handle it)
      const available = (allProposals || []).filter((p: any) => {
        // If proposal has no group, it can be linked
        if (!p.proposal_group_id) return true;
        // If proposal is in the same group, it's already linked (shouldn't show)
        if (p.proposal_group_id === currentGroupId) return false;
        // If proposal is in a different group, don't show it (would require ungrouping first)
        return false;
      });

      setAvailableProposals(available);
    } catch (err) {
      console.error('Error fetching available proposals:', err);
      setAvailableProposals([]);
    }
  };

  const handleOpenLinkProposalsModal = async () => {
    setShowLinkProposalsModal(true);
    setSelectedProposalsToLink([]);
    setSearchTerm('');
    await fetchAvailableProposals();
  };

  // Link selected proposals to current group
  const handleLinkProposals = async () => {
    if (!id || selectedProposalsToLink.length === 0) return;

    setIsLinkingProposals(true);
    try {
      // Get current proposal's group ID
      const { data: currentProposal } = await supabase
        .from('proposals')
        .select('id, proposal_group_id')
        .eq('id', id)
        .single();

      const groupId = currentProposal?.proposal_group_id || currentProposal?.id;

      // If current proposal doesn't have a group, create one
      if (!currentProposal?.proposal_group_id) {
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: 'Option 1',
            option_order: 1
          })
          .eq('id', id);
      }

      // Get current max order in the group
      const { data: existingOptions } = await supabase
        .from('proposals')
        .select('option_order')
        .or(`proposal_group_id.eq.${groupId},id.eq.${groupId}`);

      const maxOrder = existingOptions?.reduce((max, opt) => 
        opt.option_order !== null && opt.option_order > max ? opt.option_order : max, 0
      ) || 0;

      // Link each selected proposal
      for (let i = 0; i < selectedProposalsToLink.length; i++) {
        const proposalId = selectedProposalsToLink[i];
        const newOrder = maxOrder + i + 1;

        // Check if proposal is already in another group
        const { data: proposal } = await supabase
          .from('proposals')
          .select('proposal_group_id, option_name')
          .eq('id', proposalId)
          .single();

        if (proposal?.proposal_group_id && proposal.proposal_group_id !== groupId) {
          // Proposal is in another group - ask for confirmation or just proceed
          // For now, we'll proceed and move it to this group
        }

        await supabase
          .from('proposals')
          .update({
            proposal_group_id: groupId,
            option_name: proposal?.option_name || `Option ${newOrder}`,
            option_order: newOrder
          })
          .eq('id', proposalId);
      }

      // Refresh options list
      await fetchProposalOptions();
      setShowLinkProposalsModal(false);
      setSelectedProposalsToLink([]);
    } catch (err) {
      console.error('Error linking proposals:', err);
      alert(err instanceof Error ? err.message : 'Failed to link proposals');
    } finally {
      setIsLinkingProposals(false);
    }
  };

  // Filter proposals based on search term
  const filteredAvailableProposals = availableProposals.filter((p: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.client_name?.toLowerCase().includes(search) ||
      p.id?.toLowerCase().includes(search) ||
      p.option_name?.toLowerCase().includes(search)
    );
  });

  // Remove option from group (unlink it, don't delete the proposal)
  const handleRemoveOption = async (optionId: string, optionName: string) => {
    if (!id || !optionId) return;

    // Confirm removal
    if (!window.confirm(`Are you sure you want to remove "${optionName || 'this option'}" from the group? The proposal will remain but will no longer be part of this option set.`)) {
      return;
    }

    setDeletingOptionId(optionId);
    try {
      // If removing the current proposal, we need to handle it differently
      if (optionId === id) {
        // Get the group ID
        const { data: currentProposal } = await supabase
          .from('proposals')
          .select('proposal_group_id')
          .eq('id', id)
          .single();

        const groupId = currentProposal?.proposal_group_id;

        // Unlink this proposal from the group
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: null,
            option_name: null,
            option_order: null
          })
          .eq('id', id);

        // If there are other proposals in the group, update them
        if (groupId) {
          const { data: otherOptions } = await supabase
            .from('proposals')
            .select('id, option_order')
            .eq('proposal_group_id', groupId)
            .neq('id', id)
            .order('option_order', { ascending: true });

          // Renumber remaining options
          if (otherOptions && otherOptions.length > 0) {
            for (let i = 0; i < otherOptions.length; i++) {
              await supabase
                .from('proposals')
                .update({ option_order: i + 1 })
                .eq('id', otherOptions[i].id);
            }
          }
        }
      } else {
        // Just unlink the other proposal
        await supabase
          .from('proposals')
          .update({
            proposal_group_id: null,
            option_name: null,
            option_order: null
          })
          .eq('id', optionId);

        // Renumber remaining options
        const { data: currentProposal } = await supabase
          .from('proposals')
          .select('proposal_group_id')
          .eq('id', id)
          .single();

        if (currentProposal?.proposal_group_id) {
          const { data: otherOptions } = await supabase
            .from('proposals')
            .select('id, option_order')
            .eq('proposal_group_id', currentProposal.proposal_group_id)
            .neq('id', optionId)
            .order('option_order', { ascending: true });

          if (otherOptions && otherOptions.length > 0) {
            for (let i = 0; i < otherOptions.length; i++) {
              await supabase
                .from('proposals')
                .update({ option_order: i + 1 })
                .eq('id', otherOptions[i].id);
            }
          }
        }
      }

      await fetchProposalOptions();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error removing option:', err);
      alert(err instanceof Error ? err.message : 'Failed to remove option');
    } finally {
      setDeletingOptionId(null);
    }
  };

  const recalculatePricing = (data: any) => {
    if (!data.mindfulnessProgram) return;
    
    const program = data.mindfulnessProgram;
    const pricing = program.pricing || {};
    const inPersonPrice = pricing.inPersonPricePerSession || 1500;
    const virtualPrice = pricing.virtualPricePerSession || 1250;
    const resourcesPrice = pricing.resourcesPrice || 2000;
    const discountPercent = pricing.discountPercent || 0;
    
    const inPersonSessions = program.inPersonSessions || 0;
    const virtualSessions = program.virtualSessions || 0;
    
    const inPersonTotal = inPersonSessions * inPersonPrice;
    const virtualTotal = virtualSessions * virtualPrice;
    const subtotal = inPersonTotal + virtualTotal + resourcesPrice;
    
    // Calculate discount amount and final total
    const discountAmount = subtotal * (discountPercent / 100);
    const totalCost = subtotal - discountAmount;
    
    // Update pricing object
    if (!data.mindfulnessProgram.pricing) {
      data.mindfulnessProgram.pricing = {};
    }
    
    data.mindfulnessProgram.pricing.inPersonTotal = inPersonTotal;
    data.mindfulnessProgram.pricing.virtualTotal = virtualTotal;
    data.mindfulnessProgram.pricing.subtotal = subtotal;
    data.mindfulnessProgram.pricing.discountPercent = discountPercent;
    data.mindfulnessProgram.pricing.discountAmount = discountAmount;
    data.mindfulnessProgram.pricing.totalCost = totalCost;
    data.mindfulnessProgram.pricing.costPerParticipant = data.summary?.totalAppointments > 0
      ? totalCost / data.summary.totalAppointments
      : 0;
    data.mindfulnessProgram.pricing.costPerSession = program.totalSessions > 0
      ? totalCost / program.totalSessions
      : 0;
    
    // Update summary
    if (!data.summary) {
      data.summary = {};
    }
    data.summary.totalEventCost = totalCost;
    
    // Update fixedPrice in services
    if (data.services?.['mindfulness-program']?.['program-overview']?.services?.[0]) {
      data.services['mindfulness-program']['program-overview'].services[0].fixedPrice = totalCost;
    }
  };

  const toggleEditMode = () => {
    if (isEditing && hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to exit edit mode?')) {
        return;
      }
    }
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedData({ ...displayData });
    } else {
      setEditedData(displayData);
      setHasChanges(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!id || !editedData) return;
    
    try {
      setIsSavingChanges(true);

      // Regenerate proposal data if program was updated, but preserve custom pricing
      let finalData = editedData;
      if (editedData.mindfulnessProgram?.programId) {
        try {
          const programId = editedData.mindfulnessProgram.programId;
          const latestProgram = await MindfulnessProgramService.getProgram(programId);
          const latestSessions = await MindfulnessProgramService.getSessionsByProgram(programId);
          
          if (latestProgram && latestSessions.length > 0) {
            // Preserve pricing BEFORE regeneration (so we don't lose discount)
            const preservedPricing = editedData.mindfulnessProgram?.pricing ? {
              inPersonPricePerSession: editedData.mindfulnessProgram.pricing.inPersonPricePerSession,
              virtualPricePerSession: editedData.mindfulnessProgram.pricing.virtualPricePerSession,
              resourcesPrice: editedData.mindfulnessProgram.pricing.resourcesPrice,
              discountPercent: editedData.mindfulnessProgram.pricing.discountPercent ?? 0
            } : undefined;
            
            console.log('💾 Preserving pricing before regeneration:', preservedPricing);
            
            // Generate base proposal data with preserved pricing
            finalData = generateMindfulnessProposalData(
              latestProgram,
              latestSessions,
              editedData.clientName || 'Client',
              editedData.clientEmail,
              preservedPricing // Pass preserved pricing to generator
            );
            
            // Recalculate totals to ensure they're correct (generator should have preserved pricing, but verify)
            if (preservedPricing && finalData.mindfulnessProgram?.pricing) {
              recalculatePricing(finalData);
              console.log('✅ Pricing preserved and recalculated after regeneration:', finalData.mindfulnessProgram.pricing);
            }
            
            finalData.clientLogoUrl = editedData.clientLogoUrl;
            finalData.clientName = editedData.clientName;
            finalData.clientEmail = editedData.clientEmail;
            finalData.customization = editedData.customization;
          }
        } catch (err) {
          console.warn('Could not regenerate proposal data:', err);
        }
      } else {
        // If no program regeneration, ensure pricing is recalculated
        // Pricing should already be in editedData, just ensure it's in finalData
        if (editedData.mindfulnessProgram?.pricing && finalData.mindfulnessProgram) {
          finalData.mindfulnessProgram.pricing = {
            ...editedData.mindfulnessProgram.pricing
          };
          recalculatePricing(finalData);
          console.log('✅ Pricing preserved without regeneration:', finalData.mindfulnessProgram.pricing);
        }
      }

      // Ensure clientName is always set (required by database NOT NULL constraint)
      const clientNameToSave = finalData.clientName?.trim() || editedData.clientName?.trim() || proposal?.client_name || 'Client';
      
      console.log('🔍 Saving proposal changes:', {
        id,
        clientName: clientNameToSave,
        clientEmail: finalData.clientEmail,
        hasData: !!finalData,
        hasCustomization: !!finalData.customization,
        dataKeys: finalData ? Object.keys(finalData) : []
      });

      // Ensure we preserve proposal_type if it exists
      const updatePayload: any = {
        data: finalData,
        customization: editedData?.customization || proposal?.customization,
        clientLogoUrl: finalData.clientLogoUrl,
        clientName: clientNameToSave,
        clientEmail: finalData.clientEmail,
        changeSource: 'staff'
      };
      
      // Preserve proposal_type if it exists on the proposal
      if (proposal?.proposal_type) {
        updatePayload.proposal_type = proposal.proposal_type;
      }
      
      // Final validation: Ensure pricing is in finalData before saving
      if (finalData.mindfulnessProgram && !finalData.mindfulnessProgram.pricing) {
        console.error('❌ Pricing is missing from finalData before save!');
        throw new Error('Pricing data is missing. Please try again.');
      }

      console.log('💾 Saving proposal with pricing:', {
        inPersonPrice: finalData.mindfulnessProgram?.pricing?.inPersonPricePerSession,
        virtualPrice: finalData.mindfulnessProgram?.pricing?.virtualPricePerSession,
        resourcesPrice: finalData.mindfulnessProgram?.pricing?.resourcesPrice,
        discountPercent: finalData.mindfulnessProgram?.pricing?.discountPercent,
        discountAmount: finalData.mindfulnessProgram?.pricing?.discountAmount,
        subtotal: finalData.mindfulnessProgram?.pricing?.subtotal,
        totalCost: finalData.mindfulnessProgram?.pricing?.totalCost,
        fullPricingObject: finalData.mindfulnessProgram?.pricing
      });
      
      await updateProposal(id, updatePayload);
      
      // Verify pricing was saved by checking the response
      console.log('✅ Proposal saved. Pricing should now be in database:', {
        pricingInFinalData: !!finalData.mindfulnessProgram?.pricing,
        discountPercent: finalData.mindfulnessProgram?.pricing?.discountPercent
      });
      
      setIsEditing(false);
      setDisplayData(finalData);
      setEditedData(finalData);
      setHasChanges(false);
      setProposal((prev: any) => prev ? { ...prev, data: finalData } : null);
      
      // Refresh change sets
      await fetchChangeSets({ ...proposal, data: finalData });
      
      // Refresh proposal options
      await fetchProposalOptions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      setLoadError(errorMessage);
      console.error('❌ Error saving changes:', error);
      if (error && typeof error === 'object') {
        console.error('❌ Error details:', {
          message: 'message' in error ? error.message : 'Unknown',
          details: 'details' in error ? error.details : undefined,
          hint: 'hint' in error ? error.hint : undefined,
          code: 'code' in error ? error.code : undefined,
          fullError: error
        });
      }
      alert(`Failed to save changes: ${errorMessage}\n\nCheck the browser console for more details.`);
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;

    try {
      setIsSavingNotes(true);
      const { error } = await supabase
        .from('proposals')
        .update({
          notes,
          has_changes: true,
          pending_review: true
        })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving notes:', err);
      setLoadError('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const filename = `${displayData.clientName?.replace(/\s+/g, '-').toLowerCase() || 'mindfulness-program'}-proposal.pdf`;
      await generatePDF('proposal-content', filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const copyShareLink = async () => {
    if (!id) return;
    try {
      const shareUrl = getProposalUrl(id, true);
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link to clipboard');
    }
  };

  const openSendToClientModal = () => {
    setClientName(displayData?.clientName || '');
    setClientEmail(proposal?.client_email || '');
    setShareNote(`Hi ${displayData?.clientName || 'there'},

I'm excited to share your custom mindfulness program proposal with you! This proposal has been carefully crafted based on your specific needs and requirements.

Please review the proposal and let me know if you have any questions or would like to make any adjustments.

Best regards,
The Shortcut Team`);
    setShowSendToClientModal(true);
  };

  const handleSendToClient = async () => {
    if (!id || !clientEmail.trim()) {
      alert('Please enter a valid client email address.');
      return;
    }
    
    try {
      setIsSharing(true);
      
      if (clientEmail !== proposal?.client_email) {
        const { error: updateError } = await supabase
          .from('proposals')
          .update({ client_email: clientEmail })
          .eq('id', id);

        if (updateError) throw updateError;
      }
      
      const response = await fetch(`${config.supabase.url}/functions/v1/proposal-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          proposalId: id,
          clientEmail: clientEmail,
          clientName: clientName.trim() || displayData?.clientName,
          shareNote: shareNote.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send proposal');
      }

      setShowSendToClientModal(false);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 5000);
    } catch (err) {
      console.error('Error sending proposal:', err);
      alert('Failed to send proposal. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading || contextLoading) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-shortcut-navy-blue"></div>
      </div>
    );
  }

  if (loadError || !displayData) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-medium text-center">
          <div className="text-red-500 mb-4">
            <X size={48} className="mx-auto" />
          </div>
          <p className="text-xl text-red-500 mb-4">{loadError || 'Proposal not found'}</p>
          <Button 
            onClick={() => navigate('/')}
            variant="primary"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const program = displayData.mindfulnessProgram;
  if (!program) {
    return (
      <div className="min-h-screen bg-neutral-light-gray flex items-center justify-center">
        <div className="card-medium text-center">
          <p className="text-xl text-red-500 mb-4">This proposal is not a mindfulness program</p>
          <Button onClick={() => navigate('/')} variant="primary">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray">
      <header className="bg-white shadow-sm sticky top-0 z-50 rounded-b-3xl">
        {/* Action Buttons Section - Distinguished with background */}
        <div className="bg-neutral-light-gray py-3 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
            <Button
              onClick={handleDownload}
              variant="secondary"
              icon={<Download size={18} />}
              loading={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button
              onClick={openSendToClientModal}
              variant="secondary"
              icon={<Send size={18} />}
              loading={isSharing}
            >
              {isSharing ? 'Sending...' : 'Send to Client'}
            </Button>
            {isEditing ? (
              <Button
                onClick={handleSaveChanges}
                variant="primary"
                icon={<Save size={18} />}
                loading={isSavingChanges}
              >
                {isSavingChanges ? 'Saving...' : 'Save Changes'}
              </Button>
            ) : (
              <Button
                onClick={toggleEditMode}
                variant="primary"
                icon={<Edit size={18} />}
              >
                Edit
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                onClick={copyShareLink}
                variant="secondary"
                icon={showCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              >
                {showCopied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            {changeSets.length > 0 && (
              <Button
                onClick={() => setShowChangeHistory(!showChangeHistory)}
                variant="secondary"
                icon={<HistoryIcon size={18} />}
              >
                {showChangeHistory ? 'Hide' : 'Show'} History
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Logo editing controls (edit mode only) */}
      {isEditing && (
        <div className="max-w-7xl mx-auto mt-6 px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Logo Card */}
            <div className="card-medium">
              <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">Client Logo</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">Upload Logo File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    disabled={logoUploading}
                    className="block w-full text-sm text-text-dark-60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-shortcut-teal file:text-shortcut-navy-blue hover:file:bg-shortcut-teal hover:file:bg-opacity-80"
                  />
                  <p className="text-xs text-text-dark-60 mt-1">Max 5MB. PNG, JPG, SVG, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">Or Paste Image URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={handleLogoUrlChange}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
                    disabled={logoUploading}
                  />
                </div>
                {logoUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-bold text-shortcut-blue mb-2">Preview</p>
                    <div className="relative inline-block">
                      <img src={logoUrl} alt="Client Logo Preview" className="h-20 rounded shadow border border-gray-200" />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        disabled={logoUploading}
                        title="Remove logo"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                {logoUploadError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {logoUploadError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Proposal Options Management Section */}
      {proposalOptions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
          <div className="card-medium">
            <h3 className="text-lg font-extrabold text-shortcut-blue mb-4">Proposal Options</h3>
            <div className="space-y-3">
              {proposalOptions.map((option, index) => {
                const isCurrent = option.id === id;
                return (
                  <div
                    key={option.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                      isCurrent
                        ? 'border-shortcut-teal bg-shortcut-teal bg-opacity-10'
                        : 'border-gray-200 bg-white hover:border-shortcut-teal hover:bg-neutral-light-gray'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-bold text-shortcut-blue min-w-[60px]">
                        {option.option_name || `Option ${index + 1}`}
                      </span>
                      {option.proposal_type === 'mindfulness-program' && (
                        <span className="text-xs font-semibold text-shortcut-navy-blue bg-purple-100 px-2 py-1 rounded-full flex items-center gap-1">
                          <Brain size={12} />
                          Mindfulness
                        </span>
                      )}
                      {option.proposal_type === 'event' && (
                        <span className="text-xs font-semibold text-shortcut-navy-blue bg-shortcut-teal bg-opacity-20 px-2 py-1 rounded-full">
                          Event
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs font-semibold text-shortcut-navy-blue bg-shortcut-teal bg-opacity-20 px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                      {option.status === 'approved' && (
                        <span className="text-xs font-semibold text-shortcut-navy-blue bg-shortcut-teal bg-opacity-20 px-2 py-1 rounded-full">
                          Approved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <>
                          {editingOptionName === option.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={optionNameInput}
                                onChange={(e) => setOptionNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateOptionName(option.id, optionNameInput);
                                  } else if (e.key === 'Escape') {
                                    setEditingOptionName(null);
                                    setOptionNameInput('');
                                  }
                                }}
                                className="px-2 py-1 text-sm border-2 border-shortcut-teal rounded focus:outline-none focus:ring-2 focus:ring-shortcut-teal"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateOptionName(option.id, optionNameInput)}
                                className="p-1 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingOptionName(null);
                                  setOptionNameInput('');
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingOptionName(option.id);
                                setOptionNameInput(option.option_name || `Option ${index + 1}`);
                              }}
                              className="p-1.5 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                              title="Edit name"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={() => navigate(`/proposal/${option.id}`)}
                          variant="secondary"
                          size="sm"
                        >
                          View
                        </Button>
                      )}
                      {index > 0 && (
                        <button
                          onClick={() => handleReorderOption(option.id, option.option_order! - 1)}
                          className="p-1.5 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                          title="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                      )}
                      {index < proposalOptions.length - 1 && (
                        <button
                          onClick={() => handleReorderOption(option.id, option.option_order! + 1)}
                          className="p-1.5 text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20 rounded transition-colors"
                          title="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (showDeleteConfirm === option.id) {
                            handleRemoveOption(option.id, option.option_name || `Option ${index + 1}`);
                          } else {
                            setShowDeleteConfirm(option.id);
                          }
                        }}
                        disabled={deletingOptionId === option.id}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title={showDeleteConfirm === option.id ? "Confirm removal" : "Remove from group"}
                      >
                        {showDeleteConfirm === option.id ? (
                          <Check size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                      {showDeleteConfirm === option.id && (
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="p-1.5 text-text-dark-60 hover:bg-gray-100 rounded transition-colors"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
              <Button
                onClick={handleCreateOption}
                variant="primary"
                icon={<Plus size={18} />}
                loading={isCreatingOption}
                size="md"
              >
                {isCreatingOption ? 'Creating...' : 'Add Another Option'}
              </Button>
              <Button
                onClick={handleOpenLinkProposalsModal}
                variant="secondary"
                size="md"
              >
                Link Existing Proposal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Another Option Button (when no options exist yet) */}
      {proposalOptions.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
          <div className="card-medium">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-shortcut-blue mb-2">Create Proposal Options</h3>
                <p className="text-sm text-text-dark-60">
                  Create multiple proposal variations for your client to compare and choose from.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateOption}
                  variant="primary"
                  icon={<Plus size={18} />}
                  loading={isCreatingOption}
                  size="md"
                >
                  {isCreatingOption ? 'Creating...' : 'Add Another Option'}
                </Button>
                <Button
                  onClick={handleOpenLinkProposalsModal}
                  variant="secondary"
                  size="md"
                >
                  Link Existing Proposal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-6 px-4" id="proposal-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {/* Summary-First Layout - Key Metrics at Top */}
            <div className="card-large mb-8">
              <div className="mb-8">
                {/* Header with Logo and Client Name */}
                <div className="flex flex-row justify-between items-start mb-8">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData?.clientName || ''}
                        onChange={(e) => handleFieldChange(['clientName'], e.target.value)}
                        className="text-4xl font-extrabold text-shortcut-navy-blue w-full px-3 py-2 border-2 border-shortcut-teal rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal mb-3"
                        placeholder="Enter client name"
                      />
                    ) : (
                      <h1 className="h1 mb-3">
                        {displayData.clientName}
                      </h1>
                    )}
                    {/* Only show program name if it's different from client name */}
                    {program?.programName && 
                     program.programName !== (editedData?.clientName || displayData.clientName) && 
                     !(editedData?.clientName || displayData.clientName)?.includes(program.programName) &&
                     program.programName.trim() !== '' && (
                      <h2 className="text-2xl font-bold text-shortcut-navy-blue">
                        {program.programName}
                      </h2>
                    )}
                  </div>
                  {displayData.clientLogoUrl && (
                    <div className="flex justify-end ml-6">
                      <img
                        src={displayData.clientLogoUrl}
                        alt={`${displayData.clientName} Logo`}
                        className="max-h-20 max-w-full object-contain rounded-lg shadow-sm"
                        style={{ maxWidth: '300px' }}
                        onError={(e) => {
                          console.error('Logo failed to load:', displayData.clientLogoUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Program Intro Copy - Enhanced Design */}
                {(displayData.customization?.programIntroCopy || isEditing) && (
                  <div className="mt-10 pt-10">
                    {isEditing ? (
                      <div>
                        <label className="block text-sm font-bold text-shortcut-blue mb-3 uppercase tracking-wider">Program Introduction</label>
                        <textarea
                          value={editedData?.customization?.programIntroCopy || ''}
                          onChange={(e) => {
                            const updatedData = { ...editedData };
                            if (!updatedData.customization) {
                              updatedData.customization = {};
                            }
                            updatedData.customization.programIntroCopy = e.target.value;
                            setEditedData(updatedData);
                            setHasChanges(true);
                          }}
                          placeholder="Enter program introduction copy..."
                          className="w-full min-h-[180px] p-6 border-2 border-shortcut-teal border-opacity-30 rounded-xl focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y text-lg text-text-dark leading-relaxed font-medium bg-gradient-to-br from-shortcut-teal/5 to-transparent"
                          rows={8}
                        />
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl p-8 border-2 border-shortcut-teal border-opacity-20">
                        <p className="text-lg text-text-dark leading-relaxed font-medium whitespace-pre-line">
                          {displayData.customization?.programIntroCopy}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div>
                  <p className="text-sm font-bold text-shortcut-blue mb-1">Program Dates</p>
                  <p className="text-base font-medium text-text-dark">
                    {program.startDate && program.endDate 
                      ? `${program.startDate} – ${program.endDate}`
                      : 'Dates TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-shortcut-blue mb-1">Total Sessions</p>
                  <p className="text-base font-medium text-text-dark">{program.totalSessions || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-shortcut-blue mb-1">Facilitator</p>
                  <p className="text-base font-medium text-text-dark">{program.facilitatorName || '-'}</p>
                </div>
              </div>
            </div>

            {/* Proposal Content */}
            <MindfulnessProposalContent 
              data={isEditing ? editedData : displayData} 
              customization={displayData?.customization}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Summary Card */}
            <div className="card-large">
              <h2 className="text-xl font-extrabold text-shortcut-blue mb-6">Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-semibold">Total Sessions:</span>
                  <span className="font-bold text-lg">{program.totalSessions || 0}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-semibold">In-Person Sessions:</span>
                  <span className="font-bold text-lg">{program.inPersonSessions || 0}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-semibold">Virtual Sessions:</span>
                  <span className="font-bold text-lg">{program.virtualSessions || 0}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="font-semibold">Total Cost:</span>
                  <span className="font-bold text-lg">
                    ${((isEditing ? editedData?.mindfulnessProgram?.pricing?.totalCost : program.pricing?.totalCost) || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing Card - Always Visible */}
            <div className="card-large bg-gradient-to-br from-shortcut-teal/5 to-white border-2 border-shortcut-teal border-opacity-20">
              <h2 className="text-xl font-extrabold text-shortcut-blue mb-6">Pricing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    In-Person Price Per Session
                  </label>
                  {isEditing ? (
                    <EditableField
                      value={String(editedData?.mindfulnessProgram?.pricing?.inPersonPricePerSession || 1500)}
                      onChange={(value) => handleFieldChange(['mindfulnessProgram', 'pricing', 'inPersonPricePerSession'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                      type="number"
                      prefix="$"
                      isEditing={isEditing}
                    />
                  ) : (
                    <p className="text-base font-medium text-text-dark">
                      ${(displayData?.mindfulnessProgram?.pricing?.inPersonPricePerSession || 1500).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-text-dark-60 mt-1">
                    {program.inPersonSessions || 0} session{program.inPersonSessions !== 1 ? 's' : ''} × ${(isEditing ? (editedData?.mindfulnessProgram?.pricing?.inPersonPricePerSession || 1500) : (displayData?.mindfulnessProgram?.pricing?.inPersonPricePerSession || 1500)).toLocaleString()} = ${((program.inPersonSessions || 0) * (isEditing ? (editedData?.mindfulnessProgram?.pricing?.inPersonPricePerSession || 1500) : (displayData?.mindfulnessProgram?.pricing?.inPersonPricePerSession || 1500))).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    Virtual Price Per Session
                  </label>
                  {isEditing ? (
                    <EditableField
                      value={String(editedData?.mindfulnessProgram?.pricing?.virtualPricePerSession || 1250)}
                      onChange={(value) => handleFieldChange(['mindfulnessProgram', 'pricing', 'virtualPricePerSession'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                      type="number"
                      prefix="$"
                      isEditing={isEditing}
                    />
                  ) : (
                    <p className="text-base font-medium text-text-dark">
                      ${(displayData?.mindfulnessProgram?.pricing?.virtualPricePerSession || 1250).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-text-dark-60 mt-1">
                    {program.virtualSessions || 0} session{program.virtualSessions !== 1 ? 's' : ''} × ${(isEditing ? (editedData?.mindfulnessProgram?.pricing?.virtualPricePerSession || 1250) : (displayData?.mindfulnessProgram?.pricing?.virtualPricePerSession || 1250)).toLocaleString()} = ${((program.virtualSessions || 0) * (isEditing ? (editedData?.mindfulnessProgram?.pricing?.virtualPricePerSession || 1250) : (displayData?.mindfulnessProgram?.pricing?.virtualPricePerSession || 1250))).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    Resources Price
                  </label>
                  {isEditing ? (
                    <EditableField
                      value={String(editedData?.mindfulnessProgram?.pricing?.resourcesPrice || 2000)}
                      onChange={(value) => handleFieldChange(['mindfulnessProgram', 'pricing', 'resourcesPrice'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                      type="number"
                      prefix="$"
                      isEditing={isEditing}
                    />
                  ) : (
                    <p className="text-base font-medium text-text-dark">
                      ${(displayData?.mindfulnessProgram?.pricing?.resourcesPrice || 2000).toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">
                    Discount Percentage
                  </label>
                  {isEditing ? (
                    <EditableField
                      value={String(editedData?.mindfulnessProgram?.pricing?.discountPercent || 0)}
                      onChange={(value) => handleFieldChange(['mindfulnessProgram', 'pricing', 'discountPercent'], typeof value === 'string' ? parseFloat(value) || 0 : value)}
                      type="number"
                      suffix="%"
                      isEditing={isEditing}
                    />
                  ) : (
                    <p className="text-base font-medium text-text-dark">
                      {(displayData?.mindfulnessProgram?.pricing?.discountPercent || 0)}%
                    </p>
                  )}
                </div>
                <div className="pt-4 border-t-2 border-shortcut-teal border-opacity-20 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base text-shortcut-navy-blue">Subtotal:</span>
                    <span className="font-semibold text-base text-shortcut-navy-blue">
                      ${((isEditing ? editedData?.mindfulnessProgram?.pricing?.subtotal : displayData?.mindfulnessProgram?.pricing?.subtotal) || 
                          ((isEditing ? editedData?.mindfulnessProgram?.pricing?.inPersonTotal : displayData?.mindfulnessProgram?.pricing?.inPersonTotal) || 0) +
                          ((isEditing ? editedData?.mindfulnessProgram?.pricing?.virtualTotal : displayData?.mindfulnessProgram?.pricing?.virtualTotal) || 0) +
                          ((isEditing ? editedData?.mindfulnessProgram?.pricing?.resourcesPrice : displayData?.mindfulnessProgram?.pricing?.resourcesPrice) || 2000)
                        ).toLocaleString()}
                    </span>
                  </div>
                  {((isEditing ? editedData?.mindfulnessProgram?.pricing?.discountPercent : displayData?.mindfulnessProgram?.pricing?.discountPercent) || 0) > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span className="font-semibold text-base">Discount ({((isEditing ? editedData?.mindfulnessProgram?.pricing?.discountPercent : displayData?.mindfulnessProgram?.pricing?.discountPercent) || 0)}%):</span>
                      <span className="font-semibold text-base">
                        -${((isEditing ? editedData?.mindfulnessProgram?.pricing?.discountAmount : displayData?.mindfulnessProgram?.pricing?.discountAmount) || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-extrabold text-lg text-shortcut-navy-blue">Total Cost:</span>
                    <span className="font-extrabold text-xl text-shortcut-navy-blue">
                      ${((isEditing ? editedData?.mindfulnessProgram?.pricing?.totalCost : displayData?.mindfulnessProgram?.pricing?.totalCost) || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information Card */}
            <div className="card-large">
              <h2 className="text-xl font-extrabold text-shortcut-blue mb-6">Client Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">Client Name</label>
                  {isEditing ? (
                    <EditableField
                      value={editedData?.clientName || ''}
                      onChange={(value) => handleFieldChange(['clientName'], value)}
                      type="text"
                      placeholder="Enter client name"
                    />
                  ) : (
                    <p className="text-base font-medium text-text-dark">{displayData?.clientName || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">Client Email</label>
                  {isEditing ? (
                    <EditableField
                      value={editedData?.clientEmail || ''}
                      onChange={(value) => handleFieldChange(['clientEmail'], value)}
                      type="email"
                      placeholder="Enter client email"
                    />
                  ) : (
                    <p className="text-base font-medium text-text-dark">{displayData?.clientEmail || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-shortcut-blue mb-2">Program Name</label>
                  <p className="text-base font-medium text-text-dark">
                    {program?.programName || '-'}
                    <span className="ml-2 text-xs text-gray-500">
                      (Edit in <button onClick={() => navigate('/mindfulness-programs')} className="text-shortcut-blue hover:underline">Program Manager</button>)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Note from Shortcut Card */}
            {(displayData.customization?.customNote || isEditing) && (
              <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-shortcut-teal"></div>
                  <h2 className="text-xl font-extrabold text-shortcut-navy-blue">Note from Shortcut</h2>
                </div>
                {isEditing ? (
                  <textarea
                    value={editedData?.customization?.customNote || ''}
                    onChange={(e) => {
                      const updatedData = { ...editedData };
                      if (!updatedData.customization) {
                        updatedData.customization = {};
                      }
                      updatedData.customization.customNote = e.target.value;
                      setEditedData(updatedData);
                      setHasChanges(true);
                    }}
                    placeholder="Enter a note for the client..."
                    className="w-full min-h-[100px] p-4 border-2 border-shortcut-teal border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y font-medium text-base text-text-dark leading-relaxed bg-white"
                    rows={4}
                  />
                ) : (
                  <p className="text-base text-text-dark leading-relaxed font-medium">
                    {displayData.customization?.customNote?.replace('above', 'below') || ''}
                  </p>
                )}
              </div>
            )}

            {/* Notes Card */}
            <div className="card-large">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-xl font-extrabold text-shortcut-blue">Notes</h2>
                {notes && (
                  <Button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    variant="primary"
                    icon={<Save size={18} />}
                    className="w-full sm:w-auto"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or comments about the proposal here..."
                className="w-full min-h-[120px] p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal resize-y font-medium"
              />
            </div>
          </div>
        </div>

        {/* Change History Section */}
        {changeSets.length > 0 && (
          <div className="mt-8 card-large">
            <div className="flex items-center justify-between mb-6">
              <h2 className="h2 flex items-center">
                <HistoryIcon size={24} className="mr-3 text-shortcut-blue" />
                Change History
              </h2>
              <Button
                onClick={() => setShowChangeHistory(!showChangeHistory)}
                variant="secondary"
                size="sm"
              >
                {showChangeHistory ? 'Hide' : 'Show'} Changes
              </Button>
            </div>

            {showChangeHistory && (
              <div className="space-y-6">
                {/* Group changes by source */}
                {(() => {
                  const clientChanges = changeSets.filter(cs => cs.changeSource === 'client');
                  const staffChanges = changeSets.filter(cs => cs.changeSource === 'staff' || cs.changeSource === 'admin');
                  
                  return (
                    <>
                      {/* Client Changes Section */}
                      {clientChanges.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-gray-200"></div>
                            <h3 className="text-lg font-extrabold text-shortcut-blue flex items-center gap-2">
                              <User size={20} className="text-shortcut-teal-blue" />
                              Client Changes
                            </h3>
                            <div className="h-px flex-1 bg-gray-200"></div>
                          </div>
                          {clientChanges.map((changeSet) => (
                            <div key={changeSet.id} className="card-small border-2 border-gray-200">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <User size={16} className="text-text-dark-60" />
                                    <span className="text-sm font-extrabold text-shortcut-blue">{changeSet.clientName || 'Unknown Client'}</span>
                                  </div>
                                  {changeSet.clientEmail && (
                                    <div className="flex items-center gap-2">
                                      <Mail size={16} className="text-text-dark-60" />
                                      <span className="text-xs text-text-dark-60">{changeSet.clientEmail}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-text-dark-60" />
                                    <span className="text-xs text-text-dark-60">
                                      {format(new Date(changeSet.submittedAt), 'MMM d, yyyy h:mm a')}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <ChangeSourceBadge 
                                    changeSource={changeSet.changeSource} 
                                    userId={changeSet.userId}
                                    size="sm"
                                  />
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    changeSet.status === 'pending' ? 'bg-shortcut-service-yellow bg-opacity-20 text-shortcut-dark-blue' :
                                    changeSet.status === 'approved' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {changeSet.status === 'pending' ? 'Pending Review' :
                                     changeSet.status === 'approved' ? 'Approved' : 'Rejected'}
                                  </span>
                                </div>
                              </div>

                              {changeSet.clientComment && (
                                <div className="mb-3 p-3 bg-white rounded border-l-4 border-shortcut-teal shadow-sm">
                                  <div className="text-xs font-extrabold text-shortcut-navy-blue mb-1 uppercase tracking-wide">Client Comment</div>
                                  <p className="text-sm text-text-dark font-medium">{changeSet.clientComment}</p>
                                </div>
                              )}

                              {changeSet.changes && changeSet.changes.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="text-xs font-extrabold text-shortcut-navy-blue mb-3 uppercase tracking-wide">
                                    Changes Made ({changeSet.changes.length})
                                  </div>
                                  <div className="space-y-2">
                                    {changeSet.changes.slice(0, 5).map((change) => {
                                      const displayInfo = getChangeDisplayInfo(change);
                                      return (
                                        <div key={change.id} className="p-2 bg-neutral-light-gray rounded-lg">
                                          <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="text-xs font-extrabold text-shortcut-blue flex-1">{displayInfo.fieldName}</div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
                                              displayInfo.changeType === 'add' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                                              displayInfo.changeType === 'remove' ? 'bg-red-100 text-red-700' :
                                              'bg-neutral-light-gray text-shortcut-blue'
                                            }`}>
                                              {displayInfo.changeType === 'add' ? 'Added' : displayInfo.changeType === 'remove' ? 'Removed' : 'Updated'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs flex-wrap">
                                            {displayInfo.changeType === 'add' && (
                                              <>
                                                <span className="text-text-dark-60 italic">No previous value</span>
                                                <span className="text-shortcut-navy-blue font-bold">→</span>
                                                <span className="font-bold text-shortcut-navy-blue">{displayInfo.newValueDisplay}</span>
                                              </>
                                            )}
                                            {displayInfo.changeType === 'remove' && (
                                              <>
                                                <span className="line-through text-text-dark-60">{displayInfo.oldValueDisplay}</span>
                                                <span className="text-shortcut-navy-blue font-bold">→</span>
                                                <span className="text-text-dark-60 italic">Removed</span>
                                              </>
                                            )}
                                            {displayInfo.changeType === 'update' && (
                                              <>
                                                <span className="line-through text-text-dark-60">{displayInfo.oldValueDisplay}</span>
                                                <span className="text-shortcut-teal-blue font-bold">→</span>
                                                <span className="font-bold text-shortcut-navy-blue">{displayInfo.newValueDisplay}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {changeSet.changes.length > 5 && (
                                      <div className="text-xs text-text-dark-60 text-center py-1">
                                        ... and {changeSet.changes.length - 5} more change{changeSet.changes.length - 5 !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Staff Changes Section */}
                      {staffChanges.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-gray-200"></div>
                            <h3 className="text-lg font-extrabold text-shortcut-blue flex items-center gap-2">
                              <Briefcase size={20} className="text-shortcut-teal-blue" />
                              Shortcut Staff Changes
                            </h3>
                            <div className="h-px flex-1 bg-gray-200"></div>
                          </div>
                          {staffChanges.map((changeSet) => (
                            <div key={changeSet.id} className="card-small border-2 border-gray-200">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <Briefcase size={16} className="text-text-dark-60" />
                                    <span className="text-sm font-extrabold text-shortcut-blue">Shortcut Staff</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-text-dark-60" />
                                    <span className="text-xs text-text-dark-60">
                                      {format(new Date(changeSet.submittedAt), 'MMM d, yyyy h:mm a')}
                                    </span>
                                  </div>
                                </div>
                                <ChangeSourceBadge 
                                  changeSource={changeSet.changeSource} 
                                  userId={changeSet.userId}
                                  size="sm"
                                />
                              </div>

                              {changeSet.changes && changeSet.changes.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="text-xs font-extrabold text-shortcut-navy-blue mb-3 uppercase tracking-wide">
                                    Changes Made ({changeSet.changes.length})
                                  </div>
                                  <div className="space-y-2">
                                    {changeSet.changes.slice(0, 5).map((change) => {
                                      const displayInfo = getChangeDisplayInfo(change);
                                      return (
                                        <div key={change.id} className="p-2 bg-neutral-light-gray rounded-lg">
                                          <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="text-xs font-extrabold text-shortcut-blue flex-1">{displayInfo.fieldName}</div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
                                              displayInfo.changeType === 'add' ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue' :
                                              displayInfo.changeType === 'remove' ? 'bg-red-100 text-red-700' :
                                              'bg-neutral-light-gray text-shortcut-blue'
                                            }`}>
                                              {displayInfo.changeType === 'add' ? 'Added' : displayInfo.changeType === 'remove' ? 'Removed' : 'Updated'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs flex-wrap">
                                            {displayInfo.changeType === 'update' && (
                                              <>
                                                <span className="line-through text-text-dark-60">{displayInfo.oldValueDisplay}</span>
                                                <span className="text-shortcut-teal-blue font-bold">→</span>
                                                <span className="font-bold text-shortcut-navy-blue">{displayInfo.newValueDisplay}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {changeSet.changes.length > 5 && (
                                      <div className="text-xs text-text-dark-60 text-center py-1">
                                        ... and {changeSet.changes.length - 5} more change{changeSet.changes.length - 5 !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Share Modal */}
      {showSendToClientModal && (
        <ShareProposalModal
          onClose={() => {
            setShowSendToClientModal(false);
            setClientName('');
            setClientEmail('');
            setShareNote('');
          }}
          onShare={handleSendToClient}
          clientName={clientName}
          setClientName={setClientName}
          clientEmail={clientEmail}
          setClientEmail={setClientEmail}
          shareNote={shareNote}
          setShareNote={setShareNote}
          isSharing={isSharing}
          proposalId={id || ''}
        />
      )}

      {/* Link Existing Proposals Modal */}
      {showLinkProposalsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
          <div className="card-large max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="mb-6 pb-4 border-b-2 border-shortcut-teal border-opacity-20">
              <h3 className="text-2xl font-extrabold text-shortcut-navy-blue mb-2">
                Link Existing Proposals
              </h3>
              <p className="text-base text-text-dark-60">
                Select one or more existing proposals to link to this group. They will become options that clients can switch between.
              </p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search by client name, proposal ID, or option name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal text-base"
              />
            </div>

            {/* Proposal List */}
            <div className="flex-1 overflow-y-auto mb-6 space-y-3 border-2 border-gray-200 rounded-xl p-4 bg-neutral-light-gray max-h-96">
              {filteredAvailableProposals.length === 0 ? (
                <div className="text-center text-text-dark-60 py-8">
                  {searchTerm ? 'No proposals found matching your search.' : 'No available proposals to link.'}
                </div>
              ) : (
                filteredAvailableProposals.map((proposal: any) => {
                  const isSelected = selectedProposalsToLink.includes(proposal.id);
                  
                  return (
                    <div
                      key={proposal.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProposalsToLink(prev => prev.filter(id => id !== proposal.id));
                        } else {
                          setSelectedProposalsToLink(prev => [...prev, proposal.id]);
                        }
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-shortcut-teal bg-shortcut-teal bg-opacity-10 shadow-md'
                          : 'border-gray-200 bg-white hover:border-shortcut-teal hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-shortcut-blue">
                              {proposal.client_name || 'Unnamed Client'}
                            </span>
                            {proposal.proposal_type === 'mindfulness-program' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-shortcut-pink/20 text-shortcut-navy-blue border border-shortcut-pink/30">
                                <Brain size={12} />
                                Mindfulness
                              </span>
                            )}
                            {proposal.proposal_type !== 'mindfulness-program' && proposal.proposal_type && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-shortcut-teal/20 text-shortcut-navy-blue border border-shortcut-teal/30">
                                Event
                              </span>
                            )}
                            {proposal.option_name && (
                              <span className="text-xs text-text-dark-60">
                                ({proposal.option_name})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-dark-60">
                            Created: {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                          </div>
                          {proposal.status && (
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                              proposal.status === 'approved' 
                                ? 'bg-shortcut-teal bg-opacity-20 text-shortcut-navy-blue'
                                : 'bg-gray-200 text-text-dark-60'
                            }`}>
                              {proposal.status}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          {isSelected ? (
                            <CheckCircle2 size={20} className="text-shortcut-teal" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-6 border-t-2 border-shortcut-teal border-opacity-20">
              <Button
                onClick={() => {
                  setShowLinkProposalsModal(false);
                  setSelectedProposalsToLink([]);
                  setSearchTerm('');
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkProposals}
                variant="primary"
                className="flex-1"
                loading={isLinkingProposals}
                disabled={selectedProposalsToLink.length === 0}
              >
                {isLinkingProposals 
                  ? 'Linking...' 
                  : `Link ${selectedProposalsToLink.length} Proposal${selectedProposalsToLink.length !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindfulnessProposalViewer;

