import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../lib/context';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/upload';
import { CommentModerationItem } from '../components/CandidateCard';
import AdminLogin from '../components/AdminLogin';
import { LEVEL_NAMES, LEVEL_DESCRIPTIONS } from '../lib/types';
import type { Comment as TComment } from '../lib/types';
import {
  BarChart3, Users, Tag, MessageSquare, Settings, Trophy,
  ChevronRight, Plus, Trash2, CheckCircle, AlertTriangle, RefreshCw,
  Calendar, Camera, Save, Crown, Medal,
} from 'lucide-react';

interface VoteRow {
  candidate_id: string;
  category_id: string;
}

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

  // Results (votes) state
  const [resultsLevel, setResultsLevel] = useState<2 | 3>(3);
  const [votesLevel2, setVotesLevel2] = useState<VoteRow[]>([]);
  const [votesLevel3, setVotesLevel3] = useState<VoteRow[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  const loadResults = async () => {
    setResultsLoading(true);
    try {
      const [{ data: v2 }, { data: v3 }] = await Promise.all([
        supabase.from('votes').select('candidate_id, category_id').eq('level', 2),
        supabase.from('votes').select('candidate_id, category_id').eq('level', 3),
      ]);
      setVotesLevel2(v2 || []);
      setVotesLevel3(v3 || []);
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'results') loadResults();
  }, [activeTab]);

  // Vote counts per candidate for each level
  const voteCounts2 = useMemo(() => {
    const counts: Record<string, number> = {};
    votesLevel2.forEach((v) => { counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1; });
    return counts;
  }, [votesLevel2]);

  const voteCounts3 = useMemo(() => {
    const counts: Record<string, number> = {};
    votesLevel3.forEach((v) => { counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1; });
    return counts;
  }, [votesLevel3]);

  // Niveau 2 : classement par classe + catégorie (vote intra-classe)
  const resultsByClassAndCategory = useMemo(() => {
    const groups: Record<string, { className: string; categoryName: string; candidates: { candidate: typeof candidates[number]; count: number }[] }> = {};
    candidates.forEach((c) => {
      const key = `${c.class_id}_${c.category_id}`;
      if (!groups[key]) {
        groups[key] = {
          className: c.classes?.name || 'Classe inconnue',
          categoryName: c.categories?.name || 'Catégorie inconnue',
          candidates: [],
        };
      }
      groups[key].candidates.push({ candidate: c, count: voteCounts2[c.id] || 0 });
    });
    Object.values(groups).forEach((g) => g.candidates.sort((a, b) => b.count - a.count));
    return Object.values(groups).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName) || a.className.localeCompare(b.className)
    );
  }, [candidates, voteCounts2]);

  // Niveau 3 : classement final par catégorie (finalistes qualifiés) -> les gagnants
  const resultsByCategory = useMemo(() => {
    const groups: Record<string, { categoryName: string; candidates: { candidate: typeof candidates[number]; count: number }[] }> = {};
    candidates.filter((c) => c.is_qualified).forEach((c) => {
      const key = c.category_id;
      if (!groups[key]) {
        groups[key] = { categoryName: c.categories?.name || 'Catégorie inconnue', candidates: [] };
      }
      groups[key].candidates.push({ candidate: c, count: voteCounts3[c.id] || 0 });
    });
    Object.values(groups).forEach((g) => g.candidates.sort((a, b) => b.count - a.count));
    return Object.values(groups).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [candidates, voteCounts3]);

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
    { id: 'results' as const, label: 'Résultats', icon: Crown },
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

      {/* Results */}
      {activeTab === 'results' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-poppins font-bold text-lg text-gray-900">Résultats des votes</h3>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setResultsLevel(3)}
                  className={`px-4 py-2 rounded-lg text-sm font-poppins font-medium transition-all ${
                    resultsLevel === 3 ? 'bg-white shadow-sm text-primary-900' : 'text-gray-500'
                  }`}
                >
                  Finale (Niveau 3)
                </button>
                <button
                  onClick={() => setResultsLevel(2)}
                  className={`px-4 py-2 rounded-lg text-sm font-poppins font-medium transition-all ${
                    resultsLevel === 2 ? 'bg-white shadow-sm text-primary-900' : 'text-gray-500'
                  }`}
                >
                  Intra-classes (Niveau 2)
                </button>
              </div>
              <button onClick={() => loadResults()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-900 hover:bg-primary-900/5 rounded-lg font-poppins font-medium transition-all">
                <RefreshCw className={`w-4 h-4 ${resultsLoading ? 'animate-spin' : ''}`} /> Actualiser
              </button>
            </div>
          </div>

          {resultsLoading ? (
            <div className="text-center py-16">
              <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
              <p className="font-poppins text-gray-400">Chargement des résultats...</p>
            </div>
          ) : resultsLevel === 3 ? (
            resultsByCategory.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Crown className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-poppins text-gray-400">
                  Aucun finaliste qualifié pour l'instant. Passez au niveau 3 pour qualifier les finalistes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {resultsByCategory.map((group) => {
                  const totalVotes = group.candidates.reduce((sum, c) => sum + c.count, 0);
                  const winner = group.candidates[0];
                  return (
                    <div key={group.categoryName} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-poppins font-bold text-gray-900">{group.categoryName}</h4>
                        <span className="font-lato text-xs text-gray-400">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                      </div>

                      {winner && winner.count > 0 && (
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                          <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
                            <Crown className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-poppins font-bold text-sm text-yellow-800 truncate">
                              🏆 {winner.candidate.name}
                            </p>
                            <p className="font-lato text-xs text-yellow-700">
                              Gagnant · {winner.count} vote{winner.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {group.candidates.map((c, idx) => (
                          <div key={c.candidate.id} className="flex items-center gap-3">
                            <span className={`w-5 text-xs font-poppins font-semibold text-right ${
                              idx === 0 ? 'text-yellow-600' : 'text-gray-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="flex-1 font-lato text-sm text-gray-700 truncate">{c.candidate.name}</span>
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${idx === 0 ? 'bg-yellow-400' : 'bg-primary-900'}`}
                                style={{ width: `${totalVotes > 0 ? (c.count / totalVotes) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="w-6 text-right font-poppins font-semibold text-xs text-gray-700">{c.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : resultsByClassAndCategory.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Medal className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-poppins text-gray-400">Aucun candidat enregistré pour l'instant.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {resultsByClassAndCategory.map((group) => {
                const totalVotes = group.candidates.reduce((sum, c) => sum + c.count, 0);
                const winner = group.candidates[0];
                return (
                  <div key={`${group.className}_${group.categoryName}`} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-poppins font-bold text-gray-900">{group.categoryName}</h4>
                        <p className="font-lato text-xs text-gray-400">{group.className}</p>
                      </div>
                      <span className="font-lato text-xs text-gray-400">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                    </div>

                    {winner && winner.count > 0 && (
                      <div className="flex items-center gap-2 mb-3 text-sm">
                        <Medal className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <span className="font-poppins font-semibold text-gray-800 truncate">{winner.candidate.name}</span>
                        <span className="font-lato text-xs text-gray-400">({winner.count} vote{winner.count !== 1 ? 's' : ''})</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {group.candidates.map((c, idx) => (
                        <div key={c.candidate.id} className="flex items-center gap-3">
                          <span className={`w-5 text-xs font-poppins font-semibold text-right ${
                            idx === 0 ? 'text-yellow-600' : 'text-gray-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className={`flex-1 font-lato text-sm truncate ${
                            c.candidate.is_qualified ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {c.candidate.name}
                            {c.candidate.is_qualified && (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 inline ml-1.5" />
                            )}
                          </span>
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${idx === 0 ? 'bg-yellow-400' : 'bg-primary-900'}`}
                              style={{ width: `${totalVotes > 0 ? (c.count / totalVotes) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-6 text-right font-poppins font-semibold text-xs text-gray-700">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
