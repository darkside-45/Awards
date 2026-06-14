import { useState, useMemo, useRef } from 'react';
import { useApp } from '../lib/context';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/upload';
import CandidateCard from '../components/CandidateCard';
import { UserPlus, Search, Filter, Camera } from 'lucide-react';

export default function Level1Registration() {
  const { classes, categories, candidates } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !filterCategory || c.category_id === filterCategory;
      const matchClass = !filterClass || c.class_id === filterClass;
      return matchSearch && matchCat && matchClass;
    });
  }, [candidates, search, filterCategory, filterClass]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((c) => {
      const catName = c.categories?.name || 'Autre';
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(c);
    });
    return groups;
  }, [filtered]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!candidateName.trim() || !selectedClass || !selectedCategory) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadFile(photoFile, 'candidates');
        if (!photoUrl) {
          setError('Erreur lors du téléchargement de la photo.');
          setSubmitting(false);
          return;
        }
      }

      const { error: dbError } = await supabase.from('candidates').insert({
        name: candidateName.trim(),
        class_id: selectedClass,
        category_id: selectedCategory,
        photo_url: photoUrl,
      });
      if (dbError) {
        if (dbError.code === '23505') {
          setError('Ce candidat est déjà inscrit dans cette catégorie pour cette classe.');
        } else {
          throw dbError;
        }
        return;
      }
      setSuccess(`${candidateName.trim()} a été inscrit(e) avec succès !`);
      setCandidateName('');
      setSelectedCategory('');
      setPhotoFile(null);
      setPhotoPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError("Erreur lors de l'inscription. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Hero Section */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 text-sm font-poppins font-medium mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Phase d'inscription en cours
        </div>
        <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-gray-900 mb-3">
          Les Candidats <span className="text-gradient">Awards 2026</span>
        </h2>
        <p className="font-lato text-gray-500 max-w-xl mx-auto">
          Découvrez les candidats inscrits et proposez vos camarades pour les différentes catégories
        </p>
      </div>

      {/* Register Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-900 text-white rounded-xl font-poppins font-semibold hover:bg-primary-800 transition-all active:scale-[0.97] shadow-lg shadow-primary-900/20"
        >
          <UserPlus className="w-5 h-5" />
          Inscrire un candidat
        </button>
      </div>

      {/* Registration Form */}
      {showForm && (
        <div className="max-w-lg mx-auto mb-10 bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-scale-in border border-gray-100">
          <h3 className="font-poppins font-bold text-xl text-gray-900 mb-6">
            Inscrire un candidat
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo upload */}
            <div>
              <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
                Photo du candidat
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-900/50 hover:bg-primary-900/5 transition-all overflow-hidden"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400 font-lato">Cliquez pour ajouter une photo</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
                Classe du candidat *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato appearance-none bg-white"
              >
                <option value="">Sélectionnez la classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
                Nom du candidat *
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato"
                placeholder="Entrez le nom du candidat..."
              />
            </div>

            <div>
              <label className="block text-sm font-poppins font-medium text-gray-700 mb-1.5">
                Catégorie de l'award *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none transition-all font-lato appearance-none bg-white"
              >
                <option value="">Sélectionnez la catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-lato bg-red-50 px-4 py-2.5 rounded-xl">
                {error}
              </p>
            )}
            {success && (
              <p className="text-green-600 text-sm font-lato bg-green-50 px-4 py-2.5 rounded-xl">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary-900 text-white rounded-xl font-poppins font-semibold hover:bg-primary-800 transition-all disabled:opacity-50"
            >
              {submitting ? 'Inscription en cours...' : 'Inscrire le candidat'}
            </button>
          </form>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un candidat..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 focus:ring-2 focus:ring-primary-900/20 outline-none font-lato"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-9 pr-8 py-3 rounded-xl border border-gray-200 focus:border-primary-900 outline-none font-lato appearance-none bg-white text-sm"
            >
              <option value="">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-900 outline-none font-lato appearance-none bg-white text-sm"
          >
            <option value="">Toutes classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidates by Category */}
      {Object.entries(groupedByCategory).length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="font-poppins font-semibold text-xl text-gray-400 mb-2">
            Aucun candidat inscrit
          </h3>
          <p className="font-lato text-gray-400">
            Soyez le premier à inscrire un camarade !
          </p>
        </div>
      ) : (
        Object.entries(groupedByCategory).map(([catName, catCandidates]) => (
          <div key={catName} className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-8 bg-primary-900 rounded-full" />
              <h3 className="font-poppins font-bold text-xl text-gray-900">
                {catName}
              </h3>
              <span className="px-2.5 py-0.5 bg-primary-900/10 text-primary-900 text-xs font-semibold rounded-full">
                {catCandidates.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catCandidates.map((candidate, idx) => (
                <div
                  key={candidate.id}
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <CandidateCard candidate={candidate} variant="registration" />
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Stats bar */}
      <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="font-poppins font-bold text-2xl sm:text-3xl text-primary-900">
              {candidates.length}
            </p>
            <p className="font-lato text-sm text-gray-500">Candidats inscrits</p>
          </div>
          <div>
            <p className="font-poppins font-bold text-2xl sm:text-3xl text-primary-900">
              {categories.length}
            </p>
            <p className="font-lato text-sm text-gray-500">Catégories</p>
          </div>
          <div>
            <p className="font-poppins font-bold text-2xl sm:text-3xl text-primary-900">
              {classes.length}
            </p>
            <p className="font-lato text-sm text-gray-500">Classes</p>
          </div>
          <div>
            <p className="font-poppins font-bold text-2xl sm:text-3xl text-primary-900">
              {new Set(candidates.map(c => c.class_id)).size}
            </p>
            <p className="font-lato text-sm text-gray-500">Classes participantes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
