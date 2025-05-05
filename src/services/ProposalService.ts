import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { Proposal, ProposalData, ProposalCustomization } from '../types/proposal';

export class ProposalService {
  // This would be implemented with Supabase in a real application
  // For now, we'll use localStorage as a simple storage mechanism
  
  static async getProposals(): Promise<Proposal[]> {
    try {
      const storedProposals = localStorage.getItem('proposals');
      return storedProposals ? JSON.parse(storedProposals) : [];
    } catch (error) {
      console.error('Error getting proposals:', error);
      return [];
    }
  }
  
  static async getProposalById(id: string): Promise<Proposal | null> {
    try {
      const proposals = await this.getProposals();
      return proposals.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Error getting proposal by ID:', error);
      return null;
    }
  }
  
  static async createProposal(
    data: ProposalData, 
    customization: ProposalCustomization,
    isPasswordProtected: boolean,
    password?: string,
    isEditable: boolean = true
  ): Promise<string> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const newProposal: Proposal = {
        id,
        createdAt: now,
        updatedAt: now,
        data,
        customization,
        isPasswordProtected,
        password,
        isEditable,
      };
      
      const proposals = await this.getProposals();
      proposals.push(newProposal);
      localStorage.setItem('proposals', JSON.stringify(proposals));
      
      return id;
    } catch (error) {
      console.error('Error creating proposal:', error);
      throw new Error('Failed to create proposal');
    }
  }
  
  static async updateProposal(id: string, updates: Partial<Proposal>): Promise<boolean> {
    try {
      const proposals = await this.getProposals();
      const index = proposals.findIndex(p => p.id === id);
      
      if (index === -1) return false;
      
      proposals[index] = {
        ...proposals[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('proposals', JSON.stringify(proposals));
      return true;
    } catch (error) {
      console.error('Error updating proposal:', error);
      return false;
    }
  }
  
  static async deleteProposal(id: string): Promise<boolean> {
    try {
      const proposals = await this.getProposals();
      const filteredProposals = proposals.filter(p => p.id !== id);
      
      localStorage.setItem('proposals', JSON.stringify(filteredProposals));
      return true;
    } catch (error) {
      console.error('Error deleting proposal:', error);
      return false;
    }
  }
}