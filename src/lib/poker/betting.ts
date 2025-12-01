/**
 * Calculates the maximum bet allowed in Pot Limit poker
 * Formula: Pot + Current Bet + Amount to Call
 */
export function calculatePotLimitMax(
  potSize: number,
  currentBet: number,
  playerCurrentBet: number,
): number {
  const toCall = currentBet - playerCurrentBet;
  return potSize + currentBet + toCall;
}

/**
 * Calculates the minimum raise amount
 */
export function calculateMinRaise(
  currentBet: number,
  lastRaiseAmount: number,
  bigBlind: number,
): number {
  if (currentBet === 0) {
    return bigBlind;
  }
  return currentBet + Math.max(lastRaiseAmount, bigBlind);
}

export interface BettingLimits {
  minBet: number;
  maxBet: number;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canFold: boolean;
  callAmount: number;
}

/**
 * Gets all betting options available to a player
 */
export function getBettingLimits(
  playerChips: number,
  playerCurrentBet: number,
  currentBet: number,
  potSize: number,
  lastRaiseAmount: number,
  bigBlind: number,
): BettingLimits {
  const callAmount = currentBet - playerCurrentBet;
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && callAmount <= playerChips;
  const canFold = currentBet > playerCurrentBet;

  const minRaise = calculateMinRaise(currentBet, lastRaiseAmount, bigBlind);
  const maxRaise = calculatePotLimitMax(potSize, currentBet, playerCurrentBet);

  const canRaise = playerChips >= minRaise;

  return {
    minBet: Math.min(minRaise, playerChips),
    maxBet: Math.min(maxRaise, playerChips),
    canCheck,
    canCall,
    canRaise,
    canFold,
    callAmount: Math.min(callAmount, playerChips),
  };
}

/**
 * Validates if a bet amount is legal
 */
export function isValidBetAmount(
  amount: number,
  limits: BettingLimits,
  isAllIn: boolean = false,
): boolean {
  // All-in is always valid if player has chips
  if (isAllIn) {
    return true;
  }

  // Bet must be between min and max
  return amount >= limits.minBet && amount <= limits.maxBet;
}

/**
 * Calculates the last raise amount from action history
 */
export function getLastRaiseAmount(
  actionHistory: Array<{ action_type: string; amount?: number }>,
  bigBlind: number,
): number {
  // Find the last bet or raise
  for (let i = actionHistory.length - 1; i >= 0; i--) {
    const action = actionHistory[i];
    if (action.action_type === "bet" || action.action_type === "raise") {
      return action.amount || bigBlind;
    }
  }

  return bigBlind;
}

/**
 * Determines if an all-in constitutes a valid raise that reopens betting
 * Per POKER_RULES.md: All-in < min raise does NOT reopen betting
 */
export function doesAllInReopenBetting(
  allInAmount: number,
  currentBet: number,
  lastRaiseAmount: number,
  bigBlind: number,
): boolean {
  const raiseSize = allInAmount - currentBet;
  const minRaiseSize = Math.max(lastRaiseAmount, bigBlind);
  return raiseSize >= minRaiseSize;
}

/**
 * Determines if all players have acted and bets are equalized
 *
 * Betting round is complete when:
 * 1. All active players (not folded, not all-in) have matched the current bet
 * 2. All active players have had at least one opportunity to act
 * 3. No player has a pending action due to a re-raise
 */
export function isBettingRoundComplete(
  seatsToAct: number[],
  currentBet: number,
  players: Array<{ seat_number: number; current_bet: number; has_folded: boolean; is_all_in: boolean }>,
): boolean {
  // Get active players (not folded, not all-in)
  const activePlayers = players.filter(p => !p.has_folded && !p.is_all_in);

  // If no active players or only one active player, round is complete
  if (activePlayers.length <= 1) {
    return true;
  }

  // All active players must have matched the current bet
  const allBetsEqual = activePlayers.every(p => p.current_bet === currentBet);
  if (!allBetsEqual) {
    return false;
  }

  // All active players must have had opportunity to act (seats_to_act is empty)
  const allActed = seatsToAct.length === 0;

  return allBetsEqual && allActed;
}
