import React, { useMemo } from 'react';
import { MacroCategory, SubActivity, ActivityLog } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { PlusCircle, Edit2, AlertCircle, Star } from 'lucide-react';

const getYearMonthStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

function getYearWeekStr(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

interface CategoryCardProps {
  category: MacroCategory;
  subActivities: SubActivity[];
  logs: ActivityLog[];
  selectedDate: string; // YYYY-MM-DD
  onEditCategory: () => void;
  onAddSubActivity: () => void;
  onEditSubActivity: (sub: SubActivity) => void;
  onLogScore: (subId: string, score: number | null) => Promise<void>;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  subActivities,
  logs,
  selectedDate,
  onEditCategory,
  onAddSubActivity,
  onEditSubActivity,
  onLogScore
}) => {

  // Filtra le sotto-attività in base alla validità per la data selezionata (selectedDate)
  const filteredSubActivities = useMemo(() => {
    return subActivities.filter(sub => {
      if (!sub.type || sub.type === 'recurring') return true;

      const targetDate = new Date(selectedDate);
      if (isNaN(targetDate.getTime())) return true;

      if (sub.validityType === 'week') {
        const weekCode = getYearWeekStr(targetDate);
        return sub.validityPeriod === weekCode;
      }
      if (sub.validityType === 'month') {
        const monthCode = getYearMonthStr(targetDate);
        return sub.validityPeriod === monthCode;
      }

      return false;
    });
  }, [subActivities, selectedDate]);

  // Calcola il punteggio della categoria in tempo reale per oggi/settimana
  const { currentScore, weeklyCompliance } = useMemo(() => {
    if (filteredSubActivities.length === 0) {
      return { currentScore: 0, weeklyCompliance: 0 };
    }

    const now = new Date();
    // Ottieni inizio settimana (Lunedì)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekTimestamp = startOfWeek.getTime();

    const totalWeight = filteredSubActivities.reduce((sum, s) => sum + s.weight, 0) || 1;
    
    let weightedScoreSum = 0;
    let complianceSum = 0;

    filteredSubActivities.forEach(sub => {
      // Trova log di questa settimana
      const subLogs = logs.filter(
        log => log.subActivityId === sub.id && new Date(log.date).getTime() >= startOfWeekTimestamp
      );

      const loggedDaysThisWeek = subLogs.length;
      const targetRatio = Math.min(loggedDaysThisWeek / sub.weeklyTarget, 1);
      
      let avgScore = 0;
      if (loggedDaysThisWeek > 0) {
        const sumScores = subLogs.reduce((sum, l) => sum + l.score, 0);
        avgScore = sumScores / loggedDaysThisWeek;
      }

      // successo = frequenza * (voto/10)
      const successRatio = targetRatio * (avgScore / 10);
      weightedScoreSum += (sub.weight / totalWeight) * successRatio * 100;
      complianceSum += (sub.weight / totalWeight) * targetRatio * 100;
    });

    return {
      currentScore: Math.round(weightedScoreSum),
      weeklyCompliance: Math.round(complianceSum)
    };
  }, [filteredSubActivities, logs]);

  return (
    <div 
      id={`category-card-${category.id}`} 
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
      style={{ borderTop: `4px solid ${category.color}` }}
    >
      {/* Header Categoria */}
      <div 
        className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2.5 rounded-xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: category.color }}
          >
            <CategoryIcon name={category.icon} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-white uppercase">{category.name}</h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase tracking-wider font-extrabold mt-1">
              Score: {currentScore}% Successo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onEditCategory}
            className="p-1 px-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            title="Modifica Categoria"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Modifica</span>
          </button>
        </div>
      </div>

      {/* Sotto-attività */}
      <div className="p-6 flex-1 flex flex-col space-y-6">
        {filteredSubActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-550 flex-1 flex flex-col items-center justify-center">
            <AlertCircle className="w-8 h-8 stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold">Nessuna sotto-attività creata o attiva.</p>
            <p className="text-[10px] mt-1 text-slate-400 dark:text-slate-500 leading-normal max-w-xs mx-auto">
              Aggiungi sotto-attività ed imposta gli obiettivi per iniziare ad accumulare progresso settimanale. Le attività temporanee appaiono solo nel loro periodo di validità.
            </p>
          </div>
        ) : (
          <div className="space-y-6 flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredSubActivities.map((sub, idx) => {
              // Trova il log di oggi/giorno selezionato
              const logToday = logs.find(
                l => l.subActivityId === sub.id && l.date === selectedDate
              );

              // Trova tutti i log di questa settimana per calcolare lo stato di avanzamento
              const now = new Date();
              const day = now.getDay();
              const diff = now.getDate() - day + (day === 0 ? -6 : 1);
              const startOfWeek = new Date(now.setDate(diff));
              startOfWeek.setHours(0, 0, 0, 0);
              const startOfWeekTimestamp = startOfWeek.getTime();

              const logsThisWeek = logs.filter(
                l => l.subActivityId === sub.id && new Date(l.date).getTime() >= startOfWeekTimestamp
              );

              // Calcolo E (Esecuzioni Correnti) e T (Target dell'Intervallo Attivo)
              let currentPeriodE = 0;
              let currentPeriodT = sub.weeklyTarget || 3;
              let periodLabel = 'settimanale';

              const nowForPeriod = new Date();
              if (sub.type === 'temporary' && sub.validityType === 'month') {
                periodLabel = 'mensile';
                currentPeriodT = currentPeriodT * 4;
                
                let startOfMonth = new Date(nowForPeriod.getFullYear(), nowForPeriod.getMonth(), 1, 0, 0, 0, 0);
                if (sub.validityPeriod) {
                  const [year, month] = sub.validityPeriod.split('-');
                  startOfMonth = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
                }
                const startOfMonthTimestamp = startOfMonth.getTime();
                const endOfMonthTimestamp = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1, 0, 0, 0, 0).getTime();

                const logsThisMonth = logs.filter(l => {
                  const logTime = new Date(l.date).getTime();
                  return l.subActivityId === sub.id && logTime >= startOfMonthTimestamp && logTime < endOfMonthTimestamp;
                });
                currentPeriodE = logsThisMonth.length;
              } else {
                const logsThisWeekForE = logs.filter(l => {
                  const logTime = new Date(l.date).getTime();
                  return l.subActivityId === sub.id && logTime >= startOfWeekTimestamp;
                });
                currentPeriodE = logsThisWeekForE.length;
              }

              const percentageVal = Math.round((currentPeriodE / (currentPeriodT || 1)) * 100);
              const ratio = Math.min(percentageVal, 100);

              let progressColor = 'bg-red-500';
              if (percentageVal >= 80) {
                progressColor = 'bg-emerald-500';
              } else if (percentageVal >= 55) {
                progressColor = 'bg-amber-500';
              }

              return (
                <div 
                  key={sub.id} 
                  className={`pt-5 ${idx === 0 ? 'pt-0' : ''} flex flex-col space-y-3`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                          {sub.name}
                        </span>
                        {sub.dailyValuation && (
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[8px] font-extrabold uppercase rounded tracking-widest">
                            Daily
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                        <span>OBBIETTIVO: <strong>{sub.weeklyTarget}V/SETT.</strong> (FATTO: {logsThisWeek.length})</span> 
                        <span>•</span>
                        <span>PESO: <strong>{sub.weight}%</strong></span>
                      </p>
                    </div>

                    <button
                      onClick={() => onEditSubActivity(sub)}
                      className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors border border-transparent hover:border-slate-200/50"
                      title="Configura sotto-attività"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Performance Indicator Block */}
                  <div className="space-y-1 bg-slate-50/50 dark:bg-slate-950/10 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-450">
                      <span className="flex items-center gap-1">
                        Avanzamento {periodLabel}: <strong className="text-slate-700 dark:text-slate-300 font-black">{currentPeriodE}/{currentPeriodT} gg</strong>
                      </span>
                      <span className={`font-black ${percentageVal >= 80 ? 'text-emerald-500' : percentageVal >= 55 ? 'text-amber-500' : 'text-red-500'}`}>
                        {percentageVal}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${ratio}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pulsantiera Voto 1-10 */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-450 dark:text-slate-500 tracking-wider block mb-1">
                      Punteggio Giornaliero:
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const isSelected = logToday?.score === num;
                        return (
                          <button
                            key={num}
                            onClick={() => onLogScore(sub.id, isSelected ? null : num)}
                            className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                              isSelected
                                ? 'shadow-sm scale-110'
                                : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-150/40 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-755'
                            }`}
                            style={isSelected ? { backgroundColor: category.color, color: '#fff', boxShadow: `0 4px 10px -2px ${category.color}44` } : {}}
                          >
                            {num}
                          </button>
                        );
                      })}
                      {logToday && (
                        <button
                          onClick={() => onLogScore(sub.id, null)}
                          className="px-2 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/25 text-[10px] font-bold rounded-md transition-colors uppercase tracking-wider"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottone Aggiungi Sotto-attività */}
        <button
          onClick={onAddSubActivity}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-extrabold border border-slate-150 dark:border-slate-750/70 rounded-xl transition-all text-xs uppercase tracking-wider"
        >
          <PlusCircle className="w-4 h-4" />
          Aggiungi Sotto-Attività
        </button>
      </div>
    </div>
  );
}
