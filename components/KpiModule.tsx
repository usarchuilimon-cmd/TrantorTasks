import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { TRANSLATIONS, getLocale } from '../constants';
import { Status, Priority, Task, Currency } from '../types';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, 
    AreaChart, Area, LineChart, Line, PieChart, Pie, Legend
} from 'recharts';

type TimeRange = 'week' | 'month' | 'year';

export const KpiModule: React.FC = () => {
    const { tasks, language, currency } = useContext(AppContext);
    const [range, setRange] = useState<TimeRange>('week');
    const t = TRANSLATIONS[language];
    const localeStr = getLocale(language);

    // --- 1. Date & Range Helpers (Strict Calendar Periods) ---
    
    // Parses "YYYY-MM-DD" safely ignoring timezone shifts
    const parseDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    // Helper to get start and end dates for the selected range (Local Time)
    const { startDate, endDate, labelFormat } = useMemo(() => {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (range === 'week') {
            // Current Week (Monday to Sunday)
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            start.setDate(diff);
            start.setHours(0,0,0,0);
            
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
        } else if (range === 'month') {
            // Current Month
            start.setDate(1);
            start.setHours(0,0,0,0);
            
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23,59,59,999);
        } else {
            // Current Year
            start.setMonth(0, 1);
            start.setHours(0,0,0,0);
            
            end.setMonth(11, 31);
            end.setHours(23,59,59,999);
        }

        return { startDate: start, endDate: end, labelFormat: range };
    }, [range]);

    // --- 2. Data Filtering (Strictly within range) ---

    // Filter tasks that fall within the specific range
    const rangeTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = parseDate(task.dueDate);
            // Check if task is within range (inclusive)
            return taskDate >= startDate && taskDate <= endDate;
        });
    }, [tasks, startDate, endDate]);

    // Separate Completed tasks based on 'completedAt' date falling in range
    // Note: A task could be due next month but completed this month.
    const rangeCompletedTasks = useMemo(() => {
        return tasks.filter(task => {
            if (task.status !== Status.COMPLETED || !task.completedAt) return false;
            const compDate = parseDate(task.completedAt);
            return compDate >= startDate && compDate <= endDate;
        });
    }, [tasks, startDate, endDate]);


    // --- 3. Metrics Calculations ---

    // Efficiency: Based on completed tasks in this range
    const efficiencyData = useMemo(() => {
        let totalEst = 0;
        let totalAct = 0;
        rangeCompletedTasks.forEach(t => {
            if (t.estimatedTime !== undefined && t.actualTime !== undefined) {
                totalEst += t.estimatedTime;
                totalAct += t.actualTime;
            }
        });
        const score = totalEst > 0 ? (totalEst / (totalAct || 1)) * 100 : 0;
        return { score: score.toFixed(0), est: totalEst, act: totalAct };
    }, [rangeCompletedTasks]);

    // On Time Delivery
    const onTimeRate = useMemo(() => {
        if (rangeCompletedTasks.length === 0) return "0.0";
        
        const onTime = rangeCompletedTasks.filter(t => {
            if (!t.completedAt) return false;
            return t.completedAt <= t.dueDate;
        });
        return ((onTime.length / rangeCompletedTasks.length) * 100).toFixed(1);
    }, [rangeCompletedTasks]);

    // Financials: Budget (Planned in range) vs Actual (Completed in range)
    const financials = useMemo(() => {
        const budget = rangeTasks
            .filter(t => t.currency === currency)
            .reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);

        const executed = rangeCompletedTasks
            .filter(t => t.currency === currency)
            .reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0); // Using est cost as Earned Value

        return { budget, executed };
    }, [rangeTasks, rangeCompletedTasks, currency]);


    // --- 4. Chart Data Generation (Strict X-Axis alignment) ---
    
    const chartData = useMemo(() => {
        const data = [];
        const iterDate = new Date(startDate);

        if (range === 'year') {
            // Monthly Buckets
            for (let i = 0; i < 12; i++) {
                const monthStart = new Date(iterDate.getFullYear(), i, 1);
                const monthEnd = new Date(iterDate.getFullYear(), i + 1, 0);
                const label = monthStart.toLocaleDateString(localeStr, { month: 'short' });

                const planned = tasks.filter(t => {
                    const d = parseDate(t.dueDate);
                    return d >= monthStart && d <= monthEnd;
                });

                const completed = tasks.filter(t => {
                    if (t.status !== Status.COMPLETED || !t.completedAt) return false;
                    const d = parseDate(t.completedAt);
                    return d >= monthStart && d <= monthEnd;
                });

                data.push({
                    name: label,
                    created: planned.length,
                    completed: completed.length,
                    estHours: planned.reduce((acc, t) => acc + (t.estimatedTime || 0), 0),
                    actHours: completed.reduce((acc, t) => acc + (t.actualTime || 0), 0),
                    budget: planned.reduce((acc, t) => acc + (t.currency === currency ? (t.estimatedCost || 0) : 0), 0),
                    actualCost: completed.reduce((acc, t) => acc + (t.currency === currency ? (t.estimatedCost || 0) : 0), 0)
                });
            }
        } else {
            // Daily Buckets (Week or Month)
            // Clone to avoid infinite loop issues if logic fails
            const loopEnd = new Date(endDate);
            
            while (iterDate <= loopEnd) {
                const dateStr = iterDate.toISOString().split('T')[0];
                const label = iterDate.toLocaleDateString(localeStr, 
                    range === 'week' ? { weekday: 'short' } : { day: 'numeric' }
                );

                // Exact match for the day
                const planned = tasks.filter(t => t.dueDate === dateStr);
                const completed = tasks.filter(t => t.status === Status.COMPLETED && t.completedAt === dateStr);

                data.push({
                    name: label,
                    created: planned.length,
                    completed: completed.length,
                    estHours: planned.reduce((acc, t) => acc + (t.estimatedTime || 0), 0),
                    actHours: completed.reduce((acc, t) => acc + (t.actualTime || 0), 0),
                    budget: planned.reduce((acc, t) => acc + (t.currency === currency ? (t.estimatedCost || 0) : 0), 0),
                    actualCost: completed.reduce((acc, t) => acc + (t.currency === currency ? (t.estimatedCost || 0) : 0), 0)
                });

                iterDate.setDate(iterDate.getDate() + 1);
            }
        }
        return data;
    }, [range, startDate, endDate, tasks, currency, language, localeStr]);

    const priorityData = useMemo(() => {
        const high = rangeTasks.filter(t => t.priority === Priority.HIGH).length;
        const med = rangeTasks.filter(t => t.priority === Priority.MEDIUM).length;
        const low = rangeTasks.filter(t => t.priority === Priority.LOW).length;
        return [
            { name: t.priorityVal[Priority.HIGH], value: high, color: '#EF4444' },
            { name: t.priorityVal[Priority.MEDIUM], value: med, color: '#F59E0B' },
            { name: t.priorityVal[Priority.LOW], value: low, color: '#10B981' },
        ];
    }, [rangeTasks, t]);


    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header Controls - Simplified */}
            <div className="flex justify-end items-center mb-2">
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
                    {(['week', 'month', 'year'] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                                range === r 
                                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            {t.timeRange[r]}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Workload (Total Tasks) */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t.totalTasks}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{rangeTasks.length}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        {range === 'week' ? t.kpiLabels.currentWeek : range === 'month' ? t.kpiLabels.currentMonth : t.kpiLabels.currentYear}
                    </div>
                </div>

                {/* 2. Completion Rate */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t.kpiMetrics.onTimeDelivery}</p>
                        <div className="flex items-baseline gap-2 mt-2">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{onTimeRate}%</h3>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase ${parseFloat(onTimeRate) >= 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {parseFloat(onTimeRate) >= 80 ? 'OK' : 'Low'}
                            </span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${onTimeRate}%` }}></div>
                    </div>
                </div>

                {/* 3. Financials (Budget vs Actual) */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">{t.kpiMetrics.totalCost} ({currency})</p>
                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-xs text-gray-400 uppercase font-bold">{t.kpiMetrics.budget}</span>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                ${financials.budget.toLocaleString()}
                            </h3>
                        </div>
                        <div className="text-right">
                             <span className="text-xs text-gray-400 uppercase font-bold">{t.kpiMetrics.actual}</span>
                             <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                                ${financials.executed.toLocaleString()}
                            </h3>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden flex">
                        <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${financials.budget > 0 ? (financials.executed / financials.budget) * 100 : 0}%` }}></div>
                    </div>
                </div>

                {/* 4. Efficiency (Hours) */}
                <div className="bg-gradient-to-br from-indigo-500 to-primary-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-indigo-100 text-sm font-medium mb-1">{t.kpiMetrics.avgEfficiency}</p>
                        <h3 className="text-3xl font-bold">{efficiencyData.score}%</h3>
                        <p className="text-xs text-indigo-200 mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {efficiencyData.act.toFixed(1)}h / {efficiencyData.est}h
                        </p>
                    </div>
                    <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl text-white opacity-10">speed</span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Velocity Chart (Count) */}
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t.kpiMetrics.tasksCreatedVsCompleted}</h3>
                    <div className="h-72 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                />
                                <Legend />
                                <Bar dataKey="created" name={t.kpiMetrics.created} fill="#818cf8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="completed" name={t.completed} fill="#34d399" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 {/* Efficiency Area Chart (Hours) */}
                 <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t.kpiMetrics.timeAnalysis}</h3>
                    <div className="h-72 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorEst" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Area type="monotone" dataKey="estHours" name={t.estTime} stroke="#f59e0b" fillOpacity={1} fill="url(#colorEst)" />
                                <Area type="monotone" dataKey="actHours" name={t.actTime} stroke="#6366f1" fillOpacity={1} fill="url(#colorAct)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Priority Distribution (Count) */}
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t.kpiMetrics.priorityDist}</h3>
                    <div className="h-64 flex items-center justify-center w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 {/* Cost Burn Down (Money) */}
                 <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t.kpiMetrics.costAnalysis}</h3>
                    <div className="h-64 w-full min-w-0">
                         <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Line type="monotone" dataKey="budget" name={t.kpiMetrics.budget} stroke="#10B981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="actualCost" name={t.kpiMetrics.actual} stroke="#EF4444" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};