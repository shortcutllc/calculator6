# Proposal Options/Combined Proposals Feature Plan

## Overview
Allow clients to view multiple proposal options (e.g., 2 events, 3 events, 4 events) in a single view with the ability to toggle between them. This eliminates the need to create and share separate proposals for each option.

## Current System
- Each proposal is standalone with a unique ID
- Sharing: `/proposal/:id?shared=true`
- Approval: Individual proposal approval
- No way to link related proposals together

## Proposed Solution

### 1. Database Schema Changes

#### Option A: Add `proposal_group_id` to proposals table (Recommended)
```sql
-- Add proposal_group_id column to link proposals together
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS proposal_group_id uuid;

-- Add option_name for labeling (e.g., "Option 1: 2 Events", "Option 2: 3 Events")
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS option_name text;

-- Add option_order for sorting (1, 2, 3, etc.)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS option_order integer;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_proposals_group_id ON proposals(proposal_group_id);

-- Add comment
COMMENT ON COLUMN proposals.proposal_group_id IS 'Links proposals together as options. All proposals with the same group_id are part of the same option set.';
COMMENT ON COLUMN proposals.option_name IS 'Display name for this option (e.g., "2 Events", "3 Events", "Quarterly")';
COMMENT ON COLUMN proposals.option_order IS 'Order in which options should be displayed (1, 2, 3, etc.)';
```

**Benefits:**
- Simple to implement
- Backward compatible (existing proposals have NULL group_id)
- Easy to query all options in a group
- Can have a "primary" proposal (first one created) that acts as the group identifier

#### Option B: Create separate `proposal_groups` table
```sql
CREATE TABLE proposal_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users,
  group_name text, -- e.g., "Event Options for Acme Corp"
  primary_proposal_id uuid REFERENCES proposals(id),
  created_by uuid REFERENCES auth.users
);

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS proposal_group_id uuid REFERENCES proposal_groups(id);
```

**Benefits:**
- More normalized structure
- Can store group-level metadata
- More flexible for future features

**Recommendation:** Option A is simpler and sufficient for current needs.

### 2. UI Changes

#### StandaloneProposalViewer.tsx Updates

**Add Option Switcher at Top:**
```tsx
// New state
const [proposalOptions, setProposalOptions] = useState<any[]>([]);
const [currentOptionIndex, setCurrentOptionIndex] = useState(0);
const [isLoadingOptions, setIsLoadingOptions] = useState(false);

// Fetch all proposals in the same group
useEffect(() => {
  const fetchProposalOptions = async () => {
    if (!proposal?.proposal_group_id) return;
    
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('proposal_group_id', proposal.proposal_group_id)
      .order('option_order', { ascending: true });
    
    if (!error && data) {
      setProposalOptions(data);
      // Find current proposal index
      const currentIndex = data.findIndex(p => p.id === id);
      if (currentIndex >= 0) {
        setCurrentOptionIndex(currentIndex);
      }
    }
  };
  
  fetchProposalOptions();
}, [proposal?.proposal_group_id, id]);

// Option Switcher Component (add before main content)
{proposalOptions.length > 1 && (
  <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-sm font-bold text-shortcut-blue whitespace-nowrap">
          View Options:
        </span>
        {proposalOptions.map((option, index) => (
          <button
            key={option.id}
            onClick={() => {
              navigate(`/proposal/${option.id}?shared=true`);
            }}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              option.id === id
                ? 'bg-shortcut-navy-blue text-white'
                : 'bg-neutral-light-gray text-shortcut-blue hover:bg-shortcut-teal hover:bg-opacity-20'
            }`}
          >
            {option.option_name || `Option ${index + 1}`}
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

**Design Considerations:**
- Tab-style buttons at the top (below navigation, above proposal content)
- Active option highlighted with navy blue background
- Smooth transition when switching
- Show option name or default to "Option 1", "Option 2", etc.
- Mobile-friendly horizontal scroll

### 3. Proposal Creation Flow

#### In ProposalViewer or Home Component

**Add "Create Option Set" Feature:**
1. After creating first proposal, show option to "Add Another Option"
2. When creating additional options:
   - Copy base data from first proposal
   - Allow editing (e.g., change number of events)
   - Automatically link via `proposal_group_id`
   - Set `option_order` sequentially
   - Set `option_name` (e.g., "2 Events", "3 Events", "4 Events")

**UI Flow:**
```
[Create Proposal] → [Generate] → [View Proposal]
                              ↓
                    [Add Another Option] button
                              ↓
                    [Edit Proposal Data] → [Generate Option 2]
                              ↓
                    [Add Another Option] button (if needed)
                              ↓
                    [Share All Options] → Client sees switcher
```

### 4. Sharing Mechanism Updates

#### Update `proposal-share` Edge Function

**Current:** Shares single proposal URL
**New:** Share primary proposal URL, but detect if it's part of a group

