-- Create flowcharts table
CREATE TABLE IF NOT EXISTS flowcharts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT DEFAULT 'Untitled Flowchart',
  content JSONB DEFAULT '[]'::jsonb,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE flowcharts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own flowcharts" ON flowcharts
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own flowcharts" ON flowcharts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own flowcharts" ON flowcharts
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own flowcharts" ON flowcharts
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Public access policy
CREATE POLICY "Public flowcharts are viewable by everyone" ON flowcharts
  FOR SELECT
  USING (is_public = true);

-- Policy to allow anonymous/public users to update content if it's public (Optional, depending on desired behavior. Usually read-only for public).
-- For now, keep public as read-only for anonymous users unless otherwise specified.
