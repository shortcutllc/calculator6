# Plan: Annual and Quarterly Recurring Event Contracts

## Current System Analysis

### Strengths:
- Proposal structure already supports multiple dates, locations, and services
- Client approval workflow is in place
- Change tracking system for both client and staff edits
- Post-approval survey collection system
- Multiple office locations support

### Gaps:
- No recurring/contract designation
- No contract term tracking (start/end dates, renewal dates)
- No template system for generating future proposals
- No contract status management
- No relationship between related proposals

---

## Proposed Solution Architecture

### 1. Database Schema Additions

**New Table: `recurring_contracts`**
```
- id (uuid, primary key)
- proposal_id (uuid, references proposals) - the "master" proposal
- contract_type ('annual' | 'quarterly')
- start_date (date)
- end_date (date)
- renewal_date (date) - next proposal generation date
- status ('active' | 'paused' | 'cancelled' | 'expired')
- auto_generate (boolean) - whether to auto-generate future proposals
- billing_frequency ('annual' | 'quarterly')
- created_at, updated_at
- user_id (uuid, references auth.users)
```

**New Table: `contract_proposals`** (Junction Table)
```
- id (uuid, primary key)
- contract_id (uuid, references recurring_contracts)
- proposal_id (uuid, references proposals)
- period_start (date)
- period_end (date)
- period_number (integer) - e.g., Q1 2025 = 1, Q2 2025 = 2
- status ('draft' | 'sent' | 'approved' | 'completed')
- created_at, updated_at
```

**Additions to Existing `proposals` Table:**
```
- is_recurring (boolean, default false)
- contract_id (uuid, nullable, references recurring_contracts)
- is_template (boolean, default false) - marks master/template proposals
- parent_proposal_id (uuid, nullable) - for tracking proposal lineage
```

### 2. User Interface Components

**A. Contract Creation Flow**
- Add "Recurring Contract" option in `ProposalOptionsModal.tsx`
  - Toggle: "Create as recurring contract"
  - Contract type selector: Annual / Quarterly
  - Start date picker
  - Auto-generate future proposals checkbox
- After proposal approval, show contract setup modal if recurring is selected

**B. Contract Management Dashboard**
- New route: `/contracts`
- List all recurring contracts with:
  - Client name
  - Contract type and status
  - Next renewal date
  - Total value
  - Number of proposals generated
- Actions: View contract, Pause/Resume, Cancel, Generate next proposal

**C. Contract Detail View**
- Timeline of all proposals in the contract
- Contract terms summary
- Billing history
- Renewal dates calendar
- Generate next period proposal button

**D. Enhanced Proposal Viewer**
- Badge/indicator if proposal is part of a contract
- Link to parent contract
- "Generate next period" button for staff
- Contract terms section in proposal display

### 3. Proposal Generation Logic

**Template-Based Generation:**
- When creating a recurring contract, mark the approved proposal as `is_template = true`
- Store the template proposal data structure
- Generate new proposals by:
  1. Copying template proposal data
  2. Updating dates for the new period (quarterly: +3 months, annual: +12 months)
  3. Adjusting event dates within the period
  4. Creating new proposal record linked to contract
  5. Auto-sending to client if configured

**Date Calculation Logic:**
- **Quarterly:** Generate Q1, Q2, Q3, Q4 proposals
  - Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
- **Annual:** Generate one proposal per year
  - Start date + 12 months for next period

**Service Date Adjustment:**
- For recurring contracts, event dates should be relative or pattern-based
- Options:
  - Fixed dates (e.g., "First Monday of each month")
  - Relative dates (e.g., "30 days after contract start")
  - Template dates that get adjusted by period offset

### 4. Workflow Enhancements

**Contract Creation Workflow:**
1. Staff creates proposal normally in Home.tsx
2. In ProposalOptionsModal, staff selects "Recurring Contract"
3. Staff selects contract type (Annual/Quarterly)
4. Proposal is created and sent to client
5. Client approves proposal
6. System prompts: "Create recurring contract?"
7. Staff confirms contract terms (start date, auto-generate, etc.)
8. Contract record created, proposal marked as template

**Proposal Generation Workflow:**
1. System checks for contracts with upcoming `renewal_date`
2. For auto-generate contracts, create new proposal automatically
3. For manual contracts, staff clicks "Generate Next Period"
4. New proposal created with updated dates
5. Proposal sent to client automatically or queued for review
6. Contract `renewal_date` updated to next period

**Client Experience:**
- Clients see contract badge on proposals
- Contract summary section showing:
  - Contract type and duration
  - Current period
  - Next renewal date
  - Total contract value

### 5. Business Logic Considerations

**Pricing Consistency:**
- Option to lock pricing for contract duration
- Or allow price adjustments per period with approval workflow
- Track pricing changes across periods

**Service Modifications:**
- Allow service changes per period
- Track changes across contract periods
- Option to require approval for service changes

**Contract Amendments:**
- Ability to pause contracts
- Modify contract terms mid-contract
- Handle early termination
- Track amendment history

**Billing Integration:**
- Track billing periods
- Link invoices to contract periods
- Payment status per period
- Contract value calculations

### 6. Implementation Phases

**Phase 1: Foundation**
- Database migrations for contract tables
- Add `is_recurring` and related fields to proposals
- Basic contract creation UI in ProposalOptionsModal
- Contract creation API/logic

**Phase 2: Contract Management**
- Contracts dashboard (`/contracts` route)
- Contract detail view
- Contract status management (pause/resume/cancel)
- Link proposals to contracts

**Phase 3: Proposal Generation**
- Template-based proposal generation logic
- Date calculation for quarterly/annual periods
- Auto-generation scheduling (cron job or scheduled function)
- Manual "Generate Next Period" functionality

**Phase 4: Enhanced Features**
- Contract terms display in proposals
- Client-facing contract summary
- Billing period tracking
- Contract amendment workflow
- Reporting and analytics

**Phase 5: Advanced Features**
- Automated email notifications for renewals
- Contract analytics dashboard
- Revenue forecasting based on contracts
- Contract templates library

### 7. Technical Considerations

**Date Handling:**
- Use date-fns for date calculations
- Handle timezone considerations
- Account for business days/holidays if needed
- Support for custom date patterns

**Data Integrity:**
- Ensure template proposals cannot be deleted if contract is active
- Cascade rules for contract cancellation
- Audit trail for contract changes

**Performance:**
- Index contract lookups
- Efficient querying for contract proposals
- Batch proposal generation if needed

**Notifications:**
- Email alerts for upcoming renewals
- Staff notifications for contracts needing attention
- Client notifications for new period proposals

---

## Recommended Next Steps

1. Review and approve this plan
2. Start with Phase 1 (database schema and basic contract creation)
3. Test with a single contract before scaling
4. Gather feedback from staff and clients
5. Iterate based on usage patterns

This plan builds on the existing proposal system and adds recurring contract capabilities without disrupting current workflows.



