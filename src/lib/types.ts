export interface AppSettings {
  id: string;
  current_level: number;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  class_id: string;
  category_id: string;
  photo_url: string | null;
  is_qualified: boolean;
  created_at: string;
  classes?: Class;
  categories?: Category;
  vote_count?: number;
}

export interface Voter {
  id: string;
  session_token: string;
  class_id: string;
  display_name: string;
  created_at: string;
  classes?: Class;
}

export interface Vote {
  id: string;
  voter_id: string;
  candidate_id: string;
  category_id: string;
  level: number;
  created_at: string;
}

export interface Comment {
  id: string;
  candidate_id: string;
  author_name: string | null;
  content: string;
  is_flagged: boolean;
  is_deleted: boolean;
  parent_comment_id: string | null;
  created_at: string;
  replies?: Comment[];
}

export interface GalaSettings {
  id: string;
  gala_date: string | null;
  gala_image_url: string | null;
  contact_info: {
    phones: string[];
    mutuelle: string;
    institution: string;
    location: string;
  };
  updated_at: string;
}

export const LEVEL_NAMES: Record<number, string> = {
  1: "Phase d'Inscription",
  2: 'Vote Intra-Classes',
  3: 'Vote Inter-Classes',
  4: 'Clôture',
};

export const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "Les candidats s'inscrivent dans leurs catégories respectives",
  2: 'Votez pour les candidats de votre classe',
  3: 'Votez pour les finalistes de tout le campus',
  4: 'Les votes sont terminés ! Réservez vos billets pour le grand bal',
};
