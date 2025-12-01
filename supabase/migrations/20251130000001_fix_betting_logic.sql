-- ========================================
-- Fix Betting Logic Migration
-- ========================================
-- Adds fields needed for proper pot-limit validation and side pot tracking
--
-- Changes:
-- 1. room_players.total_invested_this_hand - Track cumulative bets across all streets
-- 2. game_states.last_raise_amount - Track last raise size for minimum raise calculation
-- 3. game_states.action_reopened_to - Track which seats need to re-act after raise

-- Add total invested tracking to room_players
ALTER TABLE room_players
ADD COLUMN total_invested_this_hand INTEGER DEFAULT 0;

COMMENT ON COLUMN room_players.total_invested_this_hand IS
'Cumulative amount invested by player in current hand across all betting rounds (ante + flop bets + turn bets + river bets). Used for side pot calculations.';

-- Add raise tracking to game_states
ALTER TABLE game_states
ADD COLUMN last_raise_amount INTEGER DEFAULT 0;

COMMENT ON COLUMN game_states.last_raise_amount IS
'Size of the last raise in the current betting round. Used to calculate minimum raise (currentBet + lastRaiseAmount).';

-- Add reopened action tracking
ALTER TABLE game_states
ADD COLUMN action_reopened_to INTEGER[];

COMMENT ON COLUMN game_states.action_reopened_to IS
'Array of seat numbers that need to re-act after a raise. Tracks which players have already acted and faced current bet level.';
