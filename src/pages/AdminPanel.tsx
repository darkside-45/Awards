import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../lib/context';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/upload';
import { CommentModerationItem } from '../components/CandidateCard';
import AdminLogin from '../components/AdminLogin';
import { LEVEL_NAMES, LEVEL_DESCRIPTIONS } from '../lib/types';
import type { Comment as TComment, Vote } from '../lib/types';
import {
  BarChart3, Users, Tag, MessageSquare, Settings, Trophy,
  ChevronRight, Plus, Trash2, CheckCircle, AlertTriangle, RefreshCw,
  Calendar, Camera, Save, Award, Medal,
} from 'lucide-react';

export default function AdminPanel() {
  const {
    level, classes, categories, candidates, comments, gala,
    isAdmin, setAdmin, refreshCandidates, refreshComments, refreshGala,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'level' | 'categories' | 'comments' | 'candidates' | 'results' | 'gala'>('overview');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  // Voting results
  const [votes, setVotes] = useState<Vote[]>([]);
  const [totalVoters, setTotalVoters] = useState(0);
  const [resultsLoading, setResultsLoading] = useState(false);

  const refreshResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const [votesRes, votersRes] = await Promise.all([
        supabase.from('votes').select('*'),
        supabase.from('voters').select('id', { count: 'exact', head: true }),
      ]);
      if (votesRes.data) setVotes(votesRes.data as Vote[]);
      if (typeof votersRes.count === 'number') setTotalVoters(votersRes.count);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshResults();
    const channel = supabase
      .channel('admin-results-votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        refreshResults();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshResults]);

  // Gala settings
  const [galaDate, setGalaDate] = useState(gala?.gala_date ? gala.gala_date.slice(0, 16) : '');
  const [galaImageFile, setGalaImageFile] = useState<File | null>(null);
  const galaFileRef = useRef<HTMLInputElement>(null);
  const stats = useMemo(() => ({
    totalCandidates: candidates.length,
    totalComments: comments.length,
    flaggedComments: comments.filter((c: TComment) => c.is_flagged).length,
    byCategory: categories.map((cat) => ({
      ...cat,
      count: candidates.filter((c) => c.category_id === cat.id).length,
    })),
    byClass: classes.map((cls) => ({
      ...cls,
      count: candidates.filter((c) => c.class_id === cls.id).length,
    })),
  }), [candidates, comments, categories, classes]);

  const voteResults = useMemo(() => {
    const countFor = (level: number) => {
      const counts: Record<string, number> = {};
      votes.filter((v) => v.level === level).forEach((v) => {
        counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1;
      });
      return counts;
    };
    const level2Counts = countFor(2);
    const level3Counts = countFor(3);

    const level2Voters = new Set(votes.filter((v) => v.level === 2).map((v) => v.voter_id)).size;
    const level3Voters = new Set(votes.filter((v) => v.level === 3).map((v) => v.voter_id)).size;

    // Level 2: results grouped by class then category
    const level2Groups: { classId: string; className: string; categoryId: string; categoryName: string; ranking: { candidate: typeof candidates[number]; count: number }[] }[] = [];
    classes.forEach((cls) => {
      categories.forEach((cat) => {
        const group = candidates.filter((c) => c.class_id === cls.id && c.category_id === cat.id);
        if (group.length === 0) return;
        const ranking = group
          .map((candidate) => ({ candidate, count: level2Counts[candidate.id] || 0 }))
          .sort((a, b) => b.count - a.count);
        level2Groups.push({ classId: cls.id, className: cls.name, categoryId: cat.id, categoryName: cat.name, ranking });
      });
    });

    // Level 3: results grouped by category (qualified/finalist candidates)
    const level3Groups: { categoryId: string; categoryName: string; ranking: { candidate: typeof candidates[number]; count: number }[] }[] = [];
    categories.forEach((cat) => {
      const group = candidates.filter((c) => c.category_id === cat.id && c.is_qualified);
      if (group.length === 0) return;
      const ranking = group
        .map((candidate) => ({ candidate, count: level3Counts[candidate.id] || 0 }))
        .sort((a, b) => b.count - a.count);
      level3Groups.push({ categoryId: cat.id, categoryName: cat.name, ranking });
    });

    return { level2Voters, level3Voters, level2Groups, level3Groups };
  }, [votes, candidates, categories, classes]);

  if (!isAdmin) {
    return <AdminLogin onLogin={() => setAdmin(true)} />;
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const changeLevel = async (newLevel: number) => {
    setProcessing(true);
    try {
      const { data: settings } = await supabase.from('app_settings').select('id').single();
      const { error } = await supabase
        .from('app_settings')
        .update({ current_level: newLevel, updated_at: new Date().toISOString() })
        .eq('id', settings?.id);
      if (error) throw error;

      if (newLevel === 3) await qualifyTopThree();

      showMessage('success', `Niveau ${newLevel} activé avec succès !`);
    } catch {
      showMessage('error', 'Erreur lors du changement de niveau.');
    } finally {
      setProcessing(false);
    }
  };

  const qualifyTopThree = async () => {
    try {
      const { data: intraVotes } = await supabase
        .from('votes').select('candidate_id, level').eq('level', 2);
      if (!intraVotes) return;

      const voteCounts: Record<string, number> = {};
      intraVotes.forEach((v) => {
        voteCounts[v.candidate_id] = (voteCounts[v.candidate_id] || 0) + 1;
      });

      const groups: Record<string, string[]> = {};
      candidates.forEach((c) => {
        const key = `${c.class_id}_${c.category_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(c.id);
      });

      const qualifiedIds = new Set<string>();
      Object.values(groups).forEach((ids) => {
        const sorted = ids.sort((a, b) => (voteCounts[b] || 0) - (voteCounts[a] || 0));
        sorted.slice(0, 3).forEach((id) => qualifiedIds.add(id));
      });

      await supabase.from('candidates').update({ is_qualified: false }).neq('id', 'never-match');
      for (const id of qualifiedIds) {
        await supabase.from('candidates').update({ is_qualified: true }).eq('id', id);
      }
    } catch { /* ignore */ }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const { error } = await supabase.from('categories').insert({
        name: newCatName.trim(), description: newCatDesc.trim() || null,
      });
      if (error) throw error;
      setNewCatName(''); setNewCatDesc('');
      showMessage('success', 'Catégorie ajoutée !');
    } catch {
      showMessage('error', 'Erreur. Vérifiez que le nom est unique.');
    }
  };

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const { error } = await supabase.from('classes').insert({ name: newClassName.trim() });
      if (error) throw error;
      setNewClassName('');
      showMessage('success', 'Classe ajoutée !');
    } catch {
      showMessage('error', 'Erreur. Vérifiez que le nom est unique.');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await supabase.from('categories').delete().eq('id', id);
      showMessage('success', 'Catégorie supprimée.');
    } catch { showMessage('error', 'Erreur lors de la suppression.'); }
  };

  const deleteClass = async (id: string) => {
    try {
      await supabase.from('classes').delete().eq('id', id);
      showMessage('success', 'Classe supprimée.');
    } catch { showMessage('error', 'Erreur lors de la suppression.'); }
  };

  const handleCommentAction = async (id: string, action: 'flag' | 'unflag' | 'delete') => {
    try {
      if (action === 'delete') await supabase.from('comments').update({ is_deleted: true }).eq('id', id);
      else await supabase.from('comments').update({ is_flagged: action === 'flag' }).eq('id', id);
      refreshComments();
    } catch { /* ignore */ }
  };

  const saveGalaSettings = async () => {
    setProcessing(true);
    try {
      let imageUrl = gala?.gala_image_url || null;
      if (galaImageFile) {
        const uploaded = await uploadFile(galaImageFile, 'gala');
        if (uploaded) imageUrl = uploaded;
      }

      const { data: galaData } = await supabase.from('gala_settings').select('id').single();
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (galaDate) updateData.gala_date = new Date(galaDate).toISOString();
      else updateData.gala_date = null;
      if (imageUrl) updateData.gala_image_url = imageUrl;

      await supabase.from('gala_settings').update(updateData).eq('id', galaData?.id);
      refreshGala();
      showMessage('success', 'Paramètres du bal sauvegardés !');
    } catch {
      showMessage('error', 'Erreur lors de la sauvegarde.');
    } finally {
      setProcessing(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: "Vue d'ensemble", icon: BarChart3 },
    { id: 'level' as const, label: 'Niveaux', icon: Settings },
    { id: 'categories' as const, label: 'Catégories & Classes', icon: Tag },
    { id: 'comments' as const, label: 'Commentaires', icon: MessageSquare },
    { id: 'candidates' as const, label: 'Candidats', icon: Users },
    { id: 'results' as const, label: 'Résultats', icon: Award },
    { id: 'gala' as const, label: 'Grand Bal', icon: Calendar },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h2 className="font-poppins font-bold text-2xl text-gray-900">
            Panneau d'Administration
          </h2>
          <p className="font-lato text-sm text-gray-500">
            Gérez les Awards 2026
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-lato ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-poppins font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary-900 text-white shadow-lg shadow-primary-900/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-900/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-900" />
                </div>
                <span className="font-poppins font-medium text-sm text-gray-500">Candidats</span>
              </div>
              <p className="font-poppins font-bold text-3xl text-gray-900">{stats.totalCandidates}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-900/10 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5 text-primary-900" />
                </div>
                <span className="font-poppins font-medium text-sm text-gray-500">Catégories</span>
              </div>
              <p className="font-poppins font-bold text-3xl text-gray-900">{categories.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-900/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-900" />
                </div>
                <span className="font-poppins font-medium text-sm text-gray-500">Commentaires</span>
              </div>
              <p className="font-poppins font-bold text-3xl text-gray-900">{stats.totalComments}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <span className="font-poppins font-medium text-sm text-gray-500">Signalés</span>
              </div>
              <p className="font-poppins font-bold text-3xl text-red-600">{stats.flaggedComments}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-poppins font-bold text-lg text-gray-900 mb-4">
                Candidats par catégorie
              </h3>
              <div className="space-y-3">
                {stats.byCategory.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <span className="font-lato text-sm text-gray-700">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-900 rounded-full"
                          style={{ width: `${stats.totalCandidates > 0 ? (cat.count / stats.totalCandidates) * 100 : 0}%` }} />
                      </div>
                      <span className="font-poppins font-semibold text-sm text-primary-900 w-8 text-right">{cat.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-poppins font-bold text-lg text-gray-900 mb-4">
                Candidats par classe
              </h3>
              <div className="space-y-3">
                {stats.byClass.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between">
                    <span className="font-lato text-sm text-gray-700">{cls.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-900 rounded-full"
                          style={{ width: `${stats.totalCandidates > 0 ? (cls.count / stats.totalCandidates) * 100 : 0}%` }} />
                      </div>
                      <span className="font-poppins font-semibold text-sm text-primary-900 w-8 text-right">{cls.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-poppins font-bold text-lg text-gray-900">Niveau actuel</h3>
              <button onClick={() => setActiveTab('level')}
                className="flex items-center gap-1 text-sm text-primary-900 font-poppins font-medium hover:underline">
                Changer <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
                <span className="font-poppins font-bold text-2xl text-white">{level}</span>
              </div>
              <div>
                <p className="font-poppins font-bold text-lg text-gray-900">{LEVEL_NAMES[level]}</p>
                <p className="font-lato text-sm text-gray-500">{LEVEL_DESCRIPTIONS[level]}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Level Management */}
      {activeTab === 'level' && (
        <div className="space-y-6">
          <h3 className="font-poppins font-bold text-lg text-gray-900">Gestion des niveaux</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((l) => (
              <div key={l}
                className={`relative bg-white rounded-2xl p-6 shadow-sm border-2 transition-all ${
                  level === l ? 'border-primary-900 shadow-lg shadow-primary-900/10' : 'border-gray-100 hover:border-gray-200'
                }`}>
                {level === l && (
                  <div className="absolute top-4 right-4">
                    <div className="px-2 py-1 bg-primary-900 text-white text-[10px] font-semibold rounded-full">ACTIF</div>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    level === l ? 'gradient-primary' : 'bg-gray-100'
                  }`}>
                    <span className={`font-poppins font-bold text-xl ${
                      level === l ? 'text-white' : 'text-gray-400'
                    }`}>{l}</span>
                  </div>
                  <div>
                    <p className="font-poppins font-bold text-gray-900">{LEVEL_NAMES[l]}</p>
                    <p className="font-lato text-xs text-gray-500">{LEVEL_DESCRIPTIONS[l]}</p>
                  </div>
                </div>
                {level !== l && (
                  <button onClick={() => changeLevel(l)} disabled={processing}
                    className="w-full py-2.5 bg-primary-900 text-white rounded-xl font-poppins font-semibold text-sm hover:bg-primary-800 transition-all disabled:opacity-50">
                    Activer ce niveau
                  </button>
                )}
                {l === 3 && level !== 3 && (
                  <p className="mt-2 font-lato text-xs text-orange-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Cela qualifiera automatiquement les 3 premiers de chaque catégorie par classe
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories & Classes */}
      {activeTab === 'categories' && (
        <div className="space-y-8">
          <div>
            <h3 className="font-poppins font-bold text-lg text-gray-900 mb-4">Catégories d'awards</h3>
            <form onSubmit={addCategory} className="flex flex-col sm:flex-row gap-3 mb-4">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nom de la catégorie"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 outline-none font-lato" />
              <input type="text" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Description (optionnel)"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 outline-none font-lato" />
              <button type="submit"
                className="flex items-center gap-2 px-5 py-3 bg-primary-900 text-white rounded-xl font-poppins font-semibold text-sm hover:bg-primary-800 transition-all">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </form>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <div>
                    <p className="font-poppins font-medium text-gray-900">{cat.name}</p>
                    {cat.description && <p className="font-lato text-xs text-gray-400">{cat.description}</p>}
                  </div>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-poppins font-bold text-lg text-gray-900 mb-4">Classes</h3>
            <form onSubmit={addClass} className="flex gap-3 mb-4">
              <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Nom de la classe"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 outline-none font-lato" />
              <button type="submit"
                className="flex items-center gap-2 px-5 py-3 bg-primary-900 text-white rounded-xl font-poppins font-semibold text-sm hover:bg-primary-800 transition-all">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </form>
            <div className="space-y-2">
              {classes.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100">
                  <p className="font-poppins font-medium text-gray-900">{cls.name}</p>
                  <button onClick={() => deleteClass(cls.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comments Moderation */}
      {activeTab === 'comments' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-poppins font-bold text-lg text-gray-900">Modération des commentaires</h3>
            <button onClick={() => refreshComments()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-900 hover:bg-primary-900/5 rounded-lg font-poppins font-medium transition-all">
              <RefreshCw className="w-4 h-4" /> Actualiser
            </button>
          </div>
          {comments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-poppins text-gray-400">Aucun commentaire à modérer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment: TComment) => (
                <CommentModerationItem key={comment.id} comment={comment} onAction={handleCommentAction} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidates list */}
      {activeTab === 'candidates' && (
        <div>
          <h3 className="font-poppins font-bold text-lg text-gray-900 mb-4">
            Liste des candidats ({candidates.length})
          </h3>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-poppins font-medium text-xs text-gray-500 uppercase">Photo</th>
                    <th className="px-4 py-3 text-left font-poppins font-medium text-xs text-gray-500 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left font-poppins font-medium text-xs text-gray-500 uppercase">Classe</th>
                    <th className="px-4 py-3 text-left font-poppins font-medium text-xs text-gray-500 uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-left font-poppins font-medium text-xs text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left font-poppins font-medium text-xs text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.name} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-primary-900/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-900/40" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-lato text-sm text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 font-lato text-sm text-gray-600">{c.classes?.name}</td>
                      <td className="px-4 py-3 font-lato text-sm text-gray-600">{c.categories?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.is_qualified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {c.is_qualified ? 'Qualifié' : 'En lice'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={async () => {
                          await supabase.from('candidates').delete().eq('id', c.id);
                          refreshCandidates();
                        }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Voting Results */}
      {activeTab === 'results' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-poppins font-bold text-lg text-gray-900">Résultats des votes</h3>
            <button onClick={() => refreshResults()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-900 hover:bg-primary-900/5 rounded-lg font-poppins font-medium transition-all">
              <RefreshCw className={`w-4 h-4 ${resultsLoading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>

          {/* Participation par étape */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="font-poppins font-medium text-sm text-gray-500 mb-2">Votants inscrits</p>
              <p className="font-poppins font-bold text-3xl text-gray-900">{totalVoters}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="font-poppins font-medium text-sm text-gray-500 mb-2">
                Niveau 2 — Vote Intra-Classes
              </p>
              <p className="font-poppins font-bold text-3xl text-gray-900">
                {voteResults.level2Voters}
                <span className="text-base font-medium text-gray-400"> / {totalVoters}</span>
              </p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary-900 rounded-full"
                  style={{ width: `${totalVoters > 0 ? (voteResults.level2Voters / totalVoters) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="font-poppins font-medium text-sm text-gray-500 mb-2">
                Niveau 3 — Vote Inter-Classes
              </p>
              <p className="font-poppins font-bold text-3xl text-gray-900">
                {voteResults.level3Voters}
                <span className="text-base font-medium text-gray-400"> / {totalVoters}</span>
              </p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary-900 rounded-full"
                  style={{ width: `${totalVoters > 0 ? (voteResults.level3Voters / totalVoters) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Niveau 2 results */}
          <div>
            <h4 className="font-poppins font-bold text-base text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-900" />
              Résultats — Vote Intra-Classes (Niveau 2)
            </h4>
            {voteResults.level2Groups.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                <p className="font-lato text-gray-400">Aucun candidat inscrit pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {voteResults.level2Groups.map((g) => (
                  <div key={`${g.classId}_${g.categoryId}`} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="font-poppins font-semibold text-sm text-gray-900 mb-0.5">{g.categoryName}</p>
                    <p className="font-lato text-xs text-gray-400 mb-3">{g.className}</p>
                    <div className="space-y-2">
                      {g.ranking.map((r, i) => (
                        <div key={r.candidate.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {i === 0 ? (
                              <Medal className="w-4 h-4 text-yellow-500" />
                            ) : i === 1 ? (
                              <Medal className="w-4 h-4 text-gray-400" />
                            ) : i === 2 ? (
                              <Medal className="w-4 h-4 text-orange-400" />
                            ) : (
                              <span className="w-4 h-4 text-center text-xs text-gray-300 font-poppins">{i + 1}</span>
                            )}
                            <span className={`font-lato text-sm ${i === 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'} ${r.candidate.is_qualified ? '' : ''}`}>
                              {r.candidate.name}
                            </span>
                            {r.candidate.is_qualified && (
                              <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded-full">Qualifié</span>
                            )}
                          </div>
                          <span className="font-poppins font-bold text-sm text-primary-900">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Niveau 3 results */}
          <div>
            <h4 className="font-poppins font-bold text-base text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary-900" />
              Résultats — Vote Inter-Classes / Finalistes (Niveau 3)
            </h4>
            {voteResults.level3Groups.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                <p className="font-lato text-gray-400">
                  Aucun finaliste qualifié pour le moment. Activez le niveau 3 pour qualifier automatiquement les 3 premiers de chaque catégorie/classe.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {voteResults.level3Groups.map((g) => (
                  <div key={g.categoryId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <p className="font-poppins font-semibold text-sm text-gray-900 mb-3">{g.categoryName}</p>
                    <div className="space-y-2">
                      {g.ranking.map((r, i) => (
                        <div key={r.candidate.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {i === 0 ? (
                              <Medal className="w-4 h-4 text-yellow-500" />
                            ) : i === 1 ? (
                              <Medal className="w-4 h-4 text-gray-400" />
                            ) : i === 2 ? (
                              <Medal className="w-4 h-4 text-orange-400" />
                            ) : (
                              <span className="w-4 h-4 text-center text-xs text-gray-300 font-poppins">{i + 1}</span>
                            )}
                            <span className={`font-lato text-sm ${i === 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                              {r.candidate.name}
                            </span>
                            <span className="font-lato text-xs text-gray-400">({r.candidate.classes?.name})</span>
                          </div>
                          <span className="font-poppins font-bold text-sm text-primary-900">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gala Settings */}
      {activeTab === 'gala' && (
        <div className="space-y-6">
          <h3 className="font-poppins font-bold text-lg text-gray-900">Paramètres du Grand Bal</h3>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div>
              <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date et heure du bal
              </label>
              <input
                type="datetime-local"
                value={galaDate}
                onChange={(e) => setGalaDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none font-lato"
              />
              <p className="font-lato text-xs text-gray-400 mt-1">
                Laissez vide pour afficher "La date sera bientôt disponible"
              </p>
            </div>

            <div>
              <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
                <Camera className="w-4 h-4 inline mr-1" />
                Image du bal
              </label>
              <div
                onClick={() => galaFileRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-900/50 hover:bg-primary-900/5 transition-all overflow-hidden"
              >
                {gala?.gala_image_url ? (
                  <img src={gala.gala_image_url} alt="Bal" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400 font-lato">Cliquez pour ajouter une image</p>
                  </>
                )}
              </div>
              <input
                ref={galaFileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setGalaImageFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {galaImageFile && (
                <p className="font-lato text-xs text-green-600 mt-1">
                  Fichier sélectionné : {galaImageFile.name}
                </p>
              )}
            </div>

            <button
              onClick={saveGalaSettings}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-3 bg-primary-900 text-white rounded-xl font-poppins font-semibold hover:bg-primary-800 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {processing ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-poppins font-semibold text-sm text-gray-500 mb-3">Aperçu de la page de clôture</h4>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              {gala?.gala_date && new Date(gala.gala_date).getTime() > Date.now() ? (
                <p className="font-poppins text-primary-900">
                  Compte à rebours actif vers le {new Date(gala.gala_date).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              ) : (
                <p className="font-poppins text-gray-400">"La date sera bientôt disponible"</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
