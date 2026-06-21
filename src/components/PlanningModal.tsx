import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Plus, 
  Check, 
  Trash2, 
  TrendingUp, 
  AlertCircle,
  Inbox,
  Clock
} from 'lucide-react';
import { MacroCategory, SubActivity, ActivityLog, PlannedActivity } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface PlanningModalProps {
  isOpen: boolean;
  date: string; // YYYY-MM-DD
  categories: MacroCategory[];
  subActivities: SubActivity[];
  logs: ActivityLog[];
  plannedActivities: PlannedActivity[];
  onAddPlan: (subActivityId: string, date: string) => Promise<void>;
  onRemovePlan: (planId: string) => Promise<void>;
  onClose: () => void;
}

export function PlanningModal({
  isOpen,
  date,
  categories,
  subActivities,
  logs,
  plannedActivities,
  onAddPlan,
  onRemovePlan,
  onClose,
}: PlanningModalProps) {
  
  // Format the target date for humans: "lunedì 22 giugno 2026"
  const formattedDate = useMemo(() => {
    if (!date) return '';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('it-IT', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return date;
    }
  }, [date]);

  // Main business logic: Calculate and show ONLY pending subactivities, grouped by Category
  const pendingByMacroarea = useMemo(() => {
    if (!date) return [];

    const refDate = new Date(date);
    const day = refDate.getDay();
    // Monday is the start of the week in typical Italian calendar contexts
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(refDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const weekStartStamp = monday.getTime();
    const weekEndStamp = weekStartStamp + 7 * 24 * 60 * 60 * 1000;

    // Filter logs for this specific week
    const thisWeekLogs = logs.filter(l => {
      try {
        const logTime = new Date(l.date).getTime();
        return logTime >= weekStartStamp && logTime < weekEndStamp;
      } catch {
        return false;
      }
    });

    // 1. Map all subactivities to compute completions vs target
    const activitiesData = subActivities.map(sub => {
      const completionsThisWeek = thisWeekLogs.filter(l => l.subActivityId === sub.id && l.score > 0).length;
      const target = sub.weeklyTarget || 3;
      const indexPending = target - completionsThisWeek;

      // Check if it is already scheduled on this exact date
      const isAlreadyPinned = plannedActivities.some(p => p.subActivityId === sub.id && p.date === date);
      const planOnSelectedDate = plannedActivities.find(p => p.subActivityId === sub.id && p.date === date);

      return {
        sub,
        completionsThisWeek,
        target,
        pendingCount: Math.max(0, indexPending),
        isAlreadyPinned,
        planId: planOnSelectedDate?.id || null
      };
    });

    // 2. Filter keeping only "Pendenti" (target - completions > 0)
    const pendingActivities = activitiesData.filter(item => item.pendingCount > 0);

    // 3. Group by Macroarea (Category)
    return categories.map(cat => {
      const catPendingItems = pendingActivities.filter(item => item.sub.categoryId === cat.id);
      if (catPendingItems.length === 0) return null;

      return {
        category: cat,
        items: catPendingItems
      };
    }).filter(Boolean) as Array<{
      category: MacroCategory;
      items: Array<{
        sub: SubActivity;
        completionsThisWeek: number;
        target: number;
        pendingCount: number;
        isAlreadyPinned: boolean;
        planId: string | null;
      }>;
    }>;

  }, [date, categories, subActivities, logs, plannedActivities]);

  // List of items already scheduled for this selected future day
  const alreadyScheduledOnThisDay = useMemo(() => {
    if (!date) return [];
    return plannedActivities.filter(p => p.date === date).map(plan => {
      const sub = subActivities.find(s => s.id === plan.subActivityId);
      const cat = sub ? categories.find(c => c.id === sub.categoryId) : null;
      return {
        plan,
        sub,
        category: cat
      };
    }).filter(x => x.sub !== undefined);
  }, [date, plannedActivities, subActivities, categories]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-sans">
        <motion.div
          id="planning-modal-container"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-150 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-2xl text-blue-600 dark:text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">
                    Pianificazione Attività
                  </h3>
                  <h2 className="text-base font-black text-slate-800 dark:text-white capitalize mt-0.5">
                    {formattedDate}
                  </h2>
                </div>
              </div>
              <button
                id="close-planning-modal"
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-2xl transition-colors border border-slate-100 dark:border-slate-800 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* 1. Already Pinned checklist section */}
            {alreadyScheduledOnThisDay.length > 0 && (
              <div className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.03] border border-emerald-500/15 p-4 rounded-2xl">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                  <Check className="w-4 h-4 bg-emerald-100 dark:bg-emerald-950 p-0.5 rounded-full" /> 
                  Pianificati in questo giorno ({alreadyScheduledOnThisDay.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {alreadyScheduledOnThisDay.map(({ plan, sub, category }) => (
                    <div 
                      key={plan.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-850/40 border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {category && (
                          <div className="p-1.5 rounded-lg text-xs" style={{ backgroundColor: `${category.color}15`, color: category.color }}>
                            <CategoryIcon name={category.icon} className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{sub?.name}</span>
                      </div>
                      <button
                        onClick={async () => {
                          await onRemovePlan(plan.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-2"
                        title="Rimuovi pianificazione"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Grouped Pending Targets list */}
            <div>
              <div className="flex items-center gap-1.5 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Attività Pendenti della Settimana:
                </h4>
              </div>

              {pendingByMacroarea.length > 0 ? (
                <div className="space-y-5">
                  {pendingByMacroarea.map(({ category, items }) => (
                    <div 
                      key={category.id} 
                      className="border border-slate-150 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs bg-slate-50/[0.15] dark:bg-slate-950/[0.05]"
                    >
                      {/* Macroarea Header */}
                      <div 
                        className="px-4 py-3 border-b flex items-center gap-2"
                        style={{ 
                          backgroundColor: `${category.color}06`,
                          borderColor: `${category.color}15`
                        }}
                      >
                        <div 
                          className="p-1.5 rounded-lg text-xs" 
                          style={{ 
                            backgroundColor: `${category.color}15`, 
                            color: category.color 
                          }}
                        >
                          <CategoryIcon name={category.icon} className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200" style={{ color: category.color }}>
                          {category.name}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {items.map(({ sub, completionsThisWeek, target, pendingCount, isAlreadyPinned, planId }) => (
                          <div 
                            key={sub.id} 
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between sm:gap-4 hover:bg-slate-55/30 transition-colors"
                          >
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                {sub.name}
                              </h5>
                              <div className="flex flex-wrap items-center gap-x-2 mt-1 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                                <span className="text-slate-500">Target: <strong className="text-slate-700 dark:text-slate-300">{target} v/sett</strong></span>
                                <span className="opacity-40">•</span>
                                <span className="text-emerald-500">Completate: <strong>{completionsThisWeek}</strong></span>
                                <span className="opacity-40">•</span>
                                <span className="text-amber-500">Mancano: <strong>{pendingCount}</strong></span>
                              </div>
                            </div>

                            <div className="mt-3 sm:mt-0 flex shrink-0">
                              {isAlreadyPinned ? (
                                <button
                                  onClick={async () => {
                                    if (planId) await onRemovePlan(planId);
                                  }}
                                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-rose-50 hover:text-rose-600 dark:bg-emerald-950/20 text-emerald-600 rounded-xl text-xs font-black border border-emerald-200 dark:border-emerald-900/50 transition-all cursor-pointer group"
                                  title="Clicca per rimuovere"
                                >
                                  <Check className="w-3.5 h-3.5 block group-hover:hidden text-emerald-500" />
                                  <Trash2 className="w-3.5 h-3.5 hidden group-hover:block text-rose-500 animate-bounce" />
                                  <span className="group-hover:text-rose-600">Pianificato</span>
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    await onAddPlan(sub.id, date);
                                  }}
                                  className="w-full sm:w-auto flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-xs shadow-blue-500/10 hover:shadow-blue-500/20"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Pianifica per oggi
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-150 dark:border-slate-800/80 rounded-3xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                  <Inbox className="w-10 h-10 opacity-30 text-blue-500" />
                  <span className="text-xs font-black max-w-sm leading-normal uppercase tracking-wide">
                    Complimenti! Nessuna abitudine pendente rimasta da programmare per questa settimana.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Chiudi
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
