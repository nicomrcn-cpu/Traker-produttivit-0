import { useState, useEffect } from 'react';
import { SubActivity, ActivityLog } from '../types';
import { Bell, BellOff, Play, Info, CheckCircle2 } from 'lucide-react';

interface PushSimulatorProps {
  subActivities: SubActivity[];
  logs: ActivityLog[];
}

export function PushSimulator({ subActivities, logs }: PushSimulatorProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSwRegistered, setIsSwRegistered] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'info' | 'warning', text: string } | null>(null);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
