-- Add is_public column to notes and whiteboards
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE whiteboards ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Allow public read access to notes
CREATE POLICY "Public notes are viewable by everyone"
ON notes FOR SELECT
USING (is_public = true);

-- Allow public read access to whiteboards
CREATE POLICY "Public whiteboards are viewable by everyone"
ON whiteboards FOR SELECT
USING (is_public = true);
