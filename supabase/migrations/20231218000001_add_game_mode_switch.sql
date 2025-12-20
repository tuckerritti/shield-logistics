-- Add next_game_mode column to rooms table
-- This allows players to schedule a game mode change for the next hand
ALTER TABLE rooms
ADD COLUMN next_game_mode game_mode;

-- Add comment explaining usage
COMMENT ON COLUMN rooms.next_game_mode IS
  'When set, game mode will switch to this value at start of next hand. Cleared after switch completes.';
