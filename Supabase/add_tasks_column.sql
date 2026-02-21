-- Add tasks column to notes table to store extracted task items
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;

-- Comment describing the structure
COMMENT ON COLUMN notes.tasks IS 'Array of extracted tasks from the note content. Example: [{"text": "Buy milk", "checked": false}]';
