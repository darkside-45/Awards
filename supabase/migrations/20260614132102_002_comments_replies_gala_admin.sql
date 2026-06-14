-- Add parent_comment_id for replies
ALTER TABLE comments ADD COLUMN parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Remove author_name requirement (anonymous comments)
ALTER TABLE comments ALTER COLUMN author_name DROP NOT NULL;
ALTER TABLE comments ALTER COLUMN author_name SET DEFAULT 'Anonyme';

-- Add gala_settings table
CREATE TABLE gala_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gala_date TIMESTAMPTZ,
  gala_image_url TEXT,
  contact_info JSONB DEFAULT '{"phones": ["+241 77 68 79 95", "+241 77 18 15 65"], "mutuelle": "Mutuelle LUMINAE", "institution": "Collège de Paris Supérieur Gabon", "location": "Libreville, Gabon"}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO gala_settings (gala_date, gala_image_url) VALUES (NULL, NULL);

-- Enable RLS
ALTER TABLE gala_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_gala_settings" ON gala_settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add admin_users table for simple auth
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_admin_users" ON admin_users FOR ALL TO anon USING (true) WITH CHECK (true);