-- ============================================================
-- LES AWARDS 2026 - Script SQL complet pour votre Supabase
-- Projet : omirnyotkctscuyypxlp
-- Executez ce script dans le SQL Editor de votre dashboard Supabase
-- ============================================================

-- 1. Paramètres de l'application
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (current_level) VALUES (1);

-- 2. Classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO classes (name) VALUES
  ('L1'), ('L2'), ('L3'), ('L4'), ('L5');

-- 3. Catégories d'awards
CREATE TABLE IF NOT EXISTS categories (
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

-- 4. Candidats
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  photo_url TEXT,
  is_qualified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, class_id, category_id)
);

-- 5. Votants (session)
CREATE TABLE IF NOT EXISTS voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_id, category_id, level)
);

-- 7. Commentaires (anonymes, avec réponses)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author_name TEXT DEFAULT 'Anonyme',
  content TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Paramètres du gala
CREATE TABLE IF NOT EXISTS gala_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gala_date TIMESTAMPTZ,
  gala_image_url TEXT,
  contact_info JSONB DEFAULT '{"phones": ["+241 77 68 79 95", "+241 77 18 15 65"], "mutuelle": "Mutuelle LUMINAE", "institution": "Collège de Paris Supérieur Gabon", "location": "Libreville, Gabon"}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO gala_settings (gala_date, gala_image_url) VALUES (NULL, NULL);

-- 9. Admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mot de passe : Guenole@#2026 (hash SHA-256 avec sel)
INSERT INTO admin_users (email, password_hash) VALUES
  ('guenolekuate2023@gmail.com', '5bffe80cc0a5229dba78ff6557808bd00d64d511372328536edc46ecd964194b');

-- ==========================================
-- RLS (Row Level Security)
-- ==========================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gala_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_app_settings" ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_classes" ON classes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_candidates" ON candidates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_voters" ON voters FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_votes" ON votes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_comments" ON comments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_gala_settings" ON gala_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_admin_users" ON admin_users FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==========================================
-- Storage : Bucket "uploads"
-- Executez aussi ces 3 lignes dans le SQL Editor
-- ==========================================

INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_upload" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "public_read" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'uploads');
CREATE POLICY "public_delete" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'uploads');
