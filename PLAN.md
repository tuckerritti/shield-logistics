# Plan: Fix Indian Poker Card Visibility

## Problem Summary

In Indian Poker mode, other players' cards disappear after the first action is taken. Players should see everyone else's cards throughout the hand (but not their own).

## Root Cause

**File:** `apps/engine/src/logic.ts`
**Lines:** 544-548 and 920-935

The TypeScript type annotation for `boardState` only includes `board1` and `board2`, causing `visible_player_cards` to be stripped when the object is spread during action processing.

```typescript
// BUGGY - too restrictive
const boardState =
  (gameState.board_state as {
    board1?: string[];
    board2?: string[];  // Missing visible_player_cards!
  }) ?? {};
```

When `applyAction()` returns the updated board state, the `visible_player_cards` property is lost because TypeScript's type annotation filters it out during the spread operation.

## Implementation Steps

### 1. Fix Type Annotations in `apps/engine/src/logic.ts`

**Lines 544-548:** Update to include all possible `board_state` properties:

```typescript
const boardState =
  (gameState.board_state as {
    board1?: string[];
    board2?: string[];
    board3?: string[];  // For 321 mode
    visible_player_cards?: Record<string, string[]>;  // For Indian Poker
    revealed_partitions?: Record<string, string[]>;  // For 321 mode
    fullBoard1?: string[];
    fullBoard2?: string[];
    fullBoard3?: string[];
  }) ?? {};
```

**Lines 920-935:** Update `updatedBoardState` initialization similarly to ensure consistency throughout the function.

### 2. Verify the Fix

Run the following test scenario:

1. Start Indian Poker game with 2+ players
2. Deal a hand - verify `visible_player_cards` is set in `game_states.board_state`
3. First player makes any action (check/bet/fold)
4. Verify `visible_player_cards` still exists in the updated `game_states.board_state`
5. Check frontend displays other players' cards

### 3. Build and Lint

```bash
npm run build
npm run lint
```

Fix any TypeScript errors that arise from the type changes.

### 4. Test All Game Modes

Ensure the fix doesn't break other modes:

- **Regular PLO:** Boards still display correctly, no cards leak
- **321 Mode:** Board partitions still work correctly
- **Indian Poker:** Other players' cards visible throughout hand

## Files to Modify

1. `apps/engine/src/logic.ts` - Fix type annotations (2 locations)

## Success Criteria

- [ ] Indian Poker shows other players' cards during active play
- [ ] Cards remain visible after each action
- [ ] No TypeScript errors
- [ ] All game modes work correctly
- [ ] Build and lint pass

## Alternative Approach (if needed)

If the type annotation fix doesn't work, consider:

1. Define a proper TypeScript interface for `BoardState`:
   ```typescript
   interface BoardState {
     board1?: string[];
     board2?: string[];
     board3?: string[];
     visible_player_cards?: Record<string, string[]>;
     revealed_partitions?: Record<string, string[]>;
     fullBoard1?: string[];
     fullBoard2?: string[];
     fullBoard3?: string[];
   }
   ```

2. Use this interface consistently throughout `logic.ts` and potentially export it to `packages/shared`

## Notes

- This is purely a type annotation bug - the logic itself is correct
- `dealHand()` correctly sets `visible_player_cards` initially
- `getVisibleCardsForActivePlayers()` helper works correctly
- Frontend rendering logic works correctly when the data is present
