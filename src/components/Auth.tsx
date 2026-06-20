import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, UserPlus, ShieldAlert, Target } from 'lucide-react';

interface AuthProps {
  onSuccess?: () => void;
}

export function Auth({ onSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      let message = 'Si è verificato un errore durante l\'autenticazione.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Credenziali non valide. Riprova.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Questo indirizzo email è già in uso.';
      } else if (err.code === 'auth/weak-password') {
        message = 'La password deve contenere almeno 6 caratteri.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Indirizzo email non valido.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Il metodo Email/Password non è abilitato nella console Firebase per questo progetto. Abilitalo in Authentication -> Sign-in method, oppure esegui l\'Accesso con Google qui sotto.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      let message = 'Errore durante l\'accesso con Google.';
      if (err.code === 'auth/operation-not-allowed') {
        message = 'L\'accesso con Google non è abilitato nel tuo progetto Firebase. Configura Google Sign-In nella console Firebase.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-container" className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div id="auth-card" className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300">
        <div id="auth-header" className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl mb-4 animate-pulse">
            <Target className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">
            {isSignUp ? 'Crea Account' : 'Accedi al Tracker'}
          </h1>
          <p className="mt-2 text-xs font-semibold text-slate-450 dark:text-slate-500 max-w-xs mx-auto leading-normal">
            {isSignUp 
              ? 'Inizia ad ottimizzare la tua vita tracciando i tuoi obiettivi.' 
              : 'Bentornato! Sincronizza ed esegui i tuoi obiettivi giornalieri.'}
          </p>
        </div>

        {error && (
          <div id="auth-error-banner" className="flex items-center gap-3 p-4 mb-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.com"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/10 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Registrati
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Accedi
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <span className="relative bg-white dark:bg-slate-900 px-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Oppure
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white font-black uppercase tracking-widest rounded-xl transition-all text-xs disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Accedi con Google
        </button>

        <div id="auth-footer" className="mt-8 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isSignUp 
              ? 'Hai già un account? Accedi' 
              : 'Non hai un account? Registrati ora'}
          </button>
        </div>
      </div>
    </div>
  );
}
