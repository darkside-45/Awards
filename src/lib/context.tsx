import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import type { Class, Category, Candidate, Voter, Comment, GalaSettings } from './types';

interface AppContextType {
  level: number;
  classes: Class[];
  categories: Category[];
  candidates: Candidate[];
  comments: Comment[];
  voter: Voter | null;
  gala: GalaSettings | null;
  isAdmin: boolean;
  setVoter: (voter: Voter | null) => void;
  setAdmin: (val: boolean) => void;
  refreshCandidates: () => Promise<void>;
  refreshComments: () => Promise<void>;
  refreshGala: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState(1);
  const [classes, setClasses] = useState<Class[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [voter, setVoter] = useState<Voter | null>(null);
  const [gala, setGala] = useState<GalaSettings | null>(null);
  const [isAdmin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('awards_voter');
    if (stored) {
      try { setVoter(JSON.parse(stored)); } catch { /* ignore */ }
    }
    const adminStored = localStorage.getItem('awards_admin');
    if (adminStored === 'true') setAdmin(true);
  }, []);

  useEffect(() => {
    if (voter) localStorage.setItem('awards_voter', JSON.stringify(voter));
    else localStorage.removeItem('awards_voter');
  }, [voter]);

  useEffect(() => {
    if (isAdmin) localStorage.setItem('awards_admin', 'true');
    else localStorage.removeItem('awards_admin');
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    const [settingsRes, classesRes, categoriesRes, galaRes] = await Promise.all([
      supabase.from('app_settings').select('*').limit(1).single(),
      supabase.from('classes').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('gala_settings').select('*').limit(1).single(),
    ]);
    if (settingsRes.data) setLevel(settingsRes.data.current_level);
    if (classesRes.data) setClasses(classesRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (galaRes.data) setGala(galaRes.data);
  }, []);

  const refreshCandidates = useCallback(async () => {
    const { data } = await supabase
      .from('candidates')
      .select('*, classes(*), categories(*)')
      .order('created_at', { ascending: true });
    if (data) setCandidates(data as Candidate[]);
  }, []);

  const refreshComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('is_deleted', false)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });
    if (data) {
      const parentIds = data.map((c) => c.id);
      if (parentIds.length > 0) {
        const { data: replies } = await supabase
          .from('comments')
          .select('*')
          .eq('is_deleted', false)
          .in('parent_comment_id', parentIds)
          .order('created_at', { ascending: true });
        const withReplies = data.map((c) => ({
          ...c,
          replies: replies?.filter((r) => r.parent_comment_id === c.id) || [],
        }));
        setComments(withReplies as Comment[]);
      } else {
        setComments(data as Comment[]);
      }
    }
  }, []);

  const refreshGala = useCallback(async () => {
    const { data } = await supabase.from('gala_settings').select('*').limit(1).single();
    if (data) setGala(data);
  }, []);

  useEffect(() => {
    fetchAll().then(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    refreshCandidates();
    refreshComments();
  }, [refreshCandidates, refreshComments]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
        supabase.from('app_settings').select('*').limit(1).single().then(({ data }) => {
          if (data) setLevel(data.current_level);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        refreshCandidates();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        refreshComments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        refreshCandidates();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        supabase.from('categories').select('*').order('name').then(({ data }) => {
          if (data) setCategories(data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        supabase.from('classes').select('*').order('name').then(({ data }) => {
          if (data) setClasses(data);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gala_settings' }, () => {
        refreshGala();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshCandidates, refreshComments, refreshGala]);

  return (
    <AppContext.Provider value={{
      level, classes, categories, candidates, comments, voter, gala,
      isAdmin, setVoter, setAdmin, refreshCandidates, refreshComments, refreshGala, loading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
