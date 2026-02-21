-- Add allow_public_editing column to notes, whiteboards, and flowcharts
ALTER TABLE notes ADD COLUMN IF NOT EXISTS allow_public_editing BOOLEAN DEFAULT false;
ALTER TABLE whiteboards ADD COLUMN IF NOT EXISTS allow_public_editing BOOLEAN DEFAULT false;
ALTER TABLE flowcharts ADD COLUMN IF NOT EXISTS allow_public_editing BOOLEAN DEFAULT false;

-- Update RLS policies for NOTES
-- Ensure public notes are viewable (Select)
DROP POLICY IF EXISTS "Public notes are viewable by everyone" ON notes;
CREATE POLICY "Public notes are viewable by everyone" ON notes
  FOR SELECT
  USING (is_public = true);

-- Allow public editing if enabled (Update)
DROP POLICY IF EXISTS "Public notes are updatable if allowed" ON notes;
CREATE POLICY "Public notes are updatable if allowed" ON notes
  FOR UPDATE
  USING (is_public = true AND allow_public_editing = true);


-- Update RLS policies for WHITEBOARDS
-- Ensure public whiteboards are viewable (Select)
DROP POLICY IF EXISTS "Public whiteboards are viewable by everyone" ON whiteboards;
CREATE POLICY "Public whiteboards are viewable by everyone" ON whiteboards
  FOR SELECT
  USING (is_public = true);

-- Allow public editing if enabled (Update)
DROP POLICY IF EXISTS "Public whiteboards are updatable if allowed" ON whiteboards;
CREATE POLICY "Public whiteboards are updatable if allowed" ON whiteboards
  FOR UPDATE
  USING (is_public = true AND allow_public_editing = true);


-- Update RLS policies for FLOWCHARTS
-- Ensure public flowcharts are viewable (Select)
DROP POLICY IF EXISTS "Public flowcharts are viewable by everyone" ON flowcharts;
CREATE POLICY "Public flowcharts are viewable by everyone" ON flowcharts
  FOR SELECT
  USING (is_public = true);

-- Allow public editing if enabled (Update)
DROP POLICY IF EXISTS "Public flowcharts are updatable if allowed" ON flowcharts;
CREATE POLICY "Public flowcharts are updatable if allowed" ON flowcharts
  FOR UPDATE
  USING (is_public = true AND allow_public_editing = true);
