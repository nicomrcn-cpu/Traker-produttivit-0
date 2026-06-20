import React, { useState, useEffect } from 'react';
import { MacroCategory, AVAILABLE_ICONS, AVAILABLE_COLORS } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { X, Check, Trash2, Tag, Palette } from 'lucide-react';

interface CategoryModalProps {
  category?: MacroCategory | null;
  onClose: () => void;
  onSave: (name: string, color: string, icon: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function CategoryModal({ category, onClose, onSave, onDelete }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('Activity');
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
      setIcon(category.icon);
    } else {
      setName('');
      // Default to primary Blue
      setColor('#3b82f6');
      setIcon('Activity');
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave(name.trim(), color, icon);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="category-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
      <div id="category-modal-content" className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black tracking-widest text-slate-800 dark:text-white flex items-center gap-2 uppercase">
            <Tag className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            {category ? 'Modifica Categoria' : 'Nuova Macro-Categoria'}
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-505 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Nome Categoria */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-455 dark:text-slate-500 mb-2">
              Nome Categoria
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Benessere, Finanze, Lavoro..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-semibold"
            />
          </div>

          {/* Selezione Colore */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-blue-500" />
              Colore Rappresentativo
            </label>
            <div className="grid grid-cols-5 xs:grid-cols-10 gap-3">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all shrink-0 ${
                    color === c 
                      ? 'border-slate-900 dark:border-white scale-110 shadow-md' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selezione Icona */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-455 dark:text-slate-500 mb-3">
              Icona Rappresentativa
            </label>
            <div className="grid grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl max-h-[160px] overflow-y-auto border border-slate-200/60 dark:border-slate-800/80">
              {AVAILABLE_ICONS.map((ico) => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setIcon(ico)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                    icon === ico 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 scale-105 shadow-sm' 
                      : 'border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-405 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <CategoryIcon name={ico} className="w-6 h-6" />
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Delete Section */}
          {category && onDelete && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Elimina questa categoria
                </button>
              ) : (
                <div className="p-5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30 rounded-2xl text-xs text-rose-800 dark:text-rose-300 animate-slide-up">
                  <p className="font-extrabold block mb-2 uppercase tracking-wide">Sei sicuro di voler eliminare questa categoria?</p>
                  <p className="mb-4 leading-relaxed font-semibold">Eliminando la categoria verranno rimosse anche tutte le sue sotto-attività e valutazioni associate. Questa azione è irreversibile.</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      disabled={loading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-lg transition-colors disabled:opacity-55"
                    >
                      {loading ? 'Eliminazione...' : 'Sì, Elimina'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-slate-700 font-extrabold uppercase tracking-wider text-[10px] rounded-lg transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 font-extrabold uppercase tracking-wider text-[10px] rounded-xl transition-all border border-slate-150/50 dark:border-slate-700/50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl shadow-md shadow-blue-500/10 transition-all text-xs flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {category ? 'Salva Modifiche' : 'Crea Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
