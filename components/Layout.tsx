import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { TRANSLATIONS } from '../constants';
import { Logo } from './Logo';

interface LayoutProps {
    children: React.ReactNode;
    title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
    const { user, logout, language, setLanguage, darkMode, toggleDarkMode, currency, setCurrency, voiceEnabled, setVoiceEnabled, currentRoute, setRoute, notifications, markAllRead, clearNotifications } = useContext(AppContext);
    const t = TRANSLATIONS[language];
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    const handleUserClick = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setTimeout(() => setIsUserMenuOpen(true), 150);
        } else {
            setIsUserMenuOpen(!isUserMenuOpen);
        }
    };

    const handleNavigate = (route: string) => {
        setRoute(route);
        window.location.hash = route;
        // Mobile menu logic removed as we now use bottom nav
    };

    // Close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fullscreen listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Date formatting for footer with Title Case
    const rawDate = new Date().toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const currentDate = rawDate.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Helper for Mobile Bottom Nav Item
    const MobileNavItem = ({ icon, label, routeName, active }: { icon: string, label: string, routeName: string, active: boolean }) => (
        <button
            onClick={() => handleNavigate(routeName)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
            <span className={`material-symbols-outlined text-2xl ${active ? 'font-variation-settings-fill' : ''}`}>
                {active ? icon : icon}
            </span>
            <span className="text-[10px] font-medium truncate max-w-full leading-none">{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">

            {/* Desktop Sidebar - HIDDEN on Mobile */}
            <aside className={`
                hidden md:flex
                flex-col flex-shrink-0 z-40 h-full
                bg-surface-light dark:bg-surface-dark border-r border-gray-200 dark:border-gray-700 
                transition-all duration-300 font-sans shadow-none
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}>
                {/* Logo & Toggle */}
                <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6 justify-between'} border-b border-gray-200 dark:border-gray-700 transition-all duration-300`}>
                    <div className={`flex items-center gap-2 overflow-hidden whitespace-nowrap ${isCollapsed ? 'hidden' : 'flex'}`}>
                        <div className="flex-shrink-0">
                            <Logo className="w-8 h-8" />
                        </div>
                        <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">TRANTOR</span>
                    </div>

                    {/* Desktop Collapse Button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isCollapsed ? 'block' : ''}`}
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <span className="material-symbols-outlined text-xl">
                            {isCollapsed ? 'menu' : 'menu_open'}
                        </span>
                    </button>
                </div>

                {/* Main Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-hide">
                    <NavItem
                        icon="dashboard"
                        label={t.dashboard}
                        href="#dashboard"
                        active={currentRoute === '#dashboard'}
                        onNavigate={handleNavigate}
                        collapsed={isCollapsed}
                    />
                    <NavItem
                        icon="task_alt"
                        label={t.tasks}
                        href="#tasks"
                        active={currentRoute === '#tasks'}
                        onNavigate={handleNavigate}
                        collapsed={isCollapsed}
                    />
                </nav>

                {/* User Menu Content (Collapsible) */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 ${isUserMenuOpen && !isCollapsed ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-3 space-y-1">
                        <NavItem
                            icon="person"
                            label={t.profile}
                            href="#profile"
                            active={currentRoute === '#profile'}
                            onNavigate={handleNavigate}
                            collapsed={false}
                        />

                        <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>

                        {/* Controls */}
                        <div className="px-3 py-2 space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>{t.darkMode}</span>
                                <button onClick={toggleDarkMode} className={`w-10 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-primary-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${darkMode ? 'translate-x-4' : ''}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>{t.language}</span>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as any)}
                                    className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer text-gray-900 dark:text-white p-0"
                                >
                                    <option value="en">EN</option>
                                    <option value="es">ES</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>{t.currency}</span>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as any)}
                                    className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer text-gray-900 dark:text-white p-0"
                                >
                                    <option value="USD">USD</option>
                                    <option value="MXN">MXN</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                <span>{t.voiceAssistant}</span>
                                <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-10 h-6 rounded-full p-1 transition-colors ${voiceEnabled ? 'bg-primary-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${voiceEnabled ? 'translate-x-4' : ''}`} />
                                </button>
                            </div>

                            {/* Log Option - Styled like Controls */}
                            <div
                                onClick={() => handleNavigate('#settings')}
                                className={`flex items-center justify-between text-sm cursor-pointer transition-colors group ${currentRoute === '#settings'
                                    ? 'text-primary-600 dark:text-primary-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <span>{t.settings}</span>
                                <span className={`material-symbols-outlined text-[20px] ${currentRoute === '#settings' ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'}`}>
                                    terminal
                                </span>
                            </div>
                        </div>

                        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors">
                            <span className="material-symbols-outlined text-xl">logout</span>
                            {t.logout}
                        </button>
                    </div>
                </div>

                {/* User Card Trigger */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark">
                    <button
                        onClick={handleUserClick}
                        className={`flex items-center gap-3 w-full hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors group ${isCollapsed ? 'justify-center' : '-ml-2'}`}
                    >
                        <div className="relative flex-shrink-0">
                            <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                        </div>
                        <div className={`flex-1 min-w-0 text-left transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden hidden md:block' : 'w-auto opacity-100'}`}>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role}</p>
                        </div>
                        <span className={`material-symbols-outlined text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all duration-300 ${isUserMenuOpen ? 'rotate-180' : ''} ${isCollapsed ? 'w-0 opacity-0 overflow-hidden hidden md:block' : 'w-auto opacity-100'}`}>
                            expand_less
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300">
                <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 z-30 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile Logo only (No Menu Button) */}
                        <div className="md:hidden flex-shrink-0">
                            <Logo className="w-8 h-8" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className={`relative p-2 rounded-full transition-colors ${isNotificationsOpen ? 'bg-gray-100 dark:bg-gray-800 text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                            >
                                <span className="material-symbols-outlined text-2xl">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {isNotificationsOpen && (
                                <div className="absolute right-0 mt-3 w-72 md:w-96 bg-white dark:bg-surface-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transform origin-top-right transition-all animate-fade-in z-50 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{t.notificationsTitle}</h3>
                                        {notifications.length > 0 && (
                                            <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
                                                {t.markAllRead}
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                                                <p className="text-sm">{t.noNotifications}</p>
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {notifications.map((n) => (
                                                    <li key={n.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                        <div className="flex gap-3">
                                                            <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.type === 'alert' ? 'bg-red-100 text-red-600' :
                                                                n.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                                }`}>
                                                                <span className="material-symbols-outlined text-sm">
                                                                    {n.type === 'alert' ? 'warning' : n.type === 'success' ? 'check_circle' : 'info'}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                    {n.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                                    {n.message}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-2">
                                                                    {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            {!n.isRead && (
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                            <button onClick={clearNotifications} className="w-full py-2 text-xs text-gray-500 hover:text-red-500 transition-colors">
                                                {t.clearAll}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="hidden md:block p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            <span className="material-symbols-outlined text-2xl">
                                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                            </span>
                        </button>
                    </div>
                </header>

                {/* Content Area - Adjusted padding for bottom nav */}
                <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
                    {children}
                </div>

                {/* Footer - Hidden on Mobile to save space */}
                <footer className="hidden md:flex h-8 min-h-[32px] bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 items-center justify-between px-4 md:px-8 text-[10px] text-gray-500 dark:text-gray-400 z-10 transition-colors duration-300 flex-shrink-0">
                    <a href="https://www.laimu.mx" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                        www.laimu.mx
                    </a>
                    <span className="font-medium opacity-80 capitalize">
                        {currentDate}
                    </span>
                </footer>
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 h-16 flex justify-around items-center px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <MobileNavItem icon="dashboard" label={t.dashboard} routeName="#dashboard" active={currentRoute === '#dashboard'} />
                <MobileNavItem icon="task_alt" label={t.tasks} routeName="#tasks" active={currentRoute === '#tasks'} />
                {/* Spacer for FAB is optional, but since FAB is raised, we can just distribute evenly */}
                <MobileNavItem icon="person" label={t.profile} routeName="#profile" active={currentRoute === '#profile'} />
                <MobileNavItem icon="settings" label={t.settings} routeName="#settings" active={currentRoute === '#settings'} />
            </div>
        </div>
    );
};

const NavItem: React.FC<{
    icon: string;
    label: string;
    href: string;
    active?: boolean;
    onNavigate: (route: string) => void;
    collapsed?: boolean;
}> = ({ icon, label, href, active, onNavigate, collapsed }) => (
    <a
        href={href}
        onClick={(e) => { e.preventDefault(); onNavigate(href); }}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${active
            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? label : undefined}
    >
        <span className="material-symbols-outlined text-xl flex-shrink-0">{icon}</span>
        <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden hidden md:block' : 'w-auto opacity-100'}`}>
            {label}
        </span>
    </a>
);