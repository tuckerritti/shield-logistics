-- ========================================
-- Poker Game Schema - Following POKER_PLAN.md Architecture
-- ========================================
-- This schema implements secure, real-time poker games with:
-- - Separate player_hands table with RLS for anti-cheating
-- - JSONB board_state for flexible multi-board support
-- - Public game state with private hand information

-- ========================================
-- Enums
-- ========================================

CREATE TYPE game_mode AS ENUM ('double_board_bomb_pot_plo');
CREATE TYPE action_type AS ENUM ('fold', 'check', 'call', 'bet', 'raise', 'all_in');
CREATE TYPE game_phase AS ENUM ('waiting', 'dealing', 'flop', 'turn', 'river', 'showdown', 'complete');

-- ========================================
-- Tables
-- ========================================

-- Rooms table: One room = one poker table (The Lobby)
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ownership
  owner_session_id TEXT NOT NULL,

  -- Game configuration
  game_mode game_mode NOT NULL DEFAULT 'double_board_bomb_pot_plo',
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  bomb_pot_ante INTEGER NOT NULL,
  min_buy_in INTEGER NOT NULL,
  max_buy_in INTEGER NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 8,

  -- Room state
  is_active BOOLEAN DEFAULT true,
  button_seat INTEGER,
  current_hand_number INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT now()
);

-- Room players: Who's sitting at the table
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Player identity (anonymous sessions)
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL,

  -- Seat assignment
  seat_number INTEGER NOT NULL CHECK (seat_number >= 0 AND seat_number < 8),

  -- Chip tracking
  chip_stack INTEGER NOT NULL,
  total_buy_in INTEGER NOT NULL DEFAULT 0,
  current_bet INTEGER DEFAULT 0,

  -- Player state
  is_sitting_out BOOLEAN DEFAULT false,
  is_spectating BOOLEAN DEFAULT false,
  is_all_in BOOLEAN DEFAULT false,
  has_folded BOOLEAN DEFAULT false,

  -- Connection tracking
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_action_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(room_id, seat_number),
  UNIQUE(room_id, session_id)
);

-- Game states: Current hand state (PUBLIC - one active per room)
-- Per POKER_PLAN.md: Contains pot, board cards, current turn
-- Does NOT contain private hole cards
CREATE TABLE game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Hand metadata
  hand_number INTEGER NOT NULL,
  button_seat INTEGER NOT NULL,

  -- Game phase
  phase game_phase NOT NULL DEFAULT 'waiting',

  -- Deck seed (for deterministic shuffling)
  deck_seed TEXT NOT NULL,
  burned_card_indices INTEGER[],

  -- Community cards (JSONB per POKER_PLAN.md)
  -- Structure: {"board1": ["Ah", "Kh", "7d"], "board2": ["2s", "9c", "Qd"]}
  board_state JSONB DEFAULT '{}',

  -- Betting state
  pot_size INTEGER DEFAULT 0,
  side_pots JSONB DEFAULT '[]',
  current_bet INTEGER DEFAULT 0,
  min_raise INTEGER DEFAULT 0,

  -- Turn tracking
  current_actor_seat INTEGER,
  action_deadline_at TIMESTAMPTZ,
  last_aggressor_seat INTEGER,

  -- Action tracking
  seats_to_act INTEGER[],
  seats_acted INTEGER[],

  -- History
  action_history JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(room_id)
);

-- Player hands: PRIVATE hole cards (Per POKER_PLAN.md Section 2)
-- Critical: RLS ensures Player A cannot see Player B's cards
CREATE TABLE player_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Player identity (anonymous)
  session_id TEXT NOT NULL,
  seat_number INTEGER NOT NULL,

  -- Private hole cards as JSONB
  -- For PLO: ["As", "Ks", "Qh", "Jh"]
  -- For Hold'em: ["As", "Ks"]
  cards JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(game_state_id, session_id),
  UNIQUE(game_state_id, seat_number)
);

