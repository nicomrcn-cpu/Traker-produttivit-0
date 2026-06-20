import React, { useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Auth } from './components/Auth';
import { StatsRadar } from './components/StatsRadar';
import { CategoryCard } from './components/CategoryCard';
import { CategoryModal } from './components/CategoryModal';
import { SubActivityModal } from './components/SubActivityModal';
import { PushSimulator } from './components/PushSimulator';
import { MacroCategory, SubActivity, ActivityLog, DEFAULT_CATEGORIES } from './types';
import { 
  Sun, 
  Moon, 
  LogOut, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Target, 
  ListTodo,
  Info
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Database lists
  const [categories, setCategories] = useState<MacroCategory[]>([]);
  const [subActivities, setSubActivities] = useState<SubActivity[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected date for day logs
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modal open states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MacroCategory | null>(null);

  const [subActivityModalOpen, setSubActivityModalOpen] = useState(false);
  const [editingSubActivity, setEditingSubActivity] = useState<SubActivity | null>(null);
  const [selectedCategoryIdForNewSub, setSelectedCategoryIdForNewSub] = useState<string>('');

  // Flag to prevent duplicate population
  const populationTriggered = useRef(false);

  // Apply dark mode theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setAuthChecking(false);
      if (!usr) {
        setCategories([]);
        setSubActivities([]);
        setLogs([]);
        setLoadingData(true);
        populationTriggered.current = false;
      }
    });
    return unsubscribe;
  }, []);

  // Listen to Firestore (offline-first snapshots)
  useEffect(() => {
    if (!user) return;

    setLoadingData(true);

    // Categories query
    const qCategories = query(
      collection(db, 'categories'),
      where('userId', '==', user.uid)
    );

    const unsubscribeCat = onSnapshot(qCategories, (snapshot) => {
      const catList: MacroCategory[] = [];
      snapshot.forEach(doc => {
        catList.push({ id: doc.id, ...doc.data() } as MacroCategory);
      });
      // Ordina per data creazione
      catList.sort((a,b) => a.createdAt - b.createdAt);
      setCategories(catList);

      // Popola se non ci sono categorie (Primo Login)
      if (catList.length === 0 && !populationTriggered.current) {
        populationTriggered.current = true;
        populateDefaultCategories(user.uid);
      }
      setLoadingData(false);
    }, (error) => {
      console.error("Errore snapshot categorie:", error);
      setLoadingData(false);
    });

    // Subactivities query
    const qSub = query(
      collection(db, 'subActivities'),
      where('userId', '==', user.uid)
    );
    const unsubscribeSub = onSnapshot(qSub, (snapshot) => {
      const subList: SubActivity[] = [];
      snapshot.forEach(doc => {
        subList.push({ id: doc.id, ...doc.data() } as SubActivity);
      });
      subList.sort((a,b) => a.createdAt - b.createdAt);
      setSubActivities(subList);
    }, (error) => console.error("Errore snapshot sotto-attività:", error));

    // Logs query (Ottiene tutti i log per permettere i calcoli storici e radar)
    const qLogs = query(
      collection(db, 'logs'),
      where('userId', '==', user.uid)
    );
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logList: ActivityLog[] = [];
      snapshot.forEach(doc => {
        logList.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setLogs(logList);
    }, (error) => console.error("Errore snapshot log:", error));

    return () => {
      unsubscribeCat();
      unsubscribeSub();
      unsubscribeLogs();
    };
  }, [user]);

  // Popola 7 Macro categorie di default al primo login
  const populateDefaultCategories = async (userId: string) => {
    try {
      const batch = writeBatch(db);
      DEFAULT_CATEGORIES.forEach((cat) => {
        const docRef = doc(collection(db, 'categories'));
        batch.set(docRef, {
          ...cat,
          userId,
          createdAt: Date.now()
        });
      });
      await batch.commit();
      console.log('Macro-Categorie di default create con successo.');
    } catch (err) {
      console.error('Errore creazione macro-categorie di default:', err);
    }
  };

  // Cambio Data Navigazione
  const handleDateChange = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const getFriendlyDateStr = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesStr = new Date();
    yesStr.setDate(yesStr.getDate() - 1);
    const yesterdayStr = yesStr.toISOString().split('T')[0];

    if (selectedDate === todayStr) {
      return 'Oggi, ' + new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
    } else if (selectedDate === yesterdayStr) {
      return 'Ieri, ' + new Date(selectedDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
    } else {
      return new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    }
  };

  // CRUD categorie
  const handleSaveCategory = async (name: string, color: string, icon: string) => {
    if (!user) return;
    if (editingCategory) {
      const docRef = doc(db, 'categories', editingCategory.id);
      await updateDoc(docRef, { name, color, icon });
    } else {
      await addDoc(collection(db, 'categories'), {
        name,
        color,
        icon,
        userId: user.uid,
        createdAt: Date.now()
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    try {
      // 1. Elimina la categoria
      await deleteDoc(doc(db, 'categories', editingCategory.id));
      
      // 2. Elimina le sotto-attività associate
      const associatedSubs = subActivities.filter(sub => sub.categoryId === editingCategory.id);
      const batch = writeBatch(db);
      associatedSubs.forEach(sub => {
        batch.delete(doc(db, 'subActivities', sub.id));
        
        // Trova logs dei sub
        const subLogs = logs.filter(l => l.subActivityId === sub.id);
        subLogs.forEach(l => {
          batch.delete(doc(db, 'logs', l.id));
        });
      });
      await batch.commit();
    } catch (err) {
      console.error("Errore cancellazione categoria:", err);
    }
  };

  // CRUD sottoattività
  const handleSaveSubActivity = async (
    name: string, 
    categoryId: string, 
    weeklyTarget: number, 
    weight: number, 
    dailyValuation: boolean,
    type: 'recurring' | 'temporary' = 'recurring',
    validityType?: 'week' | 'month',
    validityPeriod?: string
  ) => {
    if (!user) return;
    if (editingSubActivity) {
      const docRef = doc(db, 'subActivities', editingSubActivity.id);
      await updateDoc(docRef, { 
        name, 
        categoryId, 
        weeklyTarget, 
        weight, 
        dailyValuation,
        type,
        validityType: validityType || null,
        validityPeriod: validityPeriod || null
      });
    } else {
      await addDoc(collection(db, 'subActivities'), {
        name,
        categoryId,
        weeklyTarget,
        weight,
        dailyValuation,
        type,
        validityType: validityType || null,
        validityPeriod: validityPeriod || null,
        userId: user.uid,
        createdAt: Date.now()
      });
    }
  };

  const handleDeleteSubActivity = async () => {
    if (!editingSubActivity) return;
    try {
      await deleteDoc(doc(db, 'subActivities', editingSubActivity.id));
      
      // Rimuovi anche i log relativi
      const subLogs = logs.filter(l => l.subActivityId === editingSubActivity.id);
      const batch = writeBatch(db);
      subLogs.forEach(l => {
        batch.delete(doc(db, 'logs', l.id));
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  // Registra / Modifica voto sotto-attività
  const handleLogScore = async (subId: string, score: number | null) => {
    if (!user) return;
    
    const existingLog = logs.find(log => log.subActivityId === subId && log.date === selectedDate);
    const sub = subActivities.find(s => s.id === subId);
    if (!sub) return;

    try {
      if (score === null) {
        // Rimuovi log se esistente
        if (existingLog) {
          await deleteDoc(doc(db, 'logs', existingLog.id));
        }
      } else {
        if (existingLog) {
          // Aggiorna log
          await updateDoc(doc(db, 'logs', existingLog.id), { 
            score,
            timestamp: Date.now(),
            weightSnap: sub.weight,
            weeklyTargetSnap: sub.weeklyTarget
          });
        } else {
          // Crea nuovo log
          await addDoc(collection(db, 'logs'), {
            subActivityId: subId,
            categoryId: sub.categoryId,
            date: selectedDate,
            score,
            userId: user.uid,
            timestamp: Date.now(),
            weightSnap: sub.weight,
            weeklyTargetSnap: sub.weeklyTarget
          } as Omit<ActivityLog, 'id'>);
        }
      }
    } catch (err) {
      console.error("Errore salvataggio voto:", err);
    }
  };

  // Logout
  const handleSignOut = () => signOut(auth);

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Verifica sessione in corso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12">
        <Auth onSuccess={() => console.log('Autenticato')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-105 transition-colors duration-300 pb-16 font-sans">
      
      {/* Navbar di Controllo */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-150 dark:border-slate-800/80 px-4 md:px-8 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 text-white">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-800 dark:text-white flex items-center gap-2 uppercase">
              Habit Tracker
              <span className="text-[9px] bg-blue-55 dark:bg-blue-900/40 text-blue-600 dark:text-blue-450 font-extrabold px-1.5 py-0.5 rounded tracking-widest border border-blue-200/50 dark:border-blue-800/50">
                PWA
              </span>
            </h1>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold uppercase tracking-wider mt-0.5">Sincronizzazione Cloud Automatica</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Email Utente */}
          <span className="hidden sm:inline text-xs font-bold text-slate-500 dark:text-slate-450 border-r border-slate-200 dark:border-slate-800 pr-4 mt-0.5 uppercase tracking-wide">
            {user.email}
          </span>
          
          {/* Toggle Light/Dark */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl transition-all border border-slate-200/50 dark:border-slate-700/50"
            title="Cambia tema visivo"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 text-rose-600 dark:text-rose-450 hover:bg-rose-100/50 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-slate-200/50 dark:border-slate-705"
            title="Esci"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 space-y-8">
        
        {/* Navigatore Giornaliero */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-3xl border border-slate-150 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-all active:scale-95 hover:text-slate-800 dark:hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-widest mt-0.5">
              {getFriendlyDateStr()}
            </span>
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-150 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-all active:scale-95 hover:text-slate-800 dark:hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Radar/Bar Chart & Statistiche Generali */}
        <StatsRadar 
          categories={categories} 
          subActivities={subActivities} 
          logs={logs} 
        />

        {/* Abitudini e Macro Categorie */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Le tue Abitudini
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
                Seleziona e compila un voto da 1 a 10 per registrare l'esito giornaliero.
              </p>
            </div>

            {/* Bottone Nuova Categoria */}
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuova Macro-Categoria
            </button>
          </div>

          {loadingData ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Sincronizzazione dei dati locali in corso...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  subActivities={subActivities.filter(sub => sub.categoryId === cat.id)}
                  logs={logs}
                  selectedDate={selectedDate}
                  onEditCategory={() => {
                    setEditingCategory(cat);
                    setCategoryModalOpen(true);
                  }}
                  onAddSubActivity={() => {
                    setSelectedCategoryIdForNewSub(cat.id);
                    setEditingSubActivity(null);
                    setSubActivityModalOpen(true);
                  }}
                  onEditSubActivity={(sub) => {
                    setEditingSubActivity(sub);
                    setSelectedCategoryIdForNewSub(cat.id);
                    setSubActivityModalOpen(true);
                  }}
                  onLogScore={handleLogScore}
                />
              ))}
            </div>
          )}
        </div>

        {/* Simulatore Push Notifiche */}
        <PushSimulator subActivities={subActivities} logs={logs} />
      </main>

      {/* MODAL CATEGORIA */}
      {categoryModalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
          onDelete={editingCategory ? handleDeleteCategory : undefined}
        />
      )}

      {/* MODAL SOTTO-ATTIVITÀ */}
      {subActivityModalOpen && (
        <SubActivityModal
          subActivity={editingSubActivity}
          categoryId={selectedCategoryIdForNewSub}
          categories={categories}
          onClose={() => {
            setSubActivityModalOpen(false);
            setEditingSubActivity(null);
          }}
          onSave={handleSaveSubActivity}
          onDelete={editingSubActivity ? handleDeleteSubActivity : undefined}
        />
      )}
    </div>
  );
}
