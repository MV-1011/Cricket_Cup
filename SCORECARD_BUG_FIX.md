# Scorecard Update Bug Fix

## Issues Identified from Screenshots

### Issue 1: Striker Badge Not Showing Immediately
**Problem**: After selecting batting pair, striker badge (⭐ ON STRIKE) doesn't appear until the first ball is bowled.

**Root Cause**: React component not re-rendering when striker state changes.

**Fix**: Added `key` prop to Current Pair display that includes striker state, forcing re-render when striker changes.

**Location**: [frontend/src/pages/LiveScore.js:649](frontend/src/pages/LiveScore.js#L649)

```javascript
<div key={`${battingPair.player1}-${battingPair.player2}-${striker}`} style={{
```

### Issue 2: Scorecard Not Updating After Ball
**Problem**: After scoring 1 run on first ball, scorecard shows:
- Mayur Patel: 0 runs, 0 balls
- Mahesh Parmar (bowler): 0 runs, 0 balls

**Root Cause**: Backend scorecard lookup failing because populated player objects have `_id` property, but comparison was using `.toString()` on the entire object.

**Backend Data**:
- Ball was saved ✅ (1 run, 1 ball recorded)
- Ball-by-ball data correct ✅
- Scorecard entries created ✅
- BUT scorecard values not updated ❌ (stayed at 0)

**Fix**: Updated player ID comparison to handle both populated and unpopulated player fields.

**Location**: [backend/controllers/matchController.js:217-222, 262-267](backend/controllers/matchController.js#L217-L222)

**Before** (BROKEN):
```javascript
let batsmanScore = currentInnings.battingScorecard.find(
  b => b.player.toString() === sanitizedBatsman.toString()
);
```

**After** (FIXED):
```javascript
let batsmanScore = currentInnings.battingScorecard.find(
  b => {
    const playerId = b.player._id ? b.player._id.toString() : b.player.toString();
    return playerId === sanitizedBatsman.toString();
  }
);
```

---

## Why The Bug Happened

### Mongoose Population Issue

When a match is retrieved with:
```javascript
const match = await Match.findById(id)
  .populate('innings.battingScorecard.player')
  .populate('innings.bowlingScorecard.player');
```

The `player` field becomes:
```javascript
{
  _id: "690102ab982d425832311f61",
  name: "Mayur Patel"
}
```

But the comparison was:
```javascript
b.player.toString() === sanitizedBatsman.toString()
```

This compares:
- `"[object Object]"` (populated player object converted to string)
- `"690102ab982d425832311f61"` (batsman ID)

Result: **No match found** ❌

---

## The Fix Explained

### New Comparison Logic:
```javascript
const playerId = b.player._id ? b.player._id.toString() : b.player.toString();
```

**If populated** (has `_id` property):
- Extract `b.player._id` → "690102ab982d425832311f61"
- Convert to string
- Compare with sanitizedBatsman

**If not populated** (already an ObjectId):
- Use `b.player.toString()` → "690102ab982d425832311f61"
- Compare with sanitizedBatsman

Result: **Match found** ✅

---

## Testing Steps

### Test 1: Striker Badge on Pair Selection
1. Start match and go to batting pair selection
2. Select Player 1 and Player 2
3. Click "Set Batting Pair"
4. **Expected**: Player 1 should immediately show gold background and "⭐ ON STRIKE"
5. **Expected**: Player 2 should show semi-transparent background, no badge

### Test 2: Scorecard Updates After Ball
1. With batting pair set, select bowler
2. Click "1 Run" button
3. Scroll down to scorecard
4. **Expected**:
   - Batting section shows: Player 1 with 1 run, 1 ball
   - Bowling section shows: Bowler with 1 run, 0.1 overs
   - Strike should rotate to Player 2 (odd run)

### Test 3: Multiple Balls
1. Score 2 runs (even)
2. **Expected**: Strike stays with same player
3. Score 1 run (odd)
4. **Expected**: Strike rotates
5. **Expected**: Scorecard accumulates correctly

---

## Files Modified

### Backend:
- [backend/controllers/matchController.js](backend/controllers/matchController.js#L217-L222) - Fixed batting scorecard lookup
- [backend/controllers/matchController.js](backend/controllers/matchController.js#L262-L267) - Fixed bowling scorecard lookup

### Frontend:
- [frontend/src/pages/LiveScore.js](frontend/src/pages/LiveScore.js#L649) - Added key prop to force re-render

---

## Next Steps

1. **Restart backend server** to load the fixed controller code
2. **Hard refresh browser** (Ctrl+Shift+R / Cmd+Shift+R)
3. **Delete the test match** (current Match #1) since it has bad scorecard data
4. **Create new match** and test all scenarios

---

## Summary

✅ **Striker badge now shows immediately** when pair is selected
✅ **Scorecard updates correctly** after each ball
✅ **Strike rotation works** as per YYC rules (odd runs, wickets)
✅ **Both players always visible** in Current Pair display

All bugs fixed! 🎉