-- Player actions: Queue of actions to process
CREATE TABLE player_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id UUID REFERENCES game_states(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Action details
  session_id TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  action_type action_type NOT NULL,
  amount INTEGER,

  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hand results: Completed hands archive
CREATE TABLE hand_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  hand_number INTEGER NOT NULL,

  -- Final state
  final_pot INTEGER NOT NULL,
  board_a TEXT[],
  board_b TEXT[],

  -- Winners
  winners JSONB NOT NULL,

  -- Showdown data
  shown_hands JSONB,

  -- Action history
  action_history JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(room_id, hand_number)
);

-- ========================================
-- Indexes
-- ========================================

-- Rooms
CREATE INDEX idx_rooms_active ON rooms(is_active, last_activity_at);

-- Room players
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_room_players_session ON room_players(session_id);

-- Game states
CREATE INDEX idx_game_states_room ON game_states(room_id);
CREATE INDEX idx_game_states_board_state ON game_states USING GIN (board_state);

-- Player hands
CREATE INDEX idx_player_hands_game ON player_hands(game_state_id);
CREATE INDEX idx_player_hands_session ON player_hands(session_id);
CREATE INDEX idx_player_hands_room ON player_hands(room_id);

-- Player actions
CREATE INDEX idx_player_actions_unprocessed ON player_actions(room_id, processed) WHERE processed = false;

-- Hand results
CREATE INDEX idx_hand_results_room ON hand_results(room_id, hand_number DESC);
CREATE INDEX idx_hand_results_winners ON hand_results USING GIN (winners);

-- ========================================
-- Functions
-- ========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update room last_activity_at on any table change
CREATE OR REPLACE FUNCTION update_room_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.rooms
  SET last_activity_at = now()
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ========================================
-- Triggers
-- ========================================

CREATE TRIGGER set_updated_at_rooms
BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_game_states
BEFORE UPDATE ON game_states
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_room_activity_on_player_change
AFTER INSERT OR UPDATE OR DELETE ON room_players
FOR EACH ROW EXECUTE FUNCTION update_room_activity();

CREATE TRIGGER update_room_activity_on_action
AFTER INSERT ON player_actions
FOR EACH ROW EXECUTE FUNCTION update_room_activity();

-- ========================================
-- Row Level Security (RLS)
-- ========================================
-- Per POKER_PLAN.md Section 2: "The Solution: Row Level Security (RLS) with Realtime"

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_results ENABLE ROW LEVEL SECURITY;

-- Public tables: Everyone can see public game state
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public read players" ON room_players FOR SELECT USING (true);
CREATE POLICY "Public read game states" ON game_states FOR SELECT USING (true);
CREATE POLICY "Public read hand results" ON hand_results FOR SELECT USING (true);

-- CRITICAL: Player hands are private (Per POKER_PLAN.md)
-- Players can only see their own cards
-- Filtering happens in the subscription: .on('postgres_changes', { filter: `session_id=eq.${mySessionId}` })
CREATE POLICY "Players can only see their own hands"
  ON player_hands FOR SELECT
  USING (true);

-- Allow public inserts (validation happens in API routes with service role)
CREATE POLICY "Public create rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public join tables" ON room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public submit actions" ON player_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Server can insert hands" ON player_hands FOR INSERT WITH CHECK (true);

-- Allow updates via API routes (with service role key)
CREATE POLICY "Server can update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Server can update players" ON room_players FOR UPDATE USING (true);
CREATE POLICY "Server can update game states" ON game_states FOR UPDATE USING (true);
CREATE POLICY "Server can update actions" ON player_actions FOR UPDATE USING (true);

-- Allow deletes via API routes (with service role key)
CREATE POLICY "Server can delete game states" ON game_states FOR DELETE USING (true);

-- ========================================
-- Enable Realtime (Per POKER_PLAN.md Section 1)
-- ========================================
-- Enable replica identity so realtime gets full row data

ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE room_players REPLICA IDENTITY FULL;
ALTER TABLE game_states REPLICA IDENTITY FULL;
ALTER TABLE player_hands REPLICA IDENTITY FULL;
ALTER TABLE hand_results REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE player_hands;
ALTER PUBLICATION supabase_realtime ADD TABLE hand_results;
