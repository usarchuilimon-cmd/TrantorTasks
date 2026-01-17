import React, { useState, useEffect, createContext } from 'react';
import { supabase } from './supabaseClient';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { TaskModule } from './components/TaskModule';
import { Profile } from './components/Profile';
import { Dashboard } from './components/Dashboard';
import { VoiceAssistant } from './components/VoiceAssistant';
import { AppContextType, User, Task, Language, Currency, AppNotification, Status, LogEntry } from './types';
import { MOCK_USER, INITIAL_TASKS, TRANSLATIONS } from './constants';

export const AppContext = createContext<AppContextType>({} as AppContextType);

const App: React.FC = () => {
    // State
    const [user, setUser] = useState<User | null>(null);
    const [darkMode, setDarkMode] = useState(false);
    const [language, setLanguage] = useState<Language>(Language.ES);
    const [currency, setCurrency] = useState<Currency>(Currency.MXN);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Initialize route with current hash or default to dashboard
    const [route, setRoute] = useState<string>(() => window.location.hash || '#dashboard');

    const t = TRANSLATIONS[language];

    // Logging Function
    const addLog = (level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any) => {
        const newLog: LogEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toLocaleTimeString(),
            level,
            category,
            message,
            details
        };
        console.log(`[${category}] ${message}`, details || '');
        setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
    };

    const clearLogs = () => setLogs([]);

    // Generate Notifications Logic
    useEffect(() => {
        if (!user) return;
        const currentT = TRANSLATIONS[language]; // Use current language inside effect

        const newNotifications: AppNotification[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Welcome Notification (if empty)
        if (notifications.length === 0) {
            newNotifications.push({
                id: 'welcome',
                title: currentT.welcomeTitle,
                message: currentT.welcomeMsg,
                type: 'success',
                isRead: false,
                timestamp: new Date()
            });
        }

        // 2. Check Tasks for alerts
        tasks.forEach(task => {
            if (task.status !== Status.COMPLETED) {
                if (task.dueDate < todayStr) {
                    // Overdue
                    const exists = notifications.some(n => n.id === `overdue-${task.id}`);
                    if (!exists) {
                        newNotifications.push({
                            id: `overdue-${task.id}`,
                            title: currentT.overdueTitle,
                            message: `${task.title}`,
                            type: 'alert',
                            isRead: false,
                            timestamp: new Date()
                        });
                    }
                } else if (task.dueDate === todayStr) {
                    // Due Today
                    const exists = notifications.some(n => n.id === `today-${task.id}`);
                    if (!exists) {
                        newNotifications.push({
                            id: `today-${task.id}`,
                            title: currentT.dueTodayTitle,
                            message: `${task.title}`,
                            type: 'info',
                            isRead: false,
                            timestamp: new Date()
                        });
                    }
                }
            }
        });

        if (newNotifications.length > 0) {
            setNotifications(prev => [...newNotifications, ...prev]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, user, language]); // Re-run when tasks change to update alerts

    // Routing Logic (Hash Router)
    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash || '#dashboard');
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Dark Mode Effect
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Auth Effect
    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const newUser: User = {
                    name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
                    email: session.user.email || '',
                    avatar: session.user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`,
                    role: 'User',
                    department: 'General',
                    bio: 'Trantor User'
                };
                setUser(newUser);
                fetchTasks(); // Fetch tasks after login
            } else {
                setLoading(false); // Stop loading if no session
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const newUser: User = {
                    name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
                    email: session.user.email || '',
                    avatar: session.user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`,
                    role: 'User',
                    department: 'General',
                    bio: 'Trantor User'
                };
                setUser(newUser);
                fetchTasks();
            } else {
                setUser(null);
                setTasks([]);
                setLoading(false);
            }
        })

        return () => subscription.unsubscribe()
    }, []);

    // Context Actions
    const login = () => {
        // Handled by Login component now via Supabase
    };
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        addLog('info', 'System', 'User logged out');
    };
    const toggleDarkMode = () => setDarkMode(!darkMode);

    const fetchTasks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tasks_tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tasks:', error);
            addLog('error', 'System', 'Failed to fetch tasks', error);
        } else {
            const mappedTasks: Task[] = (data || []).map(item => ({
                id: item.id,
                title: item.title,
                description: item.description,
                priority: item.priority as any,
                status: item.status as any,
                dueDate: item.due_date,
                assignee: item.assignee,
                relatedTo: item.related_to,
                estimatedCost: item.estimated_cost,
                actualCost: item.actual_cost,
                currency: item.currency as any,
                estimatedTime: item.estimated_time,
                actualTime: item.actual_time,
                isUrgent: item.is_urgent,
                isImportant: item.is_important,
                comments: item.comments || [],
                completedAt: item.completed_at
            }));
            setTasks(mappedTasks);
        }
        setLoading(false);
    };



    const addTask = async (task: Omit<Task, 'id'>) => {
        const currentT = TRANSLATIONS[language];

        // Map to DB format
        const dbTask = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            due_date: task.dueDate,
            assignee: task.assignee,
            related_to: task.relatedTo,
            estimated_cost: task.estimatedCost,
            actual_cost: task.actualCost,
            currency: task.currency,
            estimated_time: task.estimatedTime,
            actual_time: task.actualTime,
            is_urgent: task.isUrgent,
            is_important: task.isImportant,
            comments: task.comments || []
        };

        const { data, error } = await supabase
            .from('tasks_tasks')
            .insert([dbTask])
            .select()
            .single();

        if (error) {
            addLog('error', 'Task', `Failed to create task: ${task.title}`, error);
            return;
        }

        if (data) {
            const newTask: Task = {
                id: data.id,
                title: data.title,
                description: data.description,
                priority: data.priority as any,
                status: data.status as any,
                dueDate: data.due_date,
                assignee: data.assignee,
                relatedTo: data.related_to,
                estimatedCost: data.estimated_cost,
                actualCost: data.actual_cost,
                currency: data.currency as any,
                estimatedTime: data.estimated_time,
                actualTime: data.actual_time,
                isUrgent: data.is_urgent,
                isImportant: data.is_important,
                comments: data.comments || [],
                completedAt: data.completed_at
            };

            setTasks(prev => [newTask, ...prev]);
            addLog('success', 'Task', `Task created: ${newTask.title}`, newTask);

            // Trigger a notification for new task
            setNotifications(prev => [{
                id: `new-${Date.now()}`,
                title: currentT.newTaskTitle,
                message: newTask.title,
                type: 'success',
                isRead: false,
                timestamp: new Date()
            }, ...prev]);
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        // Map updates to DB format
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.status !== undefined) {
            dbUpdates.status = updates.status;
            if (updates.status === Status.COMPLETED) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                dbUpdates.completed_at = `${yyyy}-${mm}-${dd}`;
            }
        }
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee;
        if (updates.relatedTo !== undefined) dbUpdates.related_to = updates.relatedTo;
        if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
        if (updates.actualCost !== undefined) dbUpdates.actual_cost = updates.actualCost;
        if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
        if (updates.estimatedTime !== undefined) dbUpdates.estimated_time = updates.estimatedTime;
        if (updates.actualTime !== undefined) dbUpdates.actual_time = updates.actualTime;
        if (updates.isUrgent !== undefined) dbUpdates.is_urgent = updates.isUrgent;
        if (updates.isImportant !== undefined) dbUpdates.is_important = updates.isImportant;
        if (updates.comments !== undefined) dbUpdates.comments = updates.comments;

        const { error } = await supabase
            .from('tasks_tasks')
            .update(dbUpdates)
            .eq('id', id);

        if (error) {
            addLog('error', 'Task', `Failed to update task: ${id}`, error);
        } else {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        }
    };

    const deleteTask = async (id: string) => {
        const { error } = await supabase
            .from('tasks_tasks')
            .delete()
            .eq('id', id);

        if (error) {
            addLog('error', 'Task', `Failed to delete task: ${id}`, error);
        } else {
            setTasks(prev => prev.filter(t => t.id !== id));
            addLog('warning', 'Task', `Task deleted: ${id}`);
        }
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const contextValue: AppContextType = {
        user, login, logout,
        darkMode, toggleDarkMode,
        language, setLanguage,
        currency, setCurrency,
        voiceEnabled, setVoiceEnabled,
        tasks, addTask, updateTask, deleteTask,
        currentRoute: route, setRoute,
        notifications, markAllRead, clearNotifications,
        logs, addLog, clearLogs
    };

    if (!user) {
        return (
            <AppContext.Provider value={contextValue}>
                <Login />
            </AppContext.Provider>
        );
    }

    let content;
    let title = t.dashboard;

    switch (route) {
        case '#dashboard':
            content = <Dashboard />;
            title = t.dashboard;
            break;
        case '#tasks':
            content = <TaskModule />;
            title = t.tasks;
            break;
        case '#profile':
            content = <Profile />;
            title = t.myProfile || "Profile";
            break;
        case '#settings':
            content = (
                <div className="space-y-6">
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.systemLogs}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t.monitorEvents}</p>
                            </div>
                            <button onClick={clearLogs} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                {t.clearLogs}
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="max-h-[500px] overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-gray-900 font-mono text-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 w-24">{t.time}</th>
                                            <th className="px-4 py-2 w-24">{t.level}</th>
                                            <th className="px-4 py-2 w-24">{t.category}</th>
                                            <th className="px-4 py-2">{t.message}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">{t.noLogs}</td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 group">
                                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${log.level === 'error' ? 'bg-red-100 text-red-700' :
                                                            log.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                                log.level === 'success' ? 'bg-green-100 text-green-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {log.level}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-semibold">{log.category}</td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400 break-all">
                                                        {log.message}
                                                        {log.details && (
                                                            <details className="mt-1">
                                                                <summary className="cursor-pointer text-primary-500 hover:underline">{t.viewDetails}</summary>
                                                                <pre className="mt-1 p-2 bg-gray-200 dark:bg-black/30 rounded text-[10px] overflow-x-auto">
                                                                    {JSON.stringify(log.details, null, 2)}
                                                                </pre>
                                                            </details>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            );
            title = t.settingsTitle || "Settings";
            break;
        default:
            content = <Dashboard />;
            title = t.dashboard;
    }

    return (
        <AppContext.Provider value={contextValue}>
            <Layout title={title}>
                {content}
            </Layout>
            {voiceEnabled && <VoiceAssistant />}
        </AppContext.Provider>
    );
};

export default App;