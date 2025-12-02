-- Add configurable delay between hands
-- This allows rooms to specify how long to wait after hand resolution before auto-dealing the next hand

ALTER TABLE rooms
ADD COLUMN inter_hand_delay INTEGER NOT NULL DEFAULT 3000;

COMMENT ON COLUMN rooms.inter_hand_delay IS 'Milliseconds to wait between hand resolution and auto-dealing next hand (default: 3 seconds)';
