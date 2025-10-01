# Tournament Detail - New Layout Structure

## Current Issues with My Previous Attempt:
- Didn't close all JSX tags properly
- Mixed old and new content sections
- Created duplicate `activeView === 'matches'` blocks
- Broke the JSX nesting structure

## Correct Approach:

### What needs to change in TournamentDetail.tsx:

1. **Add imports** (Line ~3):
```tsx
import { Card, CardHeader, CardContent, Badge, StatusBadge, Section, SectionHeader, SectionContent } from '../components/ui';
```

2. **Add 'teams' to TournamentView type** (Line ~113):
```tsx
type TournamentView = 'overview' | 'teams' | 'bracket' | ... 
```

3. **Wrap content in 3-column grid** (after line ~1360):
Replace the flat tab navigation with:
- Left sidebar (2 columns) - vertical nav buttons
- Center content (7 columns) - tab content  
- Right sidebar (3 columns) - quick info

4. **Split overview tab**:
- Move team lists to new 'teams' tab
- Keep only: description, progress stats in overview

5. **Preserve ALL existing tabs and their content**:
- overview (simplified)
- teams (NEW - move team lists here)
- bracket
- swiss-standings  
- matchday-management
- playoff-bracket

## Correct Implementation Order:

1. Add imports ✓
2. Update type ✓
3. Create grid wrapper (CAREFUL with opening/closing divs)
4. Move tab buttons to left sidebar
5. Keep all tab content in center column
6. Add right sidebar with summary info
7. Close all divs properly

The key is to be surgical - wrap existing content, don't rewrite it.


