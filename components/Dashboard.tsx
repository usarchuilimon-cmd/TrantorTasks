import React, { useContext } from 'react';
import { AppContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Status, Priority } from '../types';
import { TRANSLATIONS } from '../constants';

export const Dashboard: React.FC = () => {
    const { tasks, language } = useContext(AppContext);
    const t = TRANSLATIONS[language];

    const stats = [
        { label: t.totalTasks, value: tasks.length, icon: 'list', color: 'bg-blue-500' },
        { label: t.inProgress, value: tasks.filter(t => t.status === Status.IN_PROGRESS).length, icon: 'timelapse', color: 'bg-yellow-500' },
        { label: t.completed, value: tasks.filter(t => t.status === Status.COMPLETED).length, icon: 'check_circle', color: 'bg-green-500' },
        { label: t.highPriority, value: tasks.filter(t => t.priority === Priority.HIGH).length, icon: 'flag', color: 'bg-red-500' },
    ];

    // Calculate last 7 days completion data
    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const last7Days = getLast7Days();
    const chartData = last7Days.map(date => {
        const dateObj = new Date(date);
        // Correcting for timezone offset issues when creating date from string YYYY-MM-DD
        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);
        
        // Use the selected language for the date format (e.g., 'es-MX' or 'en-US')
        const locale = language === 'es' ? 'es-MX' : 'en-US';
        const dayName = adjustedDate.toLocaleDateString(locale, { weekday: 'short' });
        
        const count = tasks.filter(t => t.status === Status.COMPLETED && t.completedAt === date).length;
        return { name: dayName, tasks: count };
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-full ${stat.color} bg-opacity-10 flex items-center justify-center text-white`}>
                            <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t.taskCompletionHistory}</h3>
                    <div className="h-64 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#9CA3AF', fontSize: 12}} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#9CA3AF', fontSize: 12}} 
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    cursor={{fill: 'rgba(99, 102, 241, 0.1)'}} 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                                />
                                <Bar dataKey="tasks" radius={[4, 4, 0, 0]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#6366f1" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t.recentTasks}</h3>
                    <div className="space-y-4">
                        {tasks.slice(0, 4).map(task => (
                            <div key={task.id} className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${task.priority === Priority.HIGH ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{task.dueDate}</p>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">{t.noTasks}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};