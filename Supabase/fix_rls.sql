-- Enable RLS (just in case)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboards ENABLE ROW LEVEL SECURITY;

-- Drop existing update policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Enable update for users based on owner_id" ON notes;
DROP POLICY IF EXISTS "Enable update for users based on owner_id" ON whiteboards;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own whiteboards" ON whiteboards;


-- Create definitive Update policies
CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own whiteboards" ON whiteboards
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Ensure Insert is also covered (re-applying just to be safe)
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own whiteboards" ON whiteboards;
CREATE POLICY "Users can insert their own whiteboards" ON whiteboards
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Ensure Select is also covered
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view their own whiteboards" ON whiteboards;
CREATE POLICY "Users can view their own whiteboards" ON whiteboards
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
