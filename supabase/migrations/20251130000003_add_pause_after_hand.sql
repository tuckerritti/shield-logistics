-- Add pause_after_hand column to rooms table
-- This allows owners to schedule a pause that will take effect after the current hand completes

ALTER TABLE rooms
ADD COLUMN pause_after_hand BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN rooms.pause_after_hand IS 'When true, the game will pause (is_paused = true) after the current hand completes';
