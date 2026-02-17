# The Golden Loop: Controlled Feature Execution

**Mandatory:** This loop must be initialized at the start of every new feature or bug fix. Do not skip steps. Do not batch tasks.

## Step 1: PLAN MODE (The Architect)
### Goal
Define the smallest possible unit of progress.

### Instructions
**To AI:** "Read vision.md and AI_CONSTITUTION.md. Based on the current project state, propose ONE micro-step. Do not provide code yet."

### Success Criteria
The proposal must fit on a post-it note.

### Example
- "Create the Airtable 'Sessions' table schema"
- "Build the createSignal for the chat input in SolidJS"

## Step 2: REVIEW (The Gatekeeper)
### Goal
Eliminate scope creep before it starts.

### Action
You review the AI's proposal.

### Review Checklist
- [ ] Is this the smallest possible step?
- [ ] Does this introduce unnecessary dependencies?
- [ ] Does it respect the AI_CONSTITUTION.md boundaries (Frontend vs. n8n vs. DB)?

## Step 3: ACT MODE (The Builder)
### Goal
Precise implementation.

### Instructions
**To AI:** "Implement the approved step only. Modify only the relevant files/nodes. Ensure the code/logic follows the project's reactive patterns (SolidJS) or node structures (n8n)."

### Constraint
If the AI tries to refactor a different file "while it's at it," reject the output.

## Step 4: TEST IMMEDIATELY (The Quality Lead)
### Goal
Instant feedback.

### Action
Run the code or trigger the n8n webhook.

### Testing Protocol
- **If it works:** Move to Step 5
- **If it fails:** Stop everything. Do not add more features to "fix" it. Fix the specific failure and log the error in known_issues.md

## Step 5: LOG (The Memory)
### Goal
Prevent context drift and "AI amnesia."

### Logging Template
**Completed:** [What was done]  
**Status:** [Success/Failed]  
**Current State:** [What is the new baseline?]  
**Pending:** [What is the immediate next micro-step?]
