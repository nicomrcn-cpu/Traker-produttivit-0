import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  CalendarDays, 
  Check, 
  Trash2, 
  Clock, 
  X, 
  Plus, 
  Filter, 
  AlertCircle,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { MacroCategory, SubActivity, ActivityLog, PlannedActivity } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface AdvancedCalendarProps {
  categories: MacroCategory[];
  subActivities: SubActivity[];
  logs: ActivityLog[];
  plannedActivities: PlannedActivity[];
  onAddPlan: (subActivityId: string, date: string) => Promise<void>;
  onRemovePlan: (planId: string) => Promise<void>;
  onClose?: () => void;
}

// Helpers for date string manipulation
const getYearMonthStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

function getYearWeekStr(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function AdvancedCalendar({
  categories,
  subActivities,
  logs,
  plannedActivities,
  onAddPlan,
  onRemovePlan,
  onClose,
}: AdvancedCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  
  // Modal State
  const [selectedFutureDate, setSelectedFutureDate] = useState<string | null>(null);
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('all');
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Set grid helper
  const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  // Navigate month or week
  const handleNavigate = (direction: 'prev' | 'next') => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') {
      nextDate.setMonth(nextDate.getMonth() + (direction === 'prev' ? -1 : 1));
    } else {
      nextDate.setDate(nextDate.getDate() + (direction === 'prev' ? -7 : 7));
    }
    setCurrentDate(nextDate);
  };

  // Get start of week (Monday)
  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, [currentDate]);

  // Compute days list for current month view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of current month
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sun=0, Mon=1...
    // Adjust for Italian week (Mon-Sun)
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days: Date[] = [];

    // Prior month days to prefix
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = offset - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDate - i));
    }

    // Current month days
    const lastDate = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(year, month, i));
    }

    // Next month days to suffix grid to multiple of 7
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Compute days list for week view (7 days starting Monday)
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const mon = new Date(startOfWeek);
    for (let i = 0; i < 7; i++) {
      const day = new Date(mon);
      day.setDate(mon.getDate() + i);
      days.push(day);
    }
    return days;
  }, [startOfWeek]);

  // Combined helper to check if a sub-activity is valid for a target date
  const isSubValidForDate = (sub: SubActivity, date: Date) => {
    if (!sub.type || sub.type === 'recurring') return true;
    if (sub.validityType === 'week') {
      const weekCode = getYearWeekStr(date);
      return sub.validityPeriod === weekCode;
    }
    if (sub.validityType === 'month') {
      const monthCode = getYearMonthStr(date);
      return sub.validityPeriod === monthCode;
    }
    return false;
  };

  // Get daily calculations memo
  const getDayCalculations = (date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    const isFuture = dStr > todayStr;

    // A. Expected sub-activities on this day
    const activeSubs = subActivities.filter(sub => {
      // Is it generally valid on this calendar date?
      const baseValid = isSubValidForDate(sub, date);
      
      // Or is it explicitly pinned on this date?
      const isScheduledThisDay = plannedActivities.some(
        p => p.subActivityId === sub.id && p.date === dStr
      );

      return baseValid || isScheduledThisDay;
    });

    // B. Completed sub-activities (have a log on this day with score > 0)
    const dayLogs = logs.filter(l => l.date === dStr);
    const completedSubs = activeSubs.filter(sub => 
      dayLogs.some(l => l.subActivityId === sub.id && l.score > 0)
    );

    // C. Pinned sub-activities scheduled on this day
    const pinnedOnThisDay = plannedActivities.filter(p => p.date === dStr);
    const pinnedSubs = subActivities.filter(sub => 
      pinnedOnThisDay.some(p => p.subActivityId === sub.id)
    );

    // D. Weighted Completion metrics
    const totalWeight = activeSubs.reduce((sum, s) => sum + (s.weight || 10), 0) || 1;
    const completedWeight = completedSubs.reduce((sum, s) => sum + (s.weight || 10), 0);
    const completionPercentage = activeSubs.length > 0 
      ? Math.round((completedWeight / totalWeight) * 100) 
      : 0;

    // E. Breakdown by Category
    const categoryBreakdown = categories.map(cat => {
      const catActiveSubs = activeSubs.filter(sub => sub.categoryId === cat.id);
      if (catActiveSubs.length === 0) return null;

      const catCompleted = catActiveSubs.filter(sub => 
        dayLogs.some(l => l.subActivityId === sub.id && l.score > 0)
      );

      const catTotalWeight = catActiveSubs.reduce((sum, s) => sum + (s.weight || 10), 0) || 1;
      const catCompletedWeight = catCompleted.reduce((sum, s) => sum + (s.weight || 10), 0);
      const catPercentage = Math.round((catCompletedWeight / catTotalWeight) * 105); // cap at 100
      const finalPercentage = Math.min(catPercentage, 100);

      // Also get planned items under this category on this day
      const catPlans = pinnedOnThisDay.filter(p => {
        const sub = subActivities.find(s => s.id === p.subActivityId);
        return sub && sub.categoryId === cat.id;
      });

      return {
        category: cat,
        percentage: finalPercentage,
        completedCount: catCompleted.length,
        totalCount: catActiveSubs.length,
        plannedCount: catPlans.length,
      };
    }).filter(Boolean) as Array<{
      category: MacroCategory;
      percentage: number;
      completedCount: number;
      totalCount: number;
      plannedCount: number;
    }>;

    return {
      activeSubs,
      completedSubs,
      completionPercentage,
      categoryBreakdown,
      pinnedSubs,
      pinnedOnThisDay,
      isFuture
    };
  };

  // List of incomplete sub-activities for the current week of selected future date
  const incompleteWeeklyActivities = useMemo(() => {
    if (!selectedFutureDate) return [];

    const refDate = new Date(selectedFutureDate);
    // Find current week range of reference date
    const day = refDate.getDay();
    const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(refDate.setDate(diff));
    mon.setHours(0, 0, 0, 0);

    const weekStartStamp = mon.getTime();
    const weekEndStamp = weekStartStamp + 7 * 24 * 60 * 60 * 1000;

    // Filter relevant logs for this specific week
    const thisWeekLogs = logs.filter(l => {
      const logTime = new Date(l.date).getTime();
      return logTime >= weekStartStamp && logTime < weekEndStamp;
    });

    return subActivities.map(sub => {
      // How many times has it been logged in this week?
      const completionsThisWeek = thisWeekLogs.filter(l => l.subActivityId === sub.id && l.score > 0).length;
      
      // Calculate planned count for this specific week in future (or other days)
      const plannedDatesThisWeek = plannedActivities.filter(p => {
        const pTime = new Date(p.date).getTime();
        return p.subActivityId === sub.id && pTime >= weekStartStamp && pTime < weekEndStamp;
      });

      // Target remaining sessions
      const target = sub.weeklyTarget || 3;
      const remainingSessions = Math.max(0, target - completionsThisWeek);
      const yetToSchedule = Math.max(0, remainingSessions - plannedDatesThisWeek.length);

      const cat = categories.find(c => c.id === sub.categoryId);

      return {
        sub,
        category: cat,
        completionsThisWeek,
        plannedCountThisWeek: plannedDatesThisWeek.length,
        remainingSessions,
        yetToSchedule,
        isCompletedForWeek: completionsThisWeek >= target,
      };
    }).filter(item => {
      // Keep only those with remaining sessions or not completed
      const showCompleted = false; // By default we want remaining things to plan
      const matchesSearch = item.sub.name.toLowerCase().includes(modalSearchQuery.toLowerCase());
      const matchesCategory = modalCategoryFilter === 'all' || item.sub.categoryId === modalCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [selectedFutureDate, subActivities, logs, plannedActivities, categories, modalSearchQuery, modalCategoryFilter]);

  // Render headers
  const titleString = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();
    } else {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startLabel = startOfWeek.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      const endLabel = endOfWeek.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startLabel} - ${endLabel}`.toUpperCase();
    }
  }, [viewMode, currentDate, startOfWeek]);

  // Handle plan pin action
  const handlePinPlannedActivity = async (subId: string) => {
    if (!selectedFutureDate) return;
    await onAddPlan(subId, selectedFutureDate);
  };

  // Handle delete pin action
  const handleUnpinPlannedActivity = async (id: string) => {
    await onRemovePlan(id);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden p-6 space-y-6">
      
      {/* Upper bar & view switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5">
        <div>
          <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
              <CalendarIcon className="w-4 h-4" />
            </span>
            Calendario Avanzato & Pianificazione
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
            Visualizza la performance passata e pianifica le attività per le date future.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-150 dark:border-slate-700/60 w-fit">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Vista Mensile
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Vista Settimanale
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-slate-200 rounded-xl transition-colors border border-slate-200/50 dark:border-slate-800 active:scale-95"
              title="Chiudi calendario"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation and Date Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => handleNavigate('prev')}
          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <h3 className="text-xs font-black tracking-widest text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2">
          {titleString}
        </h3>

        <button
          onClick={() => handleNavigate('next')}
          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-all active:scale-95"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Header Weekdays */}
      <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
        {weekdays.map(day => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      {/* CALENDAR BODY */}
      {viewMode === 'month' ? (
        // --- MONTH VIEW ---
        <div className="grid grid-cols-7 gap-1.5 md:gap-3">
          {monthDays.map((day, idx) => {
            const dStr = day.toISOString().split('T')[0];
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = dStr === todayStr;
            const isDayPastOrToday = dStr <= todayStr;
            
            const { 
              activeSubs, 
              completedSubs, 
              completionPercentage, 
              categoryBreakdown,
              pinnedSubs,
              pinnedOnThisDay,
              isFuture
            } = getDayCalculations(day);

            let borderClasses = 'border-slate-100 dark:border-slate-800/60';
            if (isToday) {
              borderClasses = 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/10';
            }

            return (
              <div
                key={idx}
                onClick={() => {
                  if (isFuture) {
                    setSelectedFutureDate(dStr);
                  }
                }}
                className={`min-h-[90px] md:min-h-[110px] flex flex-col p-2 bg-slate-50/20 dark:bg-slate-950/5 border rounded-2xl transition-all cursor-pointer select-none group relative overflow-hidden ${
                  isCurrentMonth ? 'text-slate-700 dark:text-slate-350' : 'opacity-35 hover:opacity-50'
                } ${borderClasses} ${
                  isFuture 
                    ? 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-900/40' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                {/* Date indicator */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${
                    isToday 
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30' 
                      : 'text-slate-500 dark:text-slate-450'
                  }`}>
                    {day.getDate()}
                  </span>

                  {/* Completion Circle/Indicator for Past & Today */}
                  {isDayPastOrToday && activeSubs.length > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                      completionPercentage >= 80 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-400' 
                        : completionPercentage >= 55 
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-400' 
                        : 'bg-red-50 text-red-700 dark:bg-red-950/45 dark:text-red-400'
                    }`}>
                      {completionPercentage}%
                    </span>
                  )}
                </div>

                {/* Day content */}
                <div className="flex-1 flex flex-col justify-end space-y-1 mt-auto">
                  {isDayPastOrToday ? (
                    // --- PAST/PRES: Breakdown of Macroareas ---
                    categoryBreakdown.length > 0 ? (
                      <div className="space-y-1">
                        {/* Compact representation: Dots on Mobile, Small horizontal bars on Desktop */}
                        <div className="flex flex-wrap items-center gap-1 md:hidden">
                          {categoryBreakdown.map((item, bIdx) => (
                            <span 
                              key={bIdx}
                              className="w-2 h-2 rounded-full inline-block shrink-0"
                              style={{ 
                                backgroundColor: item.category.color,
                                opacity: item.percentage > 0 ? 1 : 0.25
                              }}
                              title={`${item.category.name}: ${item.percentage}%`}
                            />
                          ))}
                        </div>

                        <div className="hidden md:flex flex-col gap-1 max-h-[56px] overflow-y-auto no-scrollbar">
                          {categoryBreakdown.map((item, bIdx) => (
                            <div key={bIdx} className="space-y-0.5 text-[8px] font-bold">
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-450 truncate">
                                <span className="truncate flex items-center gap-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.category.color }}></span>
                                  {item.category.name}
                                </span>
                                <span>{item.percentage}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-200/50 dark:bg-slate-800/80 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{ 
                                    backgroundColor: item.category.color,
                                    width: `${item.percentage}%`
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400/60 dark:text-slate-500/50 block text-center pb-1">vuoto</span>
                    )
                  ) : (
                    // --- FUTURE: Scheduled vs Available categories ---
                    <div className="space-y-1.5">
                      {/* Pinned Activities detail */}
                      {pinnedSubs.length > 0 ? (
                        <div className="space-y-1">
                          {/* Colored category dots & labels */}
                          <div className="flex flex-wrap items-center gap-1 md:hidden">
                            {pinnedSubs.map((sub, pIdx) => {
                              const cat = categories.find(c => c.id === sub.categoryId);
                              return (
                                <span 
                                  key={pIdx}
                                  className="w-2 h-2 rounded-full inline-block h-2 shrink-0 animate-pulse border border-white dark:border-slate-900"
                                  style={{ backgroundColor: cat?.color || '#cbd5e1' }}
                                  title={`Pianificato: ${sub.name}`}
                                />
                              );
                            })}
                          </div>

                          <div className="hidden md:flex flex-col gap-1">
                            {pinnedSubs.map((sub, pIdx) => {
                              const cat = categories.find(c => c.id === sub.categoryId);
                              return (
                                <div 
                                  key={pIdx}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border text-left truncate"
                                  style={{ 
                                    backgroundColor: `${cat?.color}11` || '#f1f5f9',
                                    borderColor: `${cat?.color}33` || '#cbd5e1',
                                    color: cat?.color 
                                  }}
                                >
                                  <Clock className="w-2 h-2 shrink-0" />
                                  <span className="truncate">{sub.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        // Prompt to schedule
                        <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center py-1 transition-opacity">
                          <span className="flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-450 border border-blue-100 dark:border-blue-900/50 text-[8px] font-black uppercase tracking-widest rounded-md">
                            <Plus className="w-2 h-2" /> Fissa
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // --- WEEK VIEW (7 vertical cards) ---
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, idx) => {
            const dStr = day.toISOString().split('T')[0];
            const isToday = dStr === todayStr;
            const isDayPastOrToday = dStr <= todayStr;

            const { 
              activeSubs, 
              completedSubs, 
              completionPercentage, 
              categoryBreakdown,
              pinnedSubs,
              pinnedOnThisDay,
              isFuture
            } = getDayCalculations(day);

            let borderClasses = 'border-slate-150 dark:border-slate-800/80';
            if (isToday) {
              borderClasses = 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/10';
            }

            return (
              <div
                key={idx}
                onClick={() => {
                  if (isFuture) {
                    setSelectedFutureDate(dStr);
                  }
                }}
                className={`flex flex-col p-4 bg-slate-50/10 dark:bg-slate-950/10 border rounded-2xl transition-all cursor-pointer select-none group min-h-[220px] ${borderClasses} ${
                  isFuture 
                    ? 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-900/60' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-850/80'
                }`}
              >
                {/* Header of Column */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 mb-3">
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550 block leading-tight">
                      {day.toLocaleDateString('it-IT', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {day.getDate()}
                    </span>
                  </div>

                  {isToday && (
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-extrabold uppercase rounded-md tracking-wider">Oggi</span>
                  )}
                </div>

                {/* Body Column Content */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  {isDayPastOrToday ? (
                    <>
                      {/* Overall Percentage wheel/bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-450">
                          <span>Completato</span>
                          <span className={completionPercentage >= 80 ? 'text-emerald-500' : completionPercentage >= 55 ? 'text-amber-500' : 'text-red-500'}>
                            {completionPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              completionPercentage >= 80 
                                ? 'bg-emerald-505 bg-emerald-500' 
                                : completionPercentage >= 55 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Detailed list of Categories completed */}
                      <div className="space-y-2.5 max-h-[140px] overflow-y-auto no-scrollbar">
                        {categoryBreakdown.length > 0 ? (
                          categoryBreakdown.map((item, bIdx) => (
                            <div key={bIdx} className="space-y-1 col-span-1">
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                <span className="truncate flex items-center gap-1 font-semibold text-slate-650 dark:text-slate-350" style={{ color: item.category.color }}>
                                  <CategoryIcon name={item.category.icon} className="w-2.5 h-2.5" />
                                  {item.category.name}
                                </span>
                                <span>{item.percentage}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{ 
                                    backgroundColor: item.category.color,
                                    width: `${item.percentage}%`
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-[9px] uppercase font-bold text-slate-400/60 tracking-wider">Nessun log</div>
                        )}
                      </div>
                    </>
                  ) : (
                    // --- FUTURE WEEK DAY ---
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase text-slate-450 block tracking-wider">Pianificate:</span>
                        
                        {pinnedSubs.length > 0 ? (
                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto no-scrollbar">
                            {pinnedSubs.map((sub, pIdx) => {
                              const cat = categories.find(c => c.id === sub.categoryId);
                              return (
                                <div 
                                  key={pIdx}
                                  className="flex items-center gap-1.5 p-2 rounded-xl text-[10px] font-bold border text-left"
                                  style={{ 
                                    backgroundColor: `${cat?.color}11` || '#f1f5f9',
                                    borderColor: `${cat?.color}22` || '#cbd5e1',
                                    color: cat?.color || 'inherit'
                                  }}
                                >
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate font-black">{sub.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4 border border-dashed border-slate-150 dark:border-slate-800/80 rounded-xl">
                            <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 leading-normal block px-1">Nessuna attività</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                        <button className="w-full flex items-center justify-center gap-1 py-1.5 px-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 hover:dark:bg-blue-900/40 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-blue-100/50 dark:border-blue-900/40">
                          <Plus className="w-3 h-3" /> Fissa Attività
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- SCHEDULING PLAN MODAL FOR FUTURE DAYS --- */}
      <AnimatePresence>
        {selectedFutureDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-150 dark:border-slate-800 shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        Pianifica Attività
                      </h3>
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5 block">
                        {new Date(selectedFutureDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFutureDate(null);
                      setModalSearchQuery('');
                      setModalCategoryFilter('all');
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filters in modal */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-3 py-1.5 rounded-xl gap-2 focus-within:border-blue-500 transition-colors">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca attività settimanale..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="border-none text-xs text-slate-700 dark:text-white bg-transparent focus:outline-none w-full font-medium"
                  />
                  {modalSearchQuery && (
                    <button onClick={() => setModalSearchQuery('')} className="text-slate-400 hover:text-slate-650">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={modalCategoryFilter}
                  onChange={(e) => setModalCategoryFilter(e.target.value)}
                  className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Tutte le Macroaree</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Incomplete activities container */}
              <div className="p-6 max-h-[350px] overflow-y-auto space-y-4">
                
                {/* Visual Status card of scheduled things already on this actual date */}
                {(() => {
                  const dayPlans = plannedActivities.filter(p => p.date === selectedFutureDate);
                  if (dayPlans.length === 0) return null;

                  return (
                    <div className="bg-blue-50/35 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30 p-4 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Già Fissate in questa data ({dayPlans.length}):
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dayPlans.map((plan) => {
                          const sub = subActivities.find(s => s.id === plan.subActivityId);
                          const cat = sub ? categories.find(c => c.id === sub.categoryId) : null;
                          if (!sub) return null;

                          return (
                            <div 
                              key={plan.id}
                              className="flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-850"
                              style={{ borderColor: cat ? `${cat.color}25` : '#e2e8f0' }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {cat && (
                                  <div className="p-1 px-1.5 rounded-md text-[10px]" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{sub.name}</span>
                              </div>
                              <button
                                onClick={() => handleUnpinPlannedActivity(plan.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-2"
                                title="Rimuovi pianificazione"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450 mb-3 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    Abitudini Settimanali Rimanenti:
                  </h4>

                  {incompleteWeeklyActivities.length > 0 ? (
                    <div className="space-y-2.5">
                      {incompleteWeeklyActivities.map((item) => {
                        const isPinnedOnSelectedDate = plannedActivities.some(
                          p => p.subActivityId === item.sub.id && p.date === selectedFutureDate
                        );

                        return (
                          <div
                            key={item.sub.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border rounded-2xl bg-slate-50/20 dark:bg-slate-950/5 transition-all ${
                              isPinnedOnSelectedDate 
                                ? 'border-blue-200 dark:border-blue-900 bg-blue-50/5' 
                                : 'border-slate-100 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 mb-3 sm:mb-0">
                              {item.category && (
                                <div 
                                  className="p-2.5 rounded-xl border"
                                  style={{ 
                                    backgroundColor: `${item.category.color}11`,
                                    borderColor: `${item.category.color}22`,
                                    color: item.category.color 
                                  }}
                                >
                                  <CategoryIcon name={item.category.icon} className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-slate-800 dark:text-white truncate">
                                  {item.sub.name}
                                </h5>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[10px] font-semibold text-slate-450">
                                  <span className="flex items-center gap-0.5">
                                    Target: <strong className="text-slate-600 dark:text-slate-350">{item.sub.weeklyTarget || 3} v/sett</strong>
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700 font-normal">•</span>
                                  <span className="flex items-center gap-0.5">
                                    Svolte: <strong className={item.isCompletedForWeek ? "text-emerald-500" : "text-slate-600 dark:text-slate-350"}>{item.completionsThisWeek}</strong>
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700 font-normal">•</span>
                                  <span className="flex items-center gap-0.5 text-blue-500">
                                    Fissate: <strong>{item.plannedCountThisWeek}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 shrink-0">
                              {isPinnedOnSelectedDate ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-105 bg-blue-50 dark:bg-blue-955/30 border border-blue-220 border-blue-400 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider">
                                  <Check className="w-3.5 h-3.5" /> Fissata Qui
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePinPlannedActivity(item.sub.id)}
                                  className={`flex items-center gap-1.5 px-3.5 py-2 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl text-[10px] shadow-xs active:scale-95 transition-all ${
                                    item.yetToSchedule > 0 
                                      ? 'bg-blue-600 shadow-blue-500/10' 
                                      : 'bg-slate-400 dark:bg-slate-700 pointer-events-none opacity-50'
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  {item.yetToSchedule > 0 ? "Fissa Attività" : "In linea col target"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-slate-150 dark:border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                      <Inbox className="w-8 h-8 opacity-40 text-blue-500" />
                      <span className="text-xs font-bold leading-normal">
                        Nessuna abitudine rimasta da pianificare per questa settimana!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedFutureDate(null);
                    setModalSearchQuery('');
                    setModalCategoryFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
