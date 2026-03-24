import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Ticket, Plane, Users, Megaphone, Palette, Monitor, HelpCircle,
  ChevronDown, ChevronUp, Plus, Trash2, Check, DollarSign,
  AlertTriangle, MoreVertical, ArrowUp, ArrowDown, FolderInput
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// --- Types ---

interface WorkhumanTask {
  id: string;
  title: string;
  completed: boolean;
  budget: number | null;
  section: string;
  budget_category: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// --- Constants ---

const SECTIONS = [
  { key: 'travel_logistics', label: 'Travel & Logistics', icon: Plane, budgetCategory: 'travel_lodging' as const },
  { key: 'operations_staffing', label: 'Operations & Staffing', icon: Users, budgetCategory: 'pro_cost' as const },
  { key: 'outreach_sales', label: 'Outreach & Sales', icon: Megaphone, budgetCategory: null },
  { key: 'booth_design', label: 'Booth Design & Physical Elements', icon: Palette, budgetCategory: 'booth_swag' as const },
  { key: 'digital_builds', label: 'Digital Builds', icon: Monitor, budgetCategory: null },
  { key: 'open_items', label: 'Open Items (Awaiting Workhuman)', icon: HelpCircle, budgetCategory: null },
] as const;

const BUDGET_CATEGORIES = [
  { key: 'booth_swag', label: 'Booth + Swag', color: 'bg-amber-100 text-amber-800', barColor: 'bg-amber-500' },
  { key: 'travel_lodging', label: 'Travel & Lodging', color: 'bg-sky-100 text-sky-800', barColor: 'bg-sky-500' },
  { key: 'sponsorship', label: 'Sponsorship', color: 'bg-rose-100 text-rose-800', barColor: 'bg-rose-500', fixed: 15000 },
  { key: 'pro_cost', label: 'Massage Pro Cost', color: 'bg-violet-100 text-violet-800', barColor: 'bg-violet-500' },
] as const;

const TOTAL_BUDGET = 25000;

const SEED_TASKS: Omit<WorkhumanTask, 'id' | 'created_at' | 'updated_at'>[] = [
  // Travel & Logistics
  { title: 'Book flights to Orlando (arrive Sun Apr 26, depart Wed Apr 30 or Thu May 1)', section: 'travel_logistics', budget_category: 'travel_lodging', budget: null, completed: false, sort_order: 1 },
  { title: 'Reserve hotel at Gaylord Palms (check Workhuman room block/discount code)', section: 'travel_logistics', budget_category: 'travel_lodging', budget: null, completed: false, sort_order: 2 },
  { title: 'Ground transportation — Pedro driving, bring car', section: 'travel_logistics', budget_category: 'travel_lodging', budget: null, completed: false, sort_order: 3 },
  { title: 'Register 4 complimentary expo-only passes through portal', section: 'travel_logistics', budget_category: null, budget: null, completed: false, sort_order: 4 },
  { title: 'Determine who gets the 4 passes (team vs. LMTs)', section: 'travel_logistics', budget_category: null, budget: null, completed: false, sort_order: 5 },
  { title: 'Confirm if LMTs need separate vendor/contractor passes from Workhuman', section: 'travel_logistics', budget_category: null, budget: null, completed: false, sort_order: 6 },

  // Operations & Staffing
  { title: 'Recruit 5-6 Florida-licensed massage therapists', section: 'operations_staffing', budget_category: 'pro_cost', budget: null, completed: false, sort_order: 1 },
  { title: 'Confirm LMTs bring own chairs and equipment', section: 'operations_staffing', budget_category: null, budget: null, completed: false, sort_order: 2 },
  { title: 'Plan rotation coverage across 3 days (~22 hours total)', section: 'operations_staffing', budget_category: null, budget: null, completed: false, sort_order: 3 },
  { title: 'Submit COI, licensure, workers comp waivers for each LMT', section: 'operations_staffing', budget_category: null, budget: null, completed: false, sort_order: 4 },
  { title: 'Equipment: towels, face cradle covers, sanitizer, supplies', section: 'operations_staffing', budget_category: 'pro_cost', budget: null, completed: false, sort_order: 5 },
  { title: 'iPad/tablet for check-in desk', section: 'operations_staffing', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 6 },
  { title: 'Cold scented towels setup and supplies', section: 'operations_staffing', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 7 },
  { title: 'Scent diffusers', section: 'operations_staffing', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 8 },
  { title: 'Warm uplighting for each massage bay', section: 'operations_staffing', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 9 },
  { title: 'Curate spa music playlist', section: 'operations_staffing', budget_category: null, budget: null, completed: false, sort_order: 10 },
  { title: 'Additional potted tropical plants', section: 'operations_staffing', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 11 },
  { title: 'Staff attire — branded polos or aprons', section: 'operations_staffing', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 12 },
  { title: 'Reduce stations during keynote (Wed 4:00–4:45 PM)', section: 'operations_staffing', budget_category: null, budget: null, completed: false, sort_order: 13 },

  // Outreach & Sales
  { title: 'Build Tier 1 target list (10-15 dream accounts)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 1 },
  { title: 'Build Tier 2 target list (20-30 strong fits)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 2 },
  { title: 'Research contacts on LinkedIn — identify specific attendees', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 3 },
  { title: 'LinkedIn outreach to Tier 1 targets (6 weeks out)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 4 },
  { title: 'Value-led email to Tier 1 and 2 contacts (4 weeks out)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 5 },
  { title: 'Use Workhuman mobile app to book 1:1 meetings', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 6 },
  { title: 'Cross-reference attendee list when it arrives (~Apr 13)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 7 },
  { title: 'Reserve 10-15 VIP massage slots for Tier 1 targets', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 8 },
  { title: 'Draft pre-event email sequences (hot, warm, cool)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 9 },
  { title: 'Draft post-event follow-up cadence (Day 1/3/7/10/14/30+)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 10 },
  { title: 'Update CRM with Workhuman event tag and lead scoring fields', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 11 },
  { title: 'Prepare LinkedIn outreach templates (pre + post event)', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 12 },
  { title: 'Design sales one-pager for charging bar conversations', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 13 },
  { title: 'Design + print brochure ("Real wellness, right between meetings.")', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 14 },
  { title: 'Set up Calendly link for follow-up emails', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 15 },
  { title: 'Brief team on ICP, talking points, and on-site roles', section: 'outreach_sales', budget_category: null, budget: null, completed: false, sort_order: 16 },

  // Booth Design & Physical Elements
  { title: 'Source privacy screen vendor (get dimensions)', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 1 },
  { title: 'Design privacy screen artwork (6 panels, different copy lines)', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 2 },
  { title: 'Order/produce privacy screens', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 3 },
  { title: 'Source charging bar table + 4 bar stools (Orlando rental)', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 4 },
  { title: 'Source + mount TV on stand for content loop', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 5 },
  { title: 'Design check-in counter vinyl wrap (confirm dimensions with Workhuman)', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 6 },
  { title: 'Submit logo through sponsor kit portal', section: 'booth_design', budget_category: null, budget: null, completed: false, sort_order: 7 },
  { title: 'Confirm back wall artwork scope with Darcy', section: 'booth_design', budget_category: null, budget: null, completed: false, sort_order: 8 },
  { title: 'Order branded sleep eye masks ("Slack. Zoom. Shortcut." line)', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 9 },
  { title: 'Order desk coasters ("This meeting could have been a massage.")', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 10 },
  { title: 'Order DND door hangers ("Employee is recharging. Check back never.")', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 11 },
  { title: 'Order microfiber cloths or tote bags with copy lines', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 12 },
  { title: 'Source facial mist / aromatherapy balls', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 13 },
  { title: 'Design + print flyer/brochure for desk', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 14 },
  { title: 'Menu board / standing sign content and design', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 15 },
  { title: 'Phone charging station branding ("Currently recharging. Both of you.")', section: 'booth_design', budget_category: 'booth_swag', budget: null, completed: false, sort_order: 16 },

  // Digital Builds
  { title: 'Build lite booking/sign-up page with qualifying questions', section: 'digital_builds', budget_category: null, budget: null, completed: false, sort_order: 1 },
  { title: 'Build confirmation email + SMS after booking (SendGrid + Twilio)', section: 'digital_builds', budget_category: null, budget: null, completed: false, sort_order: 2 },
  { title: 'Build post-event thank you email/text', section: 'digital_builds', budget_category: null, budget: null, completed: false, sort_order: 3 },
  { title: 'Build landing page that auto-loads after booking (with conference map)', section: 'digital_builds', budget_category: null, budget: null, completed: false, sort_order: 4 },
  { title: 'Build TV content loop web app (fullscreen route, timed rotation)', section: 'digital_builds', budget_category: null, budget: null, completed: false, sort_order: 5 },
  { title: 'Generate QR codes for on-site signage linking to booking page', section: 'digital_builds', budget_category: null, budget: null, completed: false, sort_order: 6 },
  { title: 'Set up Workhuman-specific pricing in proposal system', section: 'digital_builds', budget_category: null, budget: null, completed: false, sort_order: 7 },

  // Open Items
  { title: 'Receive sample COI from conference center', section: 'open_items', budget_category: null, budget: null, completed: false, sort_order: 1 },
  { title: 'Confirm privacy screens approval in buildout', section: 'open_items', budget_category: null, budget: null, completed: false, sort_order: 2 },
  { title: 'Clarify branding opportunities beyond back wall + check-in desk', section: 'open_items', budget_category: null, budget: null, completed: false, sort_order: 3 },
  { title: 'Get artwork deadlines for custom buildout graphics', section: 'open_items', budget_category: null, budget: null, completed: false, sort_order: 4 },
  { title: 'Get portal access for employee registration and pass issuance', section: 'open_items', budget_category: null, budget: null, completed: false, sort_order: 5 },
  { title: 'Clarify "Gratitude Bar" vs "Gratitude Garden" naming', section: 'open_items', budget_category: null, budget: null, completed: false, sort_order: 6 },
];

// --- Helpers ---

function formatBudget(amount: number | null): string {
  if (amount === null || amount === 0) return '';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// --- Component ---

const WorkhumanProject: React.FC = () => {
  const [tasks, setTasks] = useState<WorkhumanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const newTaskRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);
  const seedingRef = useRef(false);

  // --- Data fetching ---

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('workhuman_tasks')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch tasks:', error);
      setLoading(false);
      return;
    }

    if (data.length === 0 && !seedingRef.current) {
      // Seed on first load — guard against double-seed from React strict mode
      seedingRef.current = true;
      const { error: seedError } = await supabase
        .from('workhuman_tasks')
        .insert(SEED_TASKS);

      if (seedError) {
        console.error('Failed to seed tasks:', seedError);
        seedingRef.current = false;
        setLoading(false);
        return;
      }

      // Re-fetch after seed
      const { data: seeded } = await supabase
        .from('workhuman_tasks')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      setTasks(seeded || []);
    } else {
      setTasks(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // --- CRUD ---

  const toggleComplete = async (id: string, current: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t));
    await supabase.from('workhuman_tasks').update({ completed: !current }).eq('id', id);
  };

  const updateTitle = async (id: string, title: string) => {
    if (!title.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: title.trim() } : t));
    setEditingId(null);
    await supabase.from('workhuman_tasks').update({ title: title.trim() }).eq('id', id);
  };

  const updateBudget = async (id: string, value: string) => {
    const budget = value ? parseFloat(value.replace(/[^0-9.]/g, '')) || null : null;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, budget } : t));
    setEditingBudgetId(null);
    await supabase.from('workhuman_tasks').update({ budget }).eq('id', id);
  };

  const addTask = async (section: string) => {
    if (!newTaskTitle.trim()) return;
    const sectionDef = SECTIONS.find(s => s.key === section);
    const maxOrder = tasks.filter(t => t.section === section).reduce((max, t) => Math.max(max, t.sort_order), 0);

    const { data, error } = await supabase
      .from('workhuman_tasks')
      .insert({
        title: newTaskTitle.trim(),
        section,
        budget_category: sectionDef?.budgetCategory || null,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setTasks(prev => [...prev, data]);
    }
    setNewTaskTitle('');
    setAddingToSection(null);
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('workhuman_tasks').delete().eq('id', id);
  };

  const moveToSection = async (id: string, newSection: string) => {
    const sectionDef = SECTIONS.find(s => s.key === newSection);
    const maxOrder = tasks.filter(t => t.section === newSection).reduce((max, t) => Math.max(max, t.sort_order), 0);
    const updates = {
      section: newSection,
      budget_category: sectionDef?.budgetCategory || null,
      sort_order: maxOrder + 1,
    };
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setMenuOpenId(null);
    await supabase.from('workhuman_tasks').update(updates).eq('id', id);
  };

  const reorderTask = async (id: string, direction: 'up' | 'down', sectionKey: string) => {
    const sectionTasks = tasks
      .filter(t => t.section === sectionKey)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = sectionTasks.findIndex(t => t.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sectionTasks.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const thisTask = sectionTasks[idx];
    const swapTask = sectionTasks[swapIdx];

    // Swap sort_orders
    setTasks(prev => prev.map(t => {
      if (t.id === thisTask.id) return { ...t, sort_order: swapTask.sort_order };
      if (t.id === swapTask.id) return { ...t, sort_order: thisTask.sort_order };
      return t;
    }));

    await Promise.all([
      supabase.from('workhuman_tasks').update({ sort_order: swapTask.sort_order }).eq('id', thisTask.id),
      supabase.from('workhuman_tasks').update({ sort_order: thisTask.sort_order }).eq('id', swapTask.id),
    ]);
  };

  // --- Computed ---

  const budgetSummary = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cat of BUDGET_CATEGORIES) {
      if ('fixed' in cat && cat.fixed) {
        totals[cat.key] = cat.fixed;
      } else {
        totals[cat.key] = tasks
          .filter(t => t.budget_category === cat.key && t.budget)
          .reduce((sum, t) => sum + (t.budget || 0), 0);
      }
    }
    // Also sum tasks without a category that have budgets
    const uncategorized = tasks
      .filter(t => !t.budget_category && t.budget)
      .reduce((sum, t) => sum + (t.budget || 0), 0);

    const total = Object.values(totals).reduce((s, v) => s + v, 0) + uncategorized;
    return { totals, uncategorized, total };
  }, [tasks]);

  const sectionProgress = useMemo(() => {
    const progress: Record<string, { total: number; completed: number }> = {};
    for (const s of SECTIONS) {
      const sectionTasks = tasks.filter(t => t.section === s.key);
      progress[s.key] = {
        total: sectionTasks.length,
        completed: sectionTasks.filter(t => t.completed).length,
      };
    }
    return progress;
  }, [tasks]);

  // --- Focus effects ---

  useEffect(() => {
    if (addingToSection && newTaskRef.current) newTaskRef.current.focus();
  }, [addingToSection]);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  useEffect(() => {
    if (editingBudgetId && budgetRef.current) budgetRef.current.focus();
  }, [editingBudgetId]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = () => setMenuOpenId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpenId]);

  // --- Section toggle ---

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09364f]" />
      </div>
    );
  }

  const overBudget = budgetSummary.total > TOTAL_BUDGET;
  const budgetPct = Math.min((budgetSummary.total / TOTAL_BUDGET) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Ticket className="text-[#09364f]" size={28} />
          <h1 className="text-3xl font-extrabold text-[#09364f]">Workhuman Live 2026</h1>
        </div>
        <p className="text-gray-500 ml-10">April 27–29 &middot; Gaylord Palms Resort, Orlando</p>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {BUDGET_CATEGORIES.map(cat => {
          const amount = budgetSummary.totals[cat.key] || 0;
          const isFixed = 'fixed' in cat && cat.fixed;
          return (
            <div key={cat.key} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{cat.label}</span>
                {isFixed && (
                  <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Fixed</span>
                )}
              </div>
              <p className="text-2xl font-bold text-[#09364f]">{formatBudget(amount) || '$0'}</p>
            </div>
          );
        })}
      </div>

      {/* Budget Total Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[#09364f]">Total Budget</span>
          <div className="flex items-center gap-2">
            {overBudget && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                <AlertTriangle size={14} /> Over budget
              </span>
            )}
            <span className={`text-sm font-bold ${overBudget ? 'text-red-600' : 'text-[#09364f]'}`}>
              {formatBudget(budgetSummary.total)} / {formatBudget(TOTAL_BUDGET)}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${overBudget ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
      </div>

      {/* Task Sections */}
      <div className="space-y-4">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          const isCollapsed = collapsedSections.has(section.key);
          const progress = sectionProgress[section.key] || { total: 0, completed: 0 };
          const sectionTasks = tasks.filter(t => t.section === section.key).sort((a, b) => a.sort_order - b.sort_order);

          return (
            <div key={section.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-[#09364f]" />
                  <span className="text-lg font-bold text-[#09364f]">{section.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    progress.completed === progress.total && progress.total > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {progress.completed}/{progress.total}
                  </span>
                  {isCollapsed ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronUp size={18} className="text-gray-400" />}
                </div>
              </button>

              {/* Task List */}
              {!isCollapsed && (
                <div className="border-t border-gray-100">
                  {sectionTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-b-0 group hover:bg-gray-50/50"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleComplete(task.id, task.completed)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          task.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-[#09364f]'
                        }`}
                      >
                        {task.completed && <Check size={12} strokeWidth={3} />}
                      </button>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        {editingId === task.id ? (
                          <input
                            ref={editRef}
                            defaultValue={task.title}
                            className="w-full text-sm bg-transparent border-b border-[#09364f] outline-none py-0.5"
                            onBlur={(e) => updateTitle(task.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updateTitle(task.id, (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => setEditingId(task.id)}
                            className={`text-sm cursor-pointer ${
                              task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                            }`}
                          >
                            {task.title}
                          </span>
                        )}
                      </div>

                      {/* Budget */}
                      <div className="flex-shrink-0 w-24 text-right">
                        {editingBudgetId === task.id ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <DollarSign size={12} className="text-gray-400" />
                            <input
                              ref={budgetRef}
                              defaultValue={task.budget || ''}
                              placeholder="0"
                              className="w-16 text-sm text-right bg-transparent border-b border-[#09364f] outline-none py-0.5"
                              onBlur={(e) => updateBudget(task.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') updateBudget(task.id, (e.target as HTMLInputElement).value);
                                if (e.key === 'Escape') setEditingBudgetId(null);
                              }}
                            />
                          </div>
                        ) : (
                          <span
                            onClick={() => setEditingBudgetId(task.id)}
                            className={`text-xs cursor-pointer ${
                              task.budget ? 'text-[#09364f] font-medium' : 'text-gray-300 hover:text-gray-400'
                            }`}
                          >
                            {task.budget ? formatBudget(task.budget) : '$ --'}
                          </span>
                        )}
                      </div>

                      {/* 3-dot menu */}
                      <div className="flex-shrink-0 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === task.id ? null : task.id); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#09364f] transition-all p-0.5"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {menuOpenId === task.id && (
                          <div
                            className="absolute right-0 top-6 z-50 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-72 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Move up/down */}
                            <button
                              onClick={() => { reorderTask(task.id, 'up', section.key); setMenuOpenId(null); }}
                              disabled={sectionTasks.indexOf(task) === 0}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowUp size={14} /> Move up
                            </button>
                            <button
                              onClick={() => { reorderTask(task.id, 'down', section.key); setMenuOpenId(null); }}
                              disabled={sectionTasks.indexOf(task) === sectionTasks.length - 1}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDown size={14} /> Move down
                            </button>

                            <div className="border-t border-gray-100 my-1" />

                            {/* Move to section */}
                            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Move to section</div>
                            {SECTIONS.filter(s => s.key !== section.key).map(s => {
                              const SIcon = s.icon;
                              return (
                                <button
                                  key={s.key}
                                  onClick={() => moveToSection(task.id, s.key)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <SIcon size={13} className="text-gray-400" /> {s.label}
                                </button>
                              );
                            })}

                            <div className="border-t border-gray-100 my-1" />

                            {/* Delete */}
                            <button
                              onClick={() => { deleteTask(task.id); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} /> Delete task
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Task */}
                  {addingToSection === section.key ? (
                    <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/50">
                      <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-200" />
                      <input
                        ref={newTaskRef}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title..."
                        className="flex-1 text-sm bg-transparent outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addTask(section.key);
                          if (e.key === 'Escape') { setAddingToSection(null); setNewTaskTitle(''); }
                        }}
                        onBlur={() => {
                          if (!newTaskTitle.trim()) { setAddingToSection(null); setNewTaskTitle(''); }
                        }}
                      />
                      <button
                        onClick={() => addTask(section.key)}
                        className="text-xs font-semibold text-[#09364f] hover:text-green-600"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingToSection(section.key); setNewTaskTitle(''); }}
                      className="flex items-center gap-2 px-5 py-3 text-sm text-gray-400 hover:text-[#09364f] transition-colors w-full"
                    >
                      <Plus size={14} /> Add task
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkhumanProject;
