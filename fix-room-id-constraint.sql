-- Fix assignments table to allow NULL room_id for game assignments
-- This allows assignments to be either room-based OR game-based (or both)

-- Remove NOT NULL constraint from room_id to allow game assignments without room restrictions
ALTER TABLE assignments ALTER COLUMN room_id DROP NOT NULL;