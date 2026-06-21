import { useState, useEffect, useRef } from 'react';
import { SubActivity, ActivityLog } from '../types';
import { Bell, BellOff, Play, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PushSimulatorProps {
  subActivities: SubActivity[];
  logs: ActivityLog[];
}

export function PushSimulator({ subActivities, logs }: PushSimulatorProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSwRegistered, setIsSwRegistered] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'info' | 'warning', text: string } | null>(null);
  
  const notifiedPredictive = useRef<Record<string, boolean>>({});

  const simulatePredictiveCheck = (isAuto = false) => {
    if (!isAuto) {
      setTestResult(null);
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Giorno di oggi (1 = Lunedì ... 7 = Domenica)
    let currentDayOfWeek = now.getDay();
    if (currentDayOfWeek === 0) currentDayOfWeek = 7;

    // Giorni totali nel mese corrente
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    const riskSubNames: string[] = [];
    const riskSubs: { sub: SubActivity; period: string; missing: number }[] = [];

    subActivities.forEach(sub => {
      let P = 0;
      let T = sub.weeklyTarget || 3;
      let C = 0;
      let periodLabel = 'settimana';

      const hasLoggedToday = logs.some(log => log.subActivityId === sub.id && log.date === todayStr);

      if (sub.type === 'temporary' && sub.validityType === 'month') {
        periodLabel = 'mese';
        T = T * 4; // Frequenza mensile target

        let startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
        if (sub.validityPeriod) {
          const [vYear, vMonth] = sub.validityPeriod.split('-');
          startOfMonth = new Date(Number(vYear), Number(vMonth) - 1, 1, 0, 0, 0, 0);
        }
        const startOfMonthTimestamp = startOfMonth.getTime();
        const endOfMonthTimestamp = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1, 0, 0, 0, 0).getTime();

        const subLogs = logs.filter(l => {
          const logTime = new Date(l.date).getTime();
          return l.subActivityId === sub.id && logTime >= startOfMonthTimestamp && logTime < endOfMonthTimestamp;
        });

        P = subLogs.length;
        C = totalDaysInMonth - todayDate + (hasLoggedToday ? 0 : 1);
      } else {
        // Settimanale (ricorrente o temporaneo su settimana)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekTimestamp = startOfWeek.getTime();

        const subLogs = logs.filter(l => new Date(l.date).getTime() >= startOfWeekTimestamp && l.subActivityId === sub.id);
        P = subLogs.length;
        C = 7 - currentDayOfWeek + (hasLoggedToday ? 0 : 1);
      }

      // Formula: (P + C) / T < 0.70
      if ((P + C) / T < 0.70) {
        const target70 = Math.ceil(0.70 * T);
        const missingFor70 = Math.max(0, target70 - P);
        
        riskSubNames.push(`"${sub.name}"`);
        riskSubs.push({ sub, period: periodLabel, missing: missingFor70 });
      }
    });

    if (riskSubs.length > 0) {
      // Se è un controllo automatico, filtriamo solo le sotto-attività non ancora notificate in questa sessione
      const unnotifiedRisks = isAuto 
        ? riskSubs.filter(r => !notifiedPredictive.current[r.sub.id])
        : riskSubs;

      if (unnotifiedRisks.length > 0) {
        // Segnala le sottoattività non ancora notificate
        const listNames = unnotifiedRisks.map(r => `"${r.sub.name}"`).join(', ');
        const missingSum = unnotifiedRisks.reduce((sum, r) => sum + r.missing, 0);
        
        const title = 'Rendi speciale la giornata! 🌱';
        const body = `Attenzione! Per raggiungere il tuo obiettivo del 70% su ${listNames}, dobbiamo accelerare. Mancano ancora ${missingSum} esecuzioni complessive. Ce la fai a inserirne un paio oggi? ✨`;

        if (isAuto) {
          // Segna come notificate in questa sessione per evitare spam continuo
          unnotifiedRisks.forEach(r => {
            notifiedPredictive.current[r.sub.id] = true;
          });
        }

        sendLocalNotification(title, body);

        if (!isAuto) {
          setTestResult({
            type: 'warning',
            text: `Rilevato Rischio Matematico (Logica 70%): \n\n⚠️ ${body}`
          });
        }
      } else {
        // Già tutte notificate per l'auto check, non mostrare alcun pop up aggiuntivo
        if (!isAuto) {
          setTestResult({
            type: 'info',
            text: `Controllo Predittivo completato: Rilevato rischio matematico sotto l'obiettivo del 70% per: ${riskSubNames.join(', ')}. Notifica già inviata in precedenza.`
          });
        }
      }
    } else {
      if (!isAuto) {
        setTestResult({
          type: 'success',
          text: `Controllo Predittivo (Logica 70%): Complimenti viva della tua determinazione! Tutti i tuoi obiettivi correnti sono matematicamente idonei per raggiungere o superare il 70% della performance stabilita! ✨`
        });
      }
    }
  };

  useEffect(() => {
    // Esegui controllo predittivo automatico dopo 2 secondi all'avvio o modifica dei dati
    const timer = setTimeout(() => {
      simulatePredictiveCheck(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [subActivities, logs]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsSwRegistered(true);
      });
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setTestResult({ type: 'warning', text: 'Le notifiche push non sono supportate da questo browser.' });
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        sendLocalNotification(
          'Notifiche Attive! 🌟',
          'Ottimo! Da adesso riceverai fantastici reminder motivazionali per supportare le tue abitudini.'
        );
      }
    } catch (err) {
      console.error('Errore richiesta permessi notifica:', err);
    }
  };

  const sendLocalNotification = (title: string, body: string) => {
    try {
      if (permission === 'granted') {
        if ('serviceWorker' in navigator && isSwRegistered) {
          navigator.serviceWorker.ready.then((registration) => {
            const notificationOptions: any = {
              body,
              icon: '/metadata.json', // Utilizza file come icona per compatibilità
              badge: '/metadata.json',
              vibrate: [100, 50, 100],
              tag: 'motivational-reminder',
              renotify: true
            };
            registration.showNotification(title, notificationOptions);
          });
        } else {
          new Notification(title, { body });
        }
      } else {
        // Fallback in-app banner se i permessi sono disabilitati o in attesa
        setTestResult({ 
          type: 'info', 
          text: `[NOTIFICA FORMATO IN-APP]\n\n🔔 ${title}\n📝 ${body}` 
        });
      }
    } catch (err) {
      console.error('Attivazione notifica fallita, uso fallback in-app:', err);
      setTestResult({ 
        type: 'info', 
        text: `[NOTIFICA FORMATO IN-APP]\n\n🔔 ${title}\n📝 ${body}` 
      });
    }
  };

  // 1. Simula Controllo Fine Settimana: Utente matematicamente indietro con gli obiettivi settimanali
  const simulateWeekendCheck = () => {
    setTestResult(null);

    // Calcolo del giorno della settimana corrente (1 = Lunedì ... 7 = Domenica)
    const now = new Date();
    let currentDayOfWeek = now.getDay();
    if (currentDayOfWeek === 0) currentDayOfWeek = 7; // Converti Domenica da 0 a 7

    const remainingDays = 7 - currentDayOfWeek;

    // Troviamo l'inizio della settimana corrente (Lunedì)
    const monday = new Date();
    const diff = now.getDate() - currentDayOfWeek + 1;
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const startOfWeekTimestamp = monday.getTime();

    // Trova se c'è almeno una sottoattività indietro matematicamente
    let mathematicallyBehindSub: SubActivity | null = null;
    let loggedCountForBehindSub = 0;

    for (const sub of subActivities) {
      // Conta i log di questa settimana
      const subLogsCount = logs.filter(
        log => log.subActivityId === sub.id && new Date(log.date).getTime() >= startOfWeekTimestamp
      ).length;

      // Matematicamente impossibile raggiungere l'obiettivo:
      // se log attuali + giorni rimasti < obiettivo settimanale
      if (subLogsCount + remainingDays < sub.weeklyTarget) {
        mathematicallyBehindSub = sub;
        loggedCountForBehindSub = subLogsCount;
        break; 
      }
    }

    if (mathematicallyBehindSub) {
      const title = 'Forza e Costanza! 💪';
      const body = `Abbiamo notato che sei un po' indietro con "${mathematicallyBehindSub.name}" (${loggedCountForBehindSub} su obiettivo di ${mathematicallyBehindSub.weeklyTarget} giorni). Fai un piccolo passo oggi, te lo meriti! ✨`;
      
      sendLocalNotification(title, body);
      setTestResult({
        type: 'warning',
        text: `Simulazione Fine Settimana completata: Rilevato ritardo matematico su "${mathematicallyBehindSub.name}". Notifica inviata!`
      });
    } else {
      const title = 'A gonfie vele! 🚀';
      const body = 'Sei perfettamente in linea con le tue sotto-attività per questa settimana. Continua con questo fantastico ritmo!';
      
      sendLocalNotification(title, body);
      setTestResult({
        type: 'success',
        text: 'Simulazione Fine Settimana completata: Nessun ritardo matematico rilevato. Notifica motivazionale di successo inviata!'
      });
    }
  };

  // 2. Simula Reminder 23:00 per attività tracciate giornalmente non compilate oggi
  const simulateDailyValuationCheck = () => {
    setTestResult(null);

    const todayStr = new Date().toISOString().split('T')[0];

    // Trova le sottoattività con tracciamento giornaliero
    const dailySubs = subActivities.filter(sub => sub.dailyValuation);

    if (dailySubs.length === 0) {
      setTestResult({
        type: 'info',
        text: 'Non hai ancora contrassegnato nessuna sotto-attività come "Tracciamento Giornaliero". Vai in una sotto-attività, modificala attivando lo switch, poi ripeti il test.'
      });
      return;
    }

    // Controlla se qualcuna non è stata valutata oggi
    let unloggedDailySub: SubActivity | null = null;

    for (const sub of dailySubs) {
      const hasLogToday = logs.some(log => log.subActivityId === sub.id && log.date === todayStr);
      if (!hasLogToday) {
        unloggedDailySub = sub;
        break;
      }
    }

    if (unloggedDailySub) {
      const title = 'Momento Consapevolezza 🌿';
      const body = `Mancano pochi minuti alla fine della giornata. Dedica un piccolo istante a te stesso per valutare "${unloggedDailySub.name}". Bastano pochi secondi! ✨`;
      
      sendLocalNotification(title, body);
      setTestResult({
        type: 'warning',
        text: `Simulazione Ore 23:00 completata: Rilevato ritardo quotidiano su "${unloggedDailySub.name}". Notifica inviata!`
      });
    } else {
      const title = 'Giornata Completata! 🎉';
      const body = 'Straordinario! Hai compilato tutte le valutazioni quotidiane prefissate oggi. Riposati e ricaricati per domani.';
      
      sendLocalNotification(title, body);
      setTestResult({
        type: 'success',
        text: 'Simulazione Ore 23:00 completata: Ottimo! Tutte le attività quotidiane sono state registrate per oggi. Notifica di congratulazioni inviata!'
      });
    }
  };

  return (
    <div id="push-simulator-card" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm transition-colors duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-swing" />
            Centro Notifiche Motivazionali
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Ricevi reminders incentrati sulla gentilezza e sull'incoraggiamento personale.
          </p>
        </div>
        
        {/* Badge Stato Permessi */}
        {permission === 'granted' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Attive
          </span>
        ) : (
          <button 
            onClick={requestPermission}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full transition-colors"
          >
            <BellOff className="w-3 h-3" />
            Richiedi Accesso
          </button>
        )}
      </div>

      {permissionsNotice(permission)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 font-sans">
        {/* Trigger 1 */}
        <button
          onClick={simulateWeekendCheck}
          className="flex flex-col items-start p-4 hover:bg-gray-50 hover:dark:bg-gray-800 border border-gray-100 dark:border-gray-850 rounded-xl transition-all text-left group"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-450 rounded-lg group-hover:scale-105 transition-transform">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Simula Fine Settimana
            </span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
            Calcola se sei matematicamente impossibilitato a completare l'obiettivo di frequenza settimanale. Se sì, invia un invito amichevole e motivazionale.
          </p>
        </button>

        {/* Trigger 2 */}
        <button
          onClick={simulateDailyValuationCheck}
          className="flex flex-col items-start p-4 hover:bg-gray-50 hover:dark:bg-gray-800 border border-gray-100 dark:border-gray-850 rounded-xl transition-all text-left group"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-450 rounded-lg group-hover:scale-105 transition-transform">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Simula Ore 23:00 (Daily)
            </span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
            Verifica la presenza di sotto-attività "Tracciate Giornalmente" prive di valutazione odierna e ti notifica un invito rassicurante a dedicarti un istante.
          </p>
        </button>

        {/* Trigger 3 */}
        <button
          onClick={() => simulatePredictiveCheck(false)}
          className="flex flex-col items-start p-4 hover:bg-gray-50 hover:dark:bg-gray-800 border border-gray-100 dark:border-gray-850 rounded-xl transition-all text-left group animate-fade-in"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-105 transition-transform">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
              Simula Alert 70%
              <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-350 text-[9px] font-black rounded uppercase scale-90">Alg</span>
            </span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
            Applica l'algoritmo predittivo (P + C)/T &lt; 0.70 per verificare se è impossibile raggiungere il 70% degli obiettivi ed invia incentivi mirati ad accelerare.
          </p>
        </button>
      </div>

      {/* Box Simulazione Output */}
      {testResult && (
        <div className={`mt-6 p-4 rounded-xl text-xs flex gap-3 border ${
          testResult.type === 'success' 
            ? 'bg-emerald-50/60 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300' 
            : testResult.type === 'warning'
            ? 'bg-amber-50/60 dark:bg-amber-950/15 border-amber-100 dark:border-amber-900/20 text-amber-800 dark:text-amber-300'
            : 'bg-blue-50/60 dark:bg-blue-950/15 border-blue-105 dark:border-blue-900/20 text-blue-800 dark:text-blue-300'
        }`}>
          <div className="p-1 rounded bg-white dark:bg-gray-850 shadow-sm shrink-0 h-fit">
            <Bell className="w-4 h-4 text-blue-500" />
          </div>
          <div className="whitespace-pre-line leading-relaxed">
            {testResult.text}
          </div>
        </div>
      )}
    </div>
  );
}

function permissionsNotice(permission: NotificationPermission) {
  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-xl text-[10px] text-rose-700 dark:text-rose-450 leading-normal mt-3">
        <Info className="w-4 h-4 shrink-0" />
        <p>Le notifiche sono bloccate nel browser. Ti invitiamo ad abilitarle manualmente nelle impostazioni del sito per sperimentare l'esperienza offline nativa, in alternativa useremo banner in-app.</p>
      </div>
    );
  }
  if (permission === 'default') {
    return (
      <div className="flex items-start gap-2 p-3.5 bg-blue-50/70 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-xl text-[10px] text-blue-700 dark:text-blue-450 leading-normal mt-3">
        <Info className="w-4 h-4 shrink-0 font-bold" />
        <p>Le notifiche locali consentono di ricevere i reminder automatici alle 23:00 e sul completamento obiettivi settimanali. Clicca su <strong>Richiedi Accesso</strong> per attivarle.</p>
      </div>
    );
  }
  return null;
}
