import React, { useState, useEffect } from 'react';
import { SubActivity, MacroCategory } from '../types';
import { X, Check, Trash2, PlusCircle, AlertCircle } from 'lucide-react';

const getYearMonthStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

function getYearWeekStr(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

const getMonthsList = () => {
  const list = [];
  const now = new Date();
  for (let i = -1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    list.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return list;
};

interface SubActivityModalProps {
  subActivity?: SubActivity | null;
  categoryId: string;
  categories: MacroCategory[];
  onClose: () => void;
  onSave: (
    name: string, 
    categoryId: string, 
    weeklyTarget: number, 
    weight: number, 
    dailyValuation: boolean,
    type: 'recurring' | 'temporary',
    validityType?: 'week' | 'month',
    validityPeriod?: string
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function SubActivityModal({ 
  subActivity, 
  categoryId, 
  categories, 
  onClose, 
  onSave, 
  onDelete 
}: SubActivityModalProps) {
  const [name, setName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [weight, setWeight] = useState(50);
  const [dailyValuation, setDailyValuation] = useState(false);
  const [activityType, setActivityType] = useState<'recurring' | 'temporary'>('recurring');
  const [valType, setValType] = useState<'week' | 'month'>('week');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (subActivity) {
      setName(subActivity.name);
      setSelectedCategoryId(subActivity.categoryId);
      setWeeklyTarget(subActivity.weeklyTarget);
      setWeight(subActivity.weight);
      setDailyValuation(subActivity.dailyValuation || false);
      setActivityType(subActivity.type || 'recurring');
      setValType(subActivity.validityType || 'week');
      setSelectedPeriod(subActivity.validityPeriod || '');
    } else {
      setName('');
      setSelectedCategoryId(categoryId);
      setWeeklyTarget(3);
      setWeight(50);
      setDailyValuation(false);
      setActivityType('recurring');
      setValType('week');
      setSelectedPeriod('');
    }
  }, [subActivity, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedCategoryId) return;

    setLoading(true);
    try {
      const currentWeekCode = getYearWeekStr(new Date());
      const defaultMonthCode = getYearMonthStr(new Date());
      
      await onSave(
        name.trim(), 
        selectedCategoryId, 
        weeklyTarget, 
        weight, 
        dailyValuation,
        activityType,
        activityType === 'temporary' ? valType : undefined,
        activityType === 'temporary' ? (valType === 'week' ? currentWeekCode : (selectedPeriod || defaultMonthCode)) : undefined
      );
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
    <div id="sub-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div id="sub-modal-content" className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black tracking-widest text-slate-800 dark:text-white flex items-center gap-2 uppercase">
            <PlusCircle className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            {subActivity ? 'Modifica Sotto-Attività' : 'Aggiungi Sotto-Attività'}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-405 dark:text-slate-500 hover:text-slate-705 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Nome Sotto-attività */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-2">
              Nome della Sotto-Attività
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Scheda A, Meditazione, 10 Pagine Libro..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-semibold"
            />
          </div>

          {/* Categoria Madre */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-2">
              Categoria Madre
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-semibold cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo di Attività: Ricorrente o Temporanea */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500 mb-2">
              Tipo di Attività
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActivityType('recurring')}
                className={`py-3 px-4 rounded-xl text-xs font-extrabold border transition-all ${
                  activityType === 'recurring'
                    ? 'border-blue-650 bg-blue-50/50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Abitudine Ricorrente
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivityType('temporary');
                  if (!selectedPeriod) {
                    const months = getMonthsList();
                    setSelectedPeriod(months[1]?.value || ''); // Default to current month
                  }
                }}
                className={`py-3 px-4 rounded-xl text-xs font-extrabold border transition-all ${
                  activityType === 'temporary'
                    ? 'border-blue-650 bg-blue-50/50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Obiettivo Temporaneo
              </button>
            </div>
          </div>

          {/* Configurazione Scadenza/Validità (solo per Temporanea) */}
          {activityType === 'temporary' && (
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-705 rounded-2xl space-y-4 animate-slide-up">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  Periodizzazione Scadenza
                </label>
                <div className="grid grid-cols-2 gap-2 font-black uppercase">
                  <button
                    type="button"
                    onClick={() => setValType('week')}
                    className={`py-2 px-3 rounded-lg text-[10px] tracking-widest border transition-all ${
                      valType === 'week'
                        ? 'border-violet-650 bg-violet-50/50 text-violet-850 dark:bg-violet-950/20 dark:text-violet-300'
                        : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-850'
                    }`}
                  >
                    Questa settimana
                  </button>
                  <button
                    type="button"
                    onClick={() => setValType('month')}
                    className={`py-2 px-3 rounded-lg text-[10px] tracking-widest border transition-all ${
                      valType === 'month'
                        ? 'border-violet-650 bg-violet-50/50 text-violet-850 dark:bg-violet-950/20 dark:text-violet-300'
                        : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-850'
                    }`}
                  >
                    Mese Specifico
                  </button>
                </div>
              </div>

              {valType === 'week' ? (
                <div className="text-[11px] font-semibold text-slate-550 dark:text-slate-400 leading-normal">
                  L'obiettivo sarà attivo ed impatterà sul computo <span className="text-violet-605 dark:text-violet-400 font-extrabold uppercase tracking-wide">solamente per la settimana corrente</span> (Codice Settimana: {getYearWeekStr(new Date())}).
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    Scegli il Mese di Termine
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold cursor-pointer"
                  >
                    {getMonthsList().map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Obiettivo di Frequenza Settimanale: Slider o Numerico */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-500">
                Obiettivo di Frequenza Settimanale
              </label>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {weeklyTarget} {weeklyTarget === 1 ? 'giorno / sett.' : 'giorni / sett.'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
              <span>Min: 1 giorno</span>
              <span>Max: 7 giorni (Daily)</span>
            </div>
          </div>

          {/* Peso Impatto Categoria Madre */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-455 dark:text-slate-500 flex items-center gap-1.5">
                Peso Relativo (%)
                <div className="group relative">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-500 cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-15 p-2.5 bg-slate-950 text-white rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal leading-normal shadow-md z-10 font-bold max-w-sm">
                    Determina l'impatto di questa sotto-attività sul punteggio della categoria madre, rispetto alle altre sotto-attività della stessa categoria.
                  </div>
                </div>
              </label>
              <span className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                {weight}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:accent-violet-450"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
              <span>Basso (5%)</span>
              <span>Alto (100%)</span>
            </div>
          </div>

          {/* Reminder Giornaliero */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl">
            <div className="space-y-0.5">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-205 uppercase tracking-wide">
                Tracciamento Giornaliero
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold leading-normal">
                Se attivo, riceverai una notifica alle 23:00 qualora non l'avessi compilata oggi.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dailyValuation}
                onChange={(e) => setDailyValuation(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Confirm Delete Section */}
          {subActivity && onDelete && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-350 transition-colors"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Elimina sotto-attività
                </button>
              ) : (
                <div className="p-5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30 rounded-2xl text-xs text-rose-800 dark:text-rose-300 animate-slide-up">
                  <p className="font-extrabold block mb-1 uppercase tracking-wide">Sei sicuro di voler eliminare questa attività?</p>
                  <p className="mb-3 font-semibold text-rose-700/80 dark:text-rose-400/80 leading-normal">I log di esecuzione relativi verranno anch'essi cancellati definitivamente.</p>
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
              disabled={loading || !name.trim() || !selectedCategoryId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl shadow-md shadow-blue-500/10 transition-all text-xs flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              {subActivity ? 'Salva Modifiche' : 'Salva Attività'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
