import React, { useContext, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AppContext } from '../App';
import { Logo } from './Logo';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';

export const Login: React.FC = () => {
    const { language, setLanguage } = useContext(AppContext);
    const t = TRANSLATIONS[language];
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert(t.checkEmail || 'Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (error: any) {
            setErrorMsg(error.message);
        }
    };

    return (
        <div className="flex min-h-screen bg-surface-light dark:bg-background-dark">
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-12 relative z-10 bg-white dark:bg-surface-dark shadow-2xl lg:shadow-none">

                {/* Language Switcher */}
                <div className="absolute top-6 right-6 z-20">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setLanguage(Language.ES)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${language === Language.ES ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-white ring-1 ring-gray-200 dark:ring-gray-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                        >
                            ES
                        </button>
                        <button
                            onClick={() => setLanguage(Language.EN)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${language === Language.EN ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-white ring-1 ring-gray-200 dark:ring-gray-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                        >
                            EN
                        </button>
                    </div>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
                            <div className="p-1">
                                <Logo className="w-12 h-12" />
                            </div>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">TRANTOR</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{t.welcome}</h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">{t.loginSubtitle}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                        {errorMsg && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                {errorMsg}
                            </div>
                        )}
                        <form className="space-y-6" onSubmit={handleEmailAuth}>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.emailLabel}</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400">mail</span>
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.passwordLabel}</label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-400">lock</span>
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (t.processing || 'Processing...') : (isSignUp ? (t.signUp || 'Sign Up') : t.signInButton)}
                            </button>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">{t.orContinueWith || 'Or continue with'}</span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={handleGoogleLogin}
                                    type="button"
                                    className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none transition-colors"
                                >
                                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.21-1.19-2.63z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    Google
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                            >
                                {isSignUp ? (t.alreadyHaveAccount || 'Already have an account? Sign in') : (t.dontHaveAccount || "Don't have an account? Sign up")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex lg:w-1/2 relative bg-gray-50 dark:bg-gray-900 items-center justify-center p-12 overflow-hidden">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"></div>
                <div className="relative z-10 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t.heroTitle}</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">{t.heroSubtitle}</p>
                </div>
            </div>
        </div>
    );
};