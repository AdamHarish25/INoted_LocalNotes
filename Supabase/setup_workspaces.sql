-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policies for workspaces
CREATE POLICY "Users can view their own workspaces" ON workspaces
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own workspaces" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspaces" ON workspaces
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own workspaces" ON workspaces
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Add workspace_id to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to whiteboards table (for consistency)
ALTER TABLE whiteboards
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
