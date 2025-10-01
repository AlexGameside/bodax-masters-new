# Map 3 Data Cleanup Scripts

These scripts help identify and fix issues with Map 3 data in completed matches.

## The Problem

Some completed matches that ended 2-0 or 0-2 incorrectly have Map 3 data with scores and winners, when Map 3 should not exist for these matches.

## Scripts Available

### 1. Analyze Map 3 Issues
```bash
npm run analyze-map3
```

This script:
- Analyzes all completed matches
- Identifies matches with incorrect Map 3 data
- Shows statistics about match types
- **Does NOT make any changes** (safe to run)

### 2. Fix Map 3 Data
```bash
npm run fix-map3
```

This script:
- Finds all 2-0/0-2 matches that have Map 3 data
- Removes the incorrect Map 3 data
- Updates the match records
- **Makes actual changes** to the database

## What Gets Fixed

- **2-0 matches**: Removes any Map 3 data (should only have Map 1 and Map 2)
- **0-2 matches**: Removes any Map 3 data (should only have Map 1 and Map 2)
- **2-1/1-2 matches**: Left unchanged (should have Map 3)

## Safety

- The analyze script is completely safe and only reads data
- The fix script only removes Map 3 data from matches that shouldn't have it
- Both scripts provide detailed logging of what they're doing

## Example Output

```
🔍 Starting Map 3 data cleanup...
📊 Found 150 completed matches to analyze
🔧 Fixing match abc123: 2-0 but has map3 data
✅ Fixed match abc123: Removed map3 data
🔧 Fixing match def456: 0-2 but has map3 data
✅ Fixed match def456: Removed map3 data

📈 Cleanup Summary:
✅ Fixed matches: 2
⏭️  Skipped matches: 148
📊 Total processed: 150

🎉 Map 3 data cleanup completed!
```

## Prerequisites

Make sure you have:
- Firebase config properly set up
- Access to the production database
- `tsx` installed (added to devDependencies)

## Installation

```bash
npm install
```

## Usage

1. **First, analyze the issues:**
   ```bash
   npm run analyze-map3
   ```

2. **If issues are found, fix them:**
   ```bash
   npm run fix-map3
   ```

3. **Verify the fixes worked:**
   ```bash
   npm run analyze-map3
   ```