```typescript
// In proposal-share/index.ts
const { data: proposal } = await supabase
  .from('proposals')
  .select('*, proposal_group_id')
  .eq('id', proposalId)
  .single();

// If part of a group, the URL will automatically show the switcher
// The primary proposal ID can be used, or we can use the group_id
const proposalUrl = proposal.proposal_group_id 
  ? `${SITE_URL}/proposal/${proposalId}?shared=true&group=${proposal.proposal_group_id}`
  : `${SITE_URL}/proposal/${proposalId}?shared=true`;
```

**Email Copy Update:**
- "We've prepared multiple options for your review. Click below to view and compare them."

### 5. Approval Workflow

#### Considerations:
- **Option 1:** Client approves one specific option
  - Only that proposal's status changes to 'approved'
  - Other options remain 'pending' or can be marked as 'not_selected'
  
- **Option 2:** Client can approve multiple options
  - Each option can be approved independently
  - Useful if they want both "2 Events" and "3 Events" approved

- **Option 3:** Client must choose one option
  - Approval of one option automatically marks others as 'rejected' or 'not_selected'

**Recommendation:** Option 1 - Allow independent approval of each option. This gives maximum flexibility.

**UI Changes:**
- Approval button shows "Approve This Option"
- After approval, show message: "This option has been approved. You can still view other options."
- Option switcher shows status badges (Approved, Pending, etc.)

### 6. URL Structure

**Current:** `/proposal/:id?shared=true`
**New:** 
- Still works: `/proposal/:id?shared=true` (detects group automatically)
- Alternative: `/proposal-group/:group_id?shared=true` (shows first option by default)

**Implementation:**
- Check if proposal has `proposal_group_id`
- If yes, fetch all options and show switcher
- If no, display normally (backward compatible)

### 7. Admin/Staff View

#### In ProposalViewer.tsx
- Show indicator if proposal is part of a group
- Link to view all options in the group
- Ability to add/remove options from group
- Ability to reorder options

### 8. Implementation Phases

#### Phase 1: Database & Basic Linking
1. Add migration for `proposal_group_id`, `option_name`, `option_order`
2. Update TypeScript types
3. Update proposal creation to support grouping

#### Phase 2: UI - Option Switcher
1. Add option switcher to `StandaloneProposalViewer.tsx`
2. Fetch and display all options in group
3. Handle navigation between options
4. Style according to `MASTER_STYLE_GUIDE.md`

#### Phase 3: Creation Flow
1. Add "Add Another Option" button after proposal creation
2. Create option linking UI in `ProposalViewer.tsx`
3. Allow editing option names and order

#### Phase 4: Sharing & Approval
1. Update sharing email copy
2. Update approval workflow for option sets
3. Add status indicators to option switcher

#### Phase 5: Admin Tools
1. Add group management in `ProposalViewer.tsx`
2. Add ability to combine existing proposals into groups
3. Add ability to remove proposals from groups

### 9. Edge Cases & Considerations

1. **What if a proposal in a group is deleted?**
   - Other proposals remain in group
   - If primary proposal deleted, use next proposal as primary

2. **What if client shares a non-primary proposal?**
   - Still works - detect group and show switcher
   - Current proposal is highlighted

3. **Change tracking:**
   - Each proposal tracks changes independently
   - Change history is per-proposal, not per-group

4. **Survey responses:**
   - Survey is per-proposal (not per-group)
   - Each option can have its own survey response

5. **Pricing options:**
   - Each proposal maintains its own pricing options
   - No cross-proposal pricing comparison needed

### 10. Example User Flow

**Staff creates options:**
1. Create Proposal for "Acme Corp - 2 Events" → Generate
2. Click "Add Another Option"
3. Edit to "3 Events" → Generate Option 2
4. Click "Add Another Option"  
5. Edit to "4 Events" → Generate Option 3
6. Share primary proposal

**Client receives:**
1. Email with link to proposal
2. Opens link, sees 3 tabs: "2 Events", "3 Events", "4 Events"
3. Clicks through each option to compare
4. Approves "3 Events" option
5. Other options remain viewable but not approved

### 11. Design Mockup Concept

```
┌─────────────────────────────────────────────────────────┐
│ [Shortcut Logo]                    [Help] [Approve] [Edit]│
├─────────────────────────────────────────────────────────┤
│ View Options: [2 Events] [3 Events] [4 Events] ← Active │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Proposal Content for Option 2: 3 Events]              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Questions to Consider

1. **Naming:** Should we call them "Options", "Variants", or "Scenarios"?
2. **Limit:** Maximum number of options per group? (Recommend: 5-10)
3. **Default:** When sharing, which option should be shown first? (Recommend: First/primary)
4. **Comparison:** Should we add a side-by-side comparison view? (Future enhancement)
5. **Export:** Should PDF export include all options or just current? (Recommend: Just current, with note about other options)

## Next Steps

1. Review and approve this plan
2. Create database migration
3. Implement Phase 1 (database & basic linking)
4. Test with 2-3 proposals
5. Implement Phase 2 (UI switcher)
6. Test full flow
7. Deploy incrementally

