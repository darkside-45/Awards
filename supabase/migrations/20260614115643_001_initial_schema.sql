-- App settings (current level)
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (current_level) VALUES (1);

-- Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO classes (name) VALUES
  ('L1'), ('L2'), ('L3'), ('L4'), ('L5');

-- Award categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, description) VALUES
  ('Meilleur Étudiant', 'L''étudiant le plus remarquable du campus'),
  ('Meilleur Leader', 'Le leader qui inspire et fédère'),
  ('Plus Créatif', 'L''esprit le plus inventif et original'),
  ('Plus Inspirant', 'Celui qui motive et donne de l''espoir'),
  ('Meilleur Esprit Sportif', 'Le passionné de sport par excellence');

-- Candidates
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  photo_url TEXT,
  is_qualified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, class_id, category_id)
);

-- Voters (session-based tracking)
CREATE TABLE voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_id, category_id, level)
);

-- Comments on candidate profiles
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Public access policies (campus platform - no auth required)
CREATE POLICY "public_app_settings" ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_classes" ON classes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_candidates" ON candidates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_voters" ON voters FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_votes" ON votes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_comments" ON comments FOR ALL TO anon USING (true) WITH CHECK (true);