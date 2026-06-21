import { useState, useMemo } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import { MacroCategory, SubActivity, ActivityLog } from '../types';
import { Calendar, Layers, Award, BarChart2, TrendingUp } from 'lucide-react';

const getYearMonthStr = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

function getYearWeekStr(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

interface StatsRadarProps {
  categories: MacroCategory[];
  subActivities: SubActivity[];
  logs: ActivityLog[];
}

export type TimeRange = 'day' | 'week' | 'month' | 'year';

export function StatsRadar({ categories, subActivities, logs }: StatsRadarProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const getHistoricalSubWeight = (sub: SubActivity, subLogsInPeriod: ActivityLog[]) => {
    if (subLogsInPeriod.length > 0) {
      const sorted = [...subLogsInPeriod].sort((a,b) => b.timestamp - a.timestamp);
      const logWithSnap = sorted.find(l => l.weightSnap !== undefined);
      if (logWithSnap && logWithSnap.weightSnap !== undefined) {
        return logWithSnap.weightSnap;
      }
    }
    return sub.weight || 0;
  };

  const getHistoricalSubTarget = (sub: SubActivity, subLogsInPeriod: ActivityLog[]) => {
    if (subLogsInPeriod.length > 0) {
      const sorted = [...subLogsInPeriod].sort((a,b) => b.timestamp - a.timestamp);
      const logWithSnap = sorted.find(l => l.weeklyTargetSnap !== undefined);
      if (logWithSnap && logWithSnap.weeklyTargetSnap !== undefined) {
        return logWithSnap.weeklyTargetSnap;
      }
    }
    return sub.weeklyTarget || 3;
  };

  // Calcola il successo per ciascuna categoria in base al range temporale selezionato
  const chartData = useMemo(() => {
    const now = new Date();
    
    // Calcola i limiti temporali
    let startDate = new Date();
    if (timeRange === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeRange === 'week') {
      // Inizio della settimana corrente (Lunedì)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'month') {
      // Ultimi 28 giorni (4 settimane)
      startDate.setDate(now.getDate() - 28);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Annuale (Inizio dell'anno o ultimi 365 giorni. Usiamo inizio anno corrente)
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    }

    const startTimestamp = startDate.getTime();

    return categories.map(cat => {
      // Filtra le sotto-attività corrette per il periodo
      const catSubs = subActivities.filter(sub => {
        if (sub.categoryId !== cat.id) return false;
        if (timeRange === 'day') {
          // Ricorrenti o Temporanee valide oggi
          if (!sub.type || sub.type === 'recurring') return true;
          const today = new Date();
          if (sub.validityType === 'week') {
            const weekCode = getYearWeekStr(today);
            return sub.validityPeriod === weekCode;
          }
          if (sub.validityType === 'month') {
            const monthCode = getYearMonthStr(today);
            return sub.validityPeriod === monthCode;
          }
          return false;
        } else {
          // Solo ricorrenti per gli altri range (comportamento standard)
          return !sub.type || sub.type === 'recurring';
        }
      });
      
      if (catSubs.length === 0) {
        return {
          id: cat.id,
          subject: cat.name,
          value: 0,
          rawScore: 0,
          color: cat.color,
          subCount: 0
        };
      }

      const todayStr = now.toISOString().split('T')[0];

      if (timeRange === 'day') {
        const subWeights = catSubs.map(sub => {
          const subLogs = logs.filter(log => log.subActivityId === sub.id && log.date === todayStr);
          return {
            sub,
            logsInPeriod: subLogs,
            weight: sub.weight || 0
          };
        });

        const totalWeight = subWeights.reduce((sum, item) => sum + item.weight, 0) || 1;

        let weightedSuccessSum = 0;
        let totalWeightedScores = 0;

        subWeights.forEach(({ sub, logsInPeriod, weight }) => {
          const hasLog = logsInPeriod.length > 0;
          const score = hasLog ? (logsInPeriod[0].score || 0) : 0;
          
          weightedSuccessSum += (weight / totalWeight) * (hasLog ? 100 : 0);
          totalWeightedScores += (weight / totalWeight) * score;
        });

        return {
          id: cat.id,
          subject: cat.name,
          value: Math.round(weightedSuccessSum),
          rawScore: Math.round(totalWeightedScores * 10) / 10,
          color: cat.color,
          subCount: catSubs.length
        };
      }

      const subWeights = catSubs.map(sub => {
        const subLogs = logs.filter(log => log.subActivityId === sub.id && new Date(log.date).getTime() >= startTimestamp);
        return {
          sub,
          logsInPeriod: subLogs,
          weight: getHistoricalSubWeight(sub, subLogs)
        };
      });

      const totalWeight = subWeights.reduce((sum, item) => sum + item.weight, 0) || 1;

      // Somma pesata del successo di ciascuna sotto-attività
      let weightedSuccessSum = 0;
      let totalWeightedScores = 0;

      subWeights.forEach(({ sub, logsInPeriod, weight }) => {
        const targetWeekly = getHistoricalSubTarget(sub, logsInPeriod);

        // Target di frequenza scalato in base al range temporale
        let targetFrequency = targetWeekly;
        if (timeRange === 'month') {
          targetFrequency = targetWeekly * 4; // 4 settimane
        } else if (timeRange === 'year') {
          // Calcola quante settimane sono trascorse dall'inizio dell'anno fino ad oggi
          const diffTime = Math.abs(new Date().getTime() - startTimestamp);
          const diffWeeks = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
          targetFrequency = targetWeekly * diffWeeks;
        }

        // Numero di log unici (giorni diversi in cui è stata valutata)
        const loggedDaysCount = logsInPeriod.length;

        // Rapporto completamento della frequenza (0 a 1)
        const completionRate = Math.min(loggedDaysCount / (targetFrequency || 1), 1);

        // Media dei punteggi (voti da 1 a 10)
        let averageScore = 0;
        if (loggedDaysCount > 0) {
          const sumScores = logsInPeriod.reduce((sum, l) => sum + (l.score || 0), 0);
          averageScore = sumScores / loggedDaysCount; // 1 a 10
        }

        // Il successo è il prodotto di completamento e punteggio normalizzato
        const successRate = completionRate * (averageScore / 10); // scala 0 a 1

        weightedSuccessSum += (weight / totalWeight) * successRate * 100;
        totalWeightedScores += (weight / totalWeight) * averageScore;
      });

      return {
        id: cat.id,
        subject: cat.name,
        value: Math.round(weightedSuccessSum),
        rawScore: Math.round(totalWeightedScores * 10) / 10,
        color: cat.color,
        subCount: catSubs.length
      };
    });
  }, [categories, subActivities, logs, timeRange]);

  // Calcolo delle statistiche globali
  const globalStats = useMemo(() => {
    if (chartData.length === 0) return { avgSuccess: 0, bestCategory: '-' };
    const validData = chartData.filter(d => d.subCount > 0);
    if (validData.length === 0) return { avgSuccess: 0, bestCategory: '-' };
    const avgSuccess = Math.round(validData.reduce((sum, d) => sum + d.value, 0) / validData.length);
    const sorted = [...validData].sort((a, b) => b.value - a.value);
    return {
      avgSuccess,
      bestCategory: sorted[0]?.subject || '-'
    };
  }, [chartData]);

  const temporaryGoals = useMemo(() => {
    if (timeRange === 'week') return [];

    const now = new Date();
    const currentWeekCode = getYearWeekStr(now);
    const currentMonthCode = getYearMonthStr(now);

    const temps = subActivities.filter(sub => sub.type === 'temporary');

    return temps.map(sub => {
      let startDate = new Date();
      let validityLabel = '';
      let isCurrentPeriod = false;

      if (sub.validityType === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        validityLabel = `Settimana ${sub.validityPeriod || ''}`;
        isCurrentPeriod = (sub.validityPeriod === currentWeekCode);
      } else {
        if (sub.validityPeriod) {
          const [year, month] = sub.validityPeriod.split('-');
          startDate = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
          
          const mName = startDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
          validityLabel = mName.charAt(0).toUpperCase() + mName.slice(1);
          isCurrentPeriod = (sub.validityPeriod === currentMonthCode);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          validityLabel = 'Mese Corrente';
          isCurrentPeriod = true;
        }
      }

      const startTimestamp = startDate.getTime();
      let endTimestamp = Date.now();
      if (sub.validityType === 'week') {
        endTimestamp = startTimestamp + (7 * 24 * 60 * 60 * 1000);
      } else {
        const endMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1, 0, 0, 0, 0);
        endTimestamp = endMonth.getTime();
      }

      const subLogs = logs.filter(log => {
        const logTime = new Date(log.date).getTime();
        return log.subActivityId === sub.id && logTime >= startTimestamp && logTime < endTimestamp;
      });

      const targetWeekly = getHistoricalSubTarget(sub, subLogs);
      let targetFrequency = targetWeekly;
      if (sub.validityType === 'month') {
        targetFrequency = targetWeekly * 4;
      }

      const loggedDaysCount = subLogs.length;
      const completionRate = Math.min(loggedDaysCount / (targetFrequency || 1), 1);

      let averageScore = 0;
      if (loggedDaysCount > 0) {
        const sumScores = subLogs.reduce((sum, l) => sum + (l.score || 0), 0);
        averageScore = sumScores / loggedDaysCount;
      }

      const successRate = completionRate * (averageScore / 10);
      const percentage = Math.round(successRate * 100);

      const parentCat = categories.find(c => c.id === sub.categoryId);

      return {
        id: sub.id,
        name: sub.name,
        categoryName: parentCat?.name || 'Senza Categoria',
        categoryColor: parentCat?.color || '#94a3b8',
        percentage,
        completionText: `${loggedDaysCount}/${targetFrequency} gg`,
        averageScore: Math.round(averageScore * 10) / 10,
        validityLabel,
        isCurrentPeriod
      };
    }).filter(item => {
      if (timeRange === 'month') {
        return item.isCurrentPeriod;
      }
      return true;
    });
  }, [subActivities, logs, categories, timeRange]);

  // Formatta l'etichetta del selettore temporale
  const timeLabel = {
    day: 'Oggi (Ultime 24 Ore)',
    week: 'Questa Settimana',
    month: 'Ultimi 28 Giorni (Mese)',
    year: 'Anno Corrente'
  }[timeRange];

  const hasEnoughPointsForRadar = chartData.length >= 3;

  return (
    <div id="stats-section" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Analisi delle Prestazioni
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Successo pesato in base a frequenza e voti delle sotto-attività.
          </p>
        </div>

        {/* Selettore Temporale */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-150 dark:border-slate-700/60 w-fit flex-wrap gap-1">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              timeRange === 'day'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Giornaliero
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              timeRange === 'week'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Settimanale
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              timeRange === 'month'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Mensile
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              timeRange === 'year'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Annuale
          </button>
        </div>
      </div>

      {/* Grid delle statistiche immediate */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <div className="p-5 bg-slate-50/70 dark:bg-slate-950/20 rounded-2xl border border-slate-150/85 dark:border-slate-800/40">
          <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 block mb-1 uppercase tracking-widest">
            Successo Medio
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">
              {globalStats.avgSuccess}%
            </span>
            <TrendingUp className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-2 font-medium">
            {timeLabel}
          </span>
        </div>

        <div className="p-5 bg-slate-50/70 dark:bg-slate-950/20 rounded-2xl border border-slate-150/85 dark:border-slate-800/40">
          <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 block mb-1 uppercase tracking-widest">
            Top Categoria
          </span>
          <span className="text-base font-black text-slate-800 dark:text-white truncate block mt-1.5 leading-none">
            {globalStats.bestCategory}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-3 font-medium">
            Miglior punteggio ponderato
          </span>
        </div>

        <div className="p-5 bg-slate-50/70 dark:bg-slate-950/20 rounded-2xl border border-slate-150/85 dark:border-slate-800/40 col-span-2 md:col-span-1">
          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 block mb-1 uppercase tracking-widest">
            Categorie Tracciate
          </span>
          <span className="text-3xl font-black text-slate-800 dark:text-white block mt-1 leading-none">
            {categories.length}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-2 font-medium">
            {subActivities.length} Sotto-attività attive
          </span>
        </div>
      </div>

      {/* Area dei Grafici */}
      <div id="chart-container" className="h-[300px] w-full flex items-center justify-center">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <Layers className="w-12 h-12 mx-auto stroke-1 mb-3" />
            <p className="text-sm">Non ci sono categorie da plottare.</p>
            <p className="text-xs mt-1">Crea delle macro-categorie ed inserisci sotto-attività per vedere i dati.</p>
          </div>
        ) : hasEnoughPointsForRadar ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#cbd5e1" className="opacity-40" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              />
              <Radar
                name="Successo"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="#2563eb"
                fillOpacity={0.15}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <p className="font-extrabold text-slate-800 dark:text-white mb-1.5 uppercase tracking-wide">{data.subject}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-blue-600 dark:text-blue-400 font-bold">
                          <span>Successo Globale:</span>
                          <span className="font-black text-sm">{data.value}%</span>
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 space-y-1 font-semibold">
                          <p>VOTO MEDIO DI PERIODO: {data.rawScore}/10</p>
                          <p>{data.subCount.toUpperCase()} SOTTO-ATTIVITÀ ATTIVE</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          /* Fallback per 1 o 2 categorie: Grafico a Barre */
          <div className="w-full h-full flex flex-col justify-center">
            <div className="text-center mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-semibold border border-amber-100 dark:border-amber-900/30">
                <BarChart2 className="w-3.5 h-3.5" />
                Sono necessarie almeno 3 categorie per il Radar Chart. Uso grafico a barre.
              </span>
            </div>
            
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="subject" 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 text-xs">
                          <p className="font-semibold text-gray-900 dark:text-white mb-1">{data.subject}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-blue-600 dark:text-blue-400 font-medium">
                            <span>Grado di Successo:</span>
                            <span className="font-bold">{data.value}%</span>
                          </div>
                          <div className="text-gray-400 dark:text-gray-500 text-[10px] mt-1 space-y-0.5">
                            <p>Voto medio del periodo: {data.rawScore}/10</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sezione Separata: Obiettivi Singoli Raggiunti (solo Mensile/Annuale) */}
      {timeRange !== 'week' && (
        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
          <h3 className="text-xs font-black tracking-widest text-slate-800 dark:text-white uppercase flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Obiettivi Singoli Raggiunti
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-6 font-semibold leading-normal">
            Percentuale di completamento isolata delle attività temporanee a scadenza, separate dalle abitudini ricorrenti continue che formano la media globale.
          </p>

          {temporaryGoals.length === 0 ? (
            <div className="p-8 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 text-center text-slate-400 dark:text-slate-500 text-xs font-bold">
              Non sono pianificati obiettivi temporanei per questo intervallo temporale.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {temporaryGoals.map(goal => (
                <div 
                  key={goal.id} 
                  className="p-5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-205/60 dark:border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 group"
                >
                  <div>
                    {/* Badge e Periodo */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span 
                        className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white"
                        style={{ backgroundColor: goal.categoryColor }}
                      >
                        {goal.categoryName}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-405 dark:text-slate-500">
                        {goal.validityLabel}
                      </span>
                    </div>

                    {/* Titolo Sotto-Attività */}
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {goal.name}
                    </h4>
                  </div>

                  {/* Avanzamento / Info */}
                  <div className="mt-5 space-y-2.5">
                    <div className="flex items-end justify-between text-[10px] font-bold text-slate-450 dark:text-slate-450">
                      <span>
                        Frequenza: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{goal.completionText}</strong> (Media: {goal.averageScore}/10)
                      </span>
                      <span className="font-black text-xs text-blue-600 dark:text-blue-400">
                        {goal.percentage}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${goal.percentage}%`,
                          backgroundColor: goal.percentage >= 80 ? '#10b981' : goal.percentage >= 50 ? '#3b82f6' : '#ef4444'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
