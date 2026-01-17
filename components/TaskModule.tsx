import React, { useState, useContext, FormEvent, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { TRANSLATIONS, getLocale } from '../constants';
import { ViewMode, Task, Priority, Status, Currency, User } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';
import { base64ToUint8Array, decodeAudioData } from '../services/audioUtils';
import { KpiModule } from './KpiModule';

// Helper to determine due date styling
const getDueDateStatus = (task: Task) => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    if (task.status === Status.COMPLETED) return { className: 'text-gray-500 dark:text-gray-400', icon: 'check_circle' };
    if (!task.dueDate) return { className: 'text-gray-500 dark:text-gray-400', icon: 'calendar_today' };

    if (task.dueDate < todayStr) {
        return { className: 'text-red-500 dark:text-red-400 font-medium', icon: 'error' }; // Overdue
    }
    if (task.dueDate === todayStr) {
        return { className: 'text-orange-600 dark:text-orange-400 font-medium', icon: 'alarm' }; // Due Today
    }

    return { className: 'text-gray-500 dark:text-gray-400', icon: 'schedule' };
};

// Helper to format hours into HH:MM:SS
const formatDuration = (totalHours: number) => {
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);
    const seconds = Math.floor(((totalHours - hours) * 60 - minutes) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- New Task Timer Component ---
interface TaskTimerProps {
    task: Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    compact?: boolean;
    variant?: 'pill' | 'bar';
    t: any;
    className?: string;
}

const TaskTimer: React.FC<TaskTimerProps> = ({ task, updateTask, compact, variant = 'pill', t, className }) => {
    const [displayTime, setDisplayTime] = useState(task.actualTime || 0);

    // Effect to handle live ticking
    useEffect(() => {
        if (!task.isTimerRunning || !task.timerStartTime) {
            setDisplayTime(task.actualTime || 0);
            return;
        }

        const intervalId = setInterval(() => {
            const now = Date.now();
            const elapsedHours = (now - task.timerStartTime!) / (1000 * 60 * 60);
            setDisplayTime((task.actualTime || 0) + elapsedHours);
        }, 1000); // Update every second

        return () => clearInterval(intervalId);
    }, [task.isTimerRunning, task.actualTime, task.timerStartTime]);

    const handleToggleTimer = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.isTimerRunning) {
            // Stop logic
            const now = Date.now();
            const elapsedHours = (now - (task.timerStartTime || now)) / (1000 * 60 * 60);
            const newActual = (task.actualTime || 0) + elapsedHours;

            updateTask(task.id, {
                isTimerRunning: false,
                timerStartTime: undefined,
                actualTime: parseFloat(newActual.toFixed(4)) // Save with precision
            });
        } else {
            // Start logic
            updateTask(task.id, {
                isTimerRunning: true,
                timerStartTime: Date.now()
            });
        }
    };

    // Calculations
    const estimated = task.estimatedTime || 0;
    const hasEstimate = estimated > 0;
    const progressPercent = hasEstimate ? Math.min(100, (displayTime / estimated) * 100) : 0;
    const isOverBudget = hasEstimate && displayTime > estimated;

    // Bar Variant (for details/modal)
    if (variant === 'bar') {
        let statusColor = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
        let barColor = "bg-primary-500";

        if (isOverBudget) {
            statusColor = "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            barColor = "bg-red-500";
        } else if (progressPercent > 80) {
            statusColor = "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
            barColor = "bg-orange-500";
        } else {
            statusColor = "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            barColor = "bg-green-500";
        }

        const percentageDisplay = hasEstimate ? Math.round((displayTime / estimated) * 100) : 0;

        return (
            <div className={`w-full rounded-lg p-3 border border-transparent ${task.isTimerRunning ? 'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/10' : 'bg-gray-50 dark:bg-gray-800/50'} ${className || ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleToggleTimer}
                            className={`w-12 h-12 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${task.isTimerRunning
                                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                                : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                            title={task.isTimerRunning ? t.stopTimer : t.startTimer}
                        >
                            <span className="material-symbols-outlined text-[24px] md:text-[20px]">
                                {task.isTimerRunning ? 'stop' : 'play_arrow'}
                            </span>
                        </button>
                        <div className="flex flex-col">
                            <div className={`px-2 py-0.5 rounded-md transition-colors ${task.isTimerRunning ? 'bg-red-100 dark:bg-red-500/20 animate-pulse' : ''}`}>
                                <span className={`text-sm font-bold font-mono ${isOverBudget ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                    {formatDuration(displayTime)}
                                </span>
                            </div>
                            {hasEstimate && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    of {estimated}h estimated
                                </span>
                            )}
                        </div>
                    </div>
                    {hasEstimate && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${statusColor}`}>
                            {percentageDisplay}%
                        </span>
                    )}
                </div>
                {/* Progress Bar */}
                {hasEstimate && (
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-linear ${barColor} ${task.isTimerRunning ? 'animate-[pulse_2s_infinite]' : ''}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Default Pill Variant (Enhanced for List/Table - Mobile Optimized)
    return (
        <div
            className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-300 group
                ${task.isTimerRunning
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900 shadow-[0_0_10px_rgba(239,68,68,0.2)] ring-1 ring-red-100 dark:ring-red-900/30'
                    : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 shadow-sm'} 
                ${className || ''}`}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={handleToggleTimer}
                className={`flex-shrink-0 w-10 h-10 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${task.isTimerRunning
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-md'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white border border-indigo-100 dark:border-indigo-800 hover:border-transparent'
                    }`}
                title={task.isTimerRunning ? t.stopTimer : t.startTimer}
            >
                <span className="material-symbols-outlined text-[24px] md:text-[18px] fill-current">
                    {task.isTimerRunning ? 'stop' : 'play_arrow'}
                </span>
            </button>

            <div className="flex flex-col justify-center min-w-[60px]">
                <div className="flex items-center gap-1">
                    <div className={`px-1.5 py-0.5 rounded transition-colors ${task.isTimerRunning ? 'bg-red-100 dark:bg-red-500/20 animate-pulse' : ''}`}>
                        <span className={`text-xs font-bold tabular-nums leading-tight font-mono ${task.isTimerRunning ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'}`}>
                            {formatDuration(displayTime)}
                        </span>
                    </div>
                    {hasEstimate && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium hidden sm:inline">
                            / {estimated}h
                        </span>
                    )}
                </div>
                {hasEstimate && !compact && (
                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-0.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-indigo-500'}`}
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- View Definitions ---

interface ViewProps {
    tasks: Task[];
    t: any;
    currency: Currency;
    updateTask: (id: string, updates: Partial<Task>) => void;
    onTaskClick: (task: Task) => void;
    onDeleteClick: (task: Task) => void;
    onEditClick: (task: Task) => void;
    onPlayTTS: (task: Task) => void;
    readingTaskId: string | null;
    loadingTaskId: string | null;
}

const TTSButton: React.FC<{
    task: Task;
    isPlaying: boolean;
    isLoading: boolean;
    onClick: (e: React.MouseEvent) => void;
}> = ({ task, isPlaying, isLoading, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`p-3 md:p-1.5 rounded-full transition-all ${isPlaying
            ? 'bg-primary-100 text-primary-600 animate-pulse'
            : isLoading
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100'
            }`}
        title="Read task aloud"
    >
        <span className="material-symbols-outlined text-[24px] md:text-[18px]">
            {isPlaying ? 'stop_circle' : isLoading ? 'downloading' : 'text_to_speech'}
        </span>
    </button>
);

const ListView: React.FC<ViewProps> = ({ tasks, t, updateTask, onDeleteClick, onEditClick, onPlayTTS, readingTaskId, loadingTaskId }) => (
    <div className="space-y-3">
        {tasks.map(task => {
            const dueStatus = getDueDateStatus(task);
            return (
                <div key={task.id} className="group bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in" onClick={() => onEditClick(task)}>
                    <div className="flex items-center gap-4 w-full sm:flex-1 min-w-0">
                        {/* Status Checkbox */}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: task.status === Status.COMPLETED ? Status.NOT_STARTED : Status.COMPLETED, completedAt: task.status !== Status.COMPLETED ? new Date().toISOString().split('T')[0] : undefined }); }}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === Status.COMPLETED ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'}`}
                        >
                            {task.status === Status.COMPLETED && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className={`text-base font-semibold truncate ${task.status === Status.COMPLETED ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</h4>
                                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${task.priority === Priority.HIGH ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    task.priority === Priority.MEDIUM ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    }`}>{t.priorityVal[task.priority]}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className={`flex items-center gap-1 ${dueStatus.className}`}>
                                    <span className="material-symbols-outlined text-sm">{dueStatus.icon}</span>
                                    {task.dueDate}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                    {task.assignee}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        {/* Timer */}
                        <div className="flex-1 sm:flex-none">
                            <TaskTimer task={task} updateTask={updateTask} t={t} className="w-full sm:w-auto" />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <TTSButton
                                task={task}
                                isPlaying={readingTaskId === task.id}
                                isLoading={loadingTaskId === task.id}
                                onClick={(e) => { e.stopPropagation(); onPlayTTS(task); }}
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteClick(task);
                                }}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        })}
        {tasks.length === 0 && <div className="text-center py-10 text-gray-500 dark:text-gray-400 italic">{t.noTasks}</div>}
    </div>
);

// ... (KanbanView, TableView, EisenhowerMatrixView, CalendarView remain unchanged)
const KanbanView: React.FC<ViewProps> = ({ tasks, t, updateTask, onEditClick, onPlayTTS, readingTaskId, loadingTaskId }) => {
    const columns = Object.values(Status);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);

    // Define specific colors for each status column
    const getStatusColors = (status: Status) => {
        switch (status) {
            case Status.NOT_STARTED: return { border: 'border-l-gray-400', headerText: 'text-gray-600 dark:text-gray-400' };
            case Status.IN_PROGRESS: return { border: 'border-l-blue-500', headerText: 'text-blue-600 dark:text-blue-400' };
            case Status.COMPLETED: return { border: 'border-l-green-500', headerText: 'text-green-600 dark:text-green-400' };
            case Status.DEFERRED: return { border: 'border-l-red-500', headerText: 'text-red-600 dark:text-red-400' };
            default: return { border: 'border-l-gray-200', headerText: 'text-gray-600' };
        }
    }

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, status: Status) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverColumn !== status) {
            setDragOverColumn(status);
        }
    };

    const handleDrop = (e: React.DragEvent, newStatus: Status) => {
        e.preventDefault();
        setDragOverColumn(null);
        setDraggedTaskId(null);
        const taskId = e.dataTransfer.getData('text/plain');

        if (taskId) {
            // Find task to verify it exists and status is different
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== newStatus) {
                const updates: Partial<Task> = { status: newStatus };
                // If moving to Completed, set completedAt
                if (newStatus === Status.COMPLETED && task.status !== Status.COMPLETED) {
                    updates.completedAt = new Date().toISOString().split('T')[0];
                }
                // If moving from Completed, clear completedAt (optional logic)
                if (task.status === Status.COMPLETED && newStatus !== Status.COMPLETED) {
                    updates.completedAt = undefined;
                }
                updateTask(taskId, updates);
            }
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[500px]">
            {columns.map(status => {
                const colors = getStatusColors(status);
                const columnTasks = tasks.filter(t => t.status === status);
                const isOver = dragOverColumn === status;

                return (
                    <div
                        key={status}
                        className={`flex-1 min-w-[280px] rounded-xl p-4 flex flex-col transition-colors duration-200 ${isOver
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-300 dark:border-primary-700 border-dashed'
                            : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent'
                            }`}
                        onDragOver={(e) => handleDragOver(e, status)}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`font-bold ${colors.headerText}`}>{t.statusVal[status]}</h3>
                            <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full font-mono">
                                {columnTasks.length}
                            </span>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                            {columnTasks.map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onClick={() => onEditClick(task)}
                                    className={`bg-white dark:bg-surface-dark p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4 ${colors.border} ${draggedTaskId === task.id ? 'opacity-50 scale-95' : 'opacity-100'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 flex-1 pointer-events-none">{task.title}</p>
                                        <div onClick={e => e.stopPropagation()}>
                                            <TTSButton
                                                task={task}
                                                isPlaying={readingTaskId === task.id}
                                                isLoading={loadingTaskId === task.id}
                                                onClick={(e) => { e.stopPropagation(); onPlayTTS(task); }}
                                            />
                                        </div>
                                    </div>

                                    {/* Timer Integration for Kanban */}
                                    <div className="mb-2">
                                        <TaskTimer task={task} updateTask={updateTask} t={t} compact variant="pill" className="w-full justify-between" />
                                    </div>

                                    <div className="flex justify-between items-center pointer-events-none">
                                        {/* Since we use border color for status, we add a small badge for High Priority to not lose info */}
                                        {task.priority === Priority.HIGH && (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded dark:bg-red-900/30 dark:text-red-400 mr-2">
                                                {t.priorityVal[Priority.HIGH].toUpperCase()}
                                            </span>
                                        )}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getDueDateStatus(task).className} bg-opacity-10 bg-gray-500`}>
                                            {task.dueDate}
                                        </span>
                                        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs flex items-center justify-center font-bold">
                                            {task.assignee}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {columnTasks.length === 0 && (
                                <div className="h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xs italic pointer-events-none">
                                    {t.dropTasks}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const TableView: React.FC<ViewProps> = ({ tasks, t, updateTask, onEditClick, onDeleteClick, currency, onPlayTTS, readingTaskId, loadingTaskId }) => (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase font-medium text-xs">
                <tr>
                    <th className="px-4 py-3">{t.title}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{t.status}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{t.priority}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{t.dueDate}</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">{t.time}</th>
                    <th className="px-4 py-3 text-right"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tasks.map(task => (
                    <tr key={task.id} onClick={() => onEditClick(task)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white min-w-[200px]">{task.title}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${task.status === Status.COMPLETED ? 'bg-green-100 text-green-700' :
                                task.status === Status.IN_PROGRESS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {t.statusVal[task.status]}
                            </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${task.priority === Priority.HIGH ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {t.priorityVal[task.priority]}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{task.dueDate}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                            <TaskTimer task={task} updateTask={updateTask} compact t={t} variant="pill" />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                            {/* Simplified actions container - removed outer click handler to avoid conflicts */}
                            <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <TTSButton
                                    task={task}
                                    isPlaying={readingTaskId === task.id}
                                    isLoading={loadingTaskId === task.id}
                                    onClick={(e) => { e.stopPropagation(); onPlayTTS(task); }}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteClick(task);
                                    }}
                                    className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors z-10 relative"
                                    title={t.delete}
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const EisenhowerMatrixView: React.FC<ViewProps & { updateTask: (id: string, updates: Partial<Task>) => void }> = ({ tasks, t, onEditClick, onPlayTTS, readingTaskId, loadingTaskId, updateTask }) => {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverQuad, setDragOverQuad] = useState<number | null>(null);

    const quadrants = [
        { id: 0, title: t.matrix.doFirst, subtitle: `${t.matrix.urgent}, ${t.matrix.important}`, isUrgent: true, isImportant: true, filter: (t: Task) => t.isUrgent && t.isImportant, color: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900' },
        { id: 1, title: t.matrix.schedule, subtitle: `${t.matrix.notUrgent}, ${t.matrix.important}`, isUrgent: false, isImportant: true, filter: (t: Task) => !t.isUrgent && t.isImportant, color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900' },
        { id: 2, title: t.matrix.delegate, subtitle: `${t.matrix.urgent}, ${t.matrix.notImportant}`, isUrgent: true, isImportant: false, filter: (t: Task) => t.isUrgent && !t.isImportant, color: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900' },
        { id: 3, title: t.matrix.delete, subtitle: `${t.matrix.notUrgent}, ${t.matrix.notImportant}`, isUrgent: false, isImportant: false, filter: (t: Task) => !t.isUrgent && !t.isImportant, color: 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800' },
    ];

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, quadId: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverQuad !== quadId) {
            setDragOverQuad(quadId);
        }
    };

    const handleDrop = (e: React.DragEvent, quadId: number) => {
        e.preventDefault();
        setDragOverQuad(null);
        setDraggedTaskId(null);
        const taskId = e.dataTransfer.getData('text/plain');

        if (taskId) {
            const targetQuad = quadrants.find(q => q.id === quadId);
            const task = tasks.find(t => t.id === taskId);

            if (targetQuad && task) {
                // Check if values actually changed to avoid unnecessary updates
                if (task.isUrgent !== targetQuad.isUrgent || task.isImportant !== targetQuad.isImportant) {
                    updateTask(taskId, {
                        isUrgent: targetQuad.isUrgent,
                        isImportant: targetQuad.isImportant
                    });
                }
            }
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[600px]">
            {quadrants.map((quad) => {
                const isOver = dragOverQuad === quad.id;
                return (
                    <div
                        key={quad.id}
                        className={`rounded-xl border p-4 flex flex-col transition-all duration-200 ${quad.color} ${isOver ? 'ring-2 ring-primary-500 scale-[1.01] shadow-lg' : ''}`}
                        onDragOver={(e) => handleDragOver(e, quad.id)}
                        onDrop={(e) => handleDrop(e, quad.id)}
                    >
                        <div className="mb-3 pointer-events-none">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{quad.title}</h3>
                            <p className="text-xs text-gray-500 uppercase font-semibold">{quad.subtitle}</p>
                        </div>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                            {tasks.filter(quad.filter).map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onClick={() => onEditClick(task)}
                                    className={`bg-white dark:bg-surface-dark p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow hover:-translate-y-0.5 transition-all border border-transparent dark:border-gray-700 ${draggedTaskId === task.id ? 'opacity-50' : 'opacity-100'}`}
                                >
                                    <div className="flex justify-between items-start pointer-events-none">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">{task.title}</p>
                                        <div onClick={e => e.stopPropagation()} className="pointer-events-auto">
                                            <TTSButton
                                                task={task}
                                                isPlaying={readingTaskId === task.id}
                                                isLoading={loadingTaskId === task.id}
                                                onClick={(e) => { e.stopPropagation(); onPlayTTS(task); }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between mt-2 text-xs text-gray-400 pointer-events-none">
                                        <span>{task.dueDate}</span>
                                        <span className={`font-bold ${task.status === Status.COMPLETED ? 'text-green-500' : 'text-primary-500'}`}>{t.statusVal[task.status]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const CalendarView: React.FC<ViewProps & { language: string }> = ({ tasks, t, onEditClick, language, onPlayTTS, readingTaskId, loadingTaskId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calViewMode, setCalViewMode] = useState<'month' | 'week' | 'day'>('day');

    // Helper to properly format local date string YYYY-MM-DD
    const toDateStr = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const handlePrev = () => {
        const d = new Date(currentDate);
        if (calViewMode === 'month') {
            d.setMonth(d.getMonth() - 1);
        } else if (calViewMode === 'week') {
            d.setDate(d.getDate() - 7);
        } else {
            d.setDate(d.getDate() - 1);
        }
        setCurrentDate(d);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (calViewMode === 'month') {
            d.setMonth(d.getMonth() + 1);
        } else if (calViewMode === 'week') {
            d.setDate(d.getDate() + 7);
        } else {
            d.setDate(d.getDate() + 1);
        }
        setCurrentDate(d);
    };

    // Label formatting - Using standardized locale logic from app state
    const localeStr = getLocale(language as any);

    let headerLabel = '';
    if (calViewMode === 'month') {
        headerLabel = currentDate.toLocaleString(localeStr, { month: 'long', year: 'numeric' });
    } else if (calViewMode === 'week') {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const fmt = { month: 'short', day: 'numeric' } as const;
        headerLabel = `${startOfWeek.toLocaleDateString(localeStr, fmt)} - ${endOfWeek.toLocaleDateString(localeStr, fmt)}`;
    } else {
        headerLabel = currentDate.toLocaleDateString(localeStr, { weekday: 'long', month: 'long', day: 'numeric' });
    }

    // Use translations for days to ensure correct language
    const daysShort = t.daysShort;

    const renderMonth = () => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);

        return (
            <div className="overflow-x-auto pb-2 h-full">
                <div className="min-w-[700px] h-full flex flex-col">
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-bold text-gray-500">
                        {daysShort.map((d: string) => <div key={d} className="capitalize">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                        {days.map((day, idx) => {
                            if (!day) return <div key={idx} className="bg-gray-50/50 dark:bg-gray-800/20 rounded-lg"></div>;
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayTasks = tasks.filter(t => t.dueDate === dateStr);

                            return (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg p-1 overflow-y-auto min-h-[100px]">
                                    <div className={`text-xs font-bold mb-1 ml-1 ${dateStr === toDateStr(new Date()) ? 'text-primary-600' : 'text-gray-500'}`}>{day}</div>
                                    <div className="space-y-1">
                                        {dayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => onEditClick(task)}
                                                className={`text-[10px] p-1 rounded cursor-pointer truncate group relative ${task.priority === Priority.HIGH ? 'bg-red-100 text-red-700' :
                                                    task.status === Status.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                    }`}
                                            >
                                                {task.title}
                                                <div className="hidden group-hover:block absolute right-0 top-0 bottom-0 bg-inherit px-1" onClick={e => e.stopPropagation()}>
                                                    <TTSButton
                                                        task={task}
                                                        isPlaying={readingTaskId === task.id}
                                                        isLoading={loadingTaskId === task.id}
                                                        onClick={(e) => { e.stopPropagation(); onPlayTTS(task); }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderWeek = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            weekDays.push(d);
        }

        return (
            <div className="overflow-x-auto pb-2 h-full">
                <div className="min-w-[700px] h-full flex flex-col">
                    <div className="grid grid-cols-7 gap-2 h-full">
                        {weekDays.map((date, idx) => {
                            const dateStr = toDateStr(date);
                            const dayTasks = tasks.filter(t => t.dueDate === dateStr);
                            const isToday = dateStr === toDateStr(new Date());

                            return (
                                <div key={idx} className={`flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg p-2 ${isToday ? 'ring-2 ring-primary-500 ring-inset' : ''}`}>
                                    <div className="text-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <div className="text-xs font-semibold text-gray-500 uppercase">{date.toLocaleDateString(localeStr, { weekday: 'short' })}</div>
                                        <div className={`text-lg font-bold ${isToday ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2">
                                        {dayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => onEditClick(task)}
                                                className={`text-xs p-2 rounded cursor-pointer group relative border transition-shadow hover:shadow-sm ${task.status === Status.COMPLETED ? 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 line-through decoration-green-700/50' :
                                                    'bg-white border-gray-200 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
                                                    }`}
                                            >
                                                <div className="font-medium truncate mb-1">{task.title}</div>
                                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                                    <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${task.priority === Priority.HIGH ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {task.priority.substr(0, 1)}
                                                    </span>
                                                </div>
                                                <div className="hidden group-hover:block absolute right-1 top-1" onClick={e => e.stopPropagation()}>
                                                    <TTSButton
                                                        task={task}
                                                        isPlaying={readingTaskId === task.id}
                                                        isLoading={loadingTaskId === task.id}
                                                        onClick={(e) => { e.stopPropagation(); onPlayTTS(task); }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderDay = () => {
        const dateStr = toDateStr(currentDate);
        const dayTasks = tasks.filter(t => t.dueDate === dateStr);
        const isToday = dateStr === toDateStr(new Date());

        return (
            <div className="h-full flex flex-col max-w-3xl mx-auto w-full p-4">
                <div className="flex items-center gap-6 mb-6 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl ${isToday ? 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/30' : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'}`}>
                        <span className="text-sm uppercase font-bold tracking-wider opacity-90">{currentDate.toLocaleDateString(localeStr, { weekday: 'short' })}</span>
                        <span className="text-4xl font-extrabold">{currentDate.getDate()}</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{currentDate.toLocaleDateString(localeStr, { month: 'long', year: 'numeric' })}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'} scheduled</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {dayTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <span className="material-symbols-outlined text-5xl mb-3 opacity-50">event_available</span>
                            <p className="font-medium">{t.noTasks}</p>
                            <button onClick={() => {
                                // Optional: trigger add task modal with this date prefills
                            }} className="mt-4 text-primary-600 hover:underline text-sm hidden">Add a task for today</button>
                        </div>
                    ) : (
                        dayTasks.map(task => (
                            <div key={task.id} onClick={() => onEditClick(task)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex items-center gap-4 cursor-pointer group">
                                <div className={`w-1.5 h-12 rounded-full ${task.priority === Priority.HIGH ? 'bg-red-500' : task.priority === Priority.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'}`}></div>

                                <button className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.status === Status.COMPLETED ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {task.status === Status.COMPLETED && <span className="material-symbols-outlined text-white text-xs font-bold">check</span>}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`text-base font-semibold truncate ${task.status === Status.COMPLETED ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</h4>
                                        {task.isUrgent && <span className="material-symbols-outlined text-red-500 text-sm" title="Urgent">local_fire_department</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{task.description}</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{task.estimatedTime ? `${task.estimatedTime}h` : '--'}</div>
                                    </div>
                                    <div onClick={e => e.stopPropagation()}>
                                        <TTSButton
                                            task={task}
                                            isPlaying={readingTaskId === task.id}
                                            isLoading={loadingTaskId === task.id}
                                            onClick={(e) => { e.stopPropagation(); onPlayTTS(task); }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                    <span className="text-lg font-bold text-gray-900 dark:text-white ml-2 capitalize">{headerLabel}</span>
                    <button onClick={() => setCurrentDate(new Date())} className="ml-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                        {t.today}
                    </button>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setCalViewMode(m)}
                            className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${calViewMode === m ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            {t.timeRange[m]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-2 relative">
                {calViewMode === 'month' && renderMonth()}
                {calViewMode === 'week' && renderWeek()}
                {calViewMode === 'day' && renderDay()}
            </div>
        </div>
    );
};

export const TaskModule: React.FC = () => {
    const { tasks, addTask, updateTask, deleteTask, language, currency, addLog } = useContext(AppContext);
    const t = TRANSLATIONS[language];
    const localeStr = getLocale(language);

    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [showCompleted, setShowCompleted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [readingTaskId, setReadingTaskId] = useState<string | null>(null);
    const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

    // Audio context for TTS
    const audioContextRef = useRef<AudioContext | null>(null);
    // Ref to hold the utterance to prevent garbage collection which causes silence in some browsers
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Cleanup audio on unmount & load voices
    useEffect(() => {
        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                setAvailableVoices(window.speechSynthesis.getVoices());
            }
        };

        loadVoices();

        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Filter Logic
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = showCompleted ? true : task.status !== Status.COMPLETED;
        return matchesSearch && matchesStatus;
    });

    const handleEditClick = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (task: Task) => {
        const isSpanish = language === 'es';
        const taskTitle = task.title || (isSpanish ? 'Sin título' : 'Untitled');

        const confirmMsg = isSpanish
            ? `¿Estás seguro de que quieres borrar la tarea: "${taskTitle}"?`
            : `Are you sure you want to delete the task: "${taskTitle}"?`;

        setTimeout(() => {
            if (window.confirm(confirmMsg)) {
                deleteTask(task.id);
            }
        }, 10);
    };

    const handleSaveTask = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const taskData: any = {
            title: formData.get('title') as string,
            status: formData.get('status') as Status,
            priority: formData.get('priority') as Priority,
            dueDate: formData.get('dueDate') as string,
            assignee: formData.get('assignee') as string,
            description: formData.get('description') as string,
            estimatedTime: parseFloat(formData.get('estimatedTime') as string) || 0,
            estimatedCost: parseFloat(formData.get('estimatedCost') as string) || 0,
            isUrgent: formData.get('isUrgent') === 'on',
            isImportant: formData.get('isImportant') === 'on',
        };

        if (editingTask) {
            taskData.actualTime = parseFloat(formData.get('actualTime') as string) || 0;
            taskData.actualCost = parseFloat(formData.get('actualCost') as string) || 0;
            updateTask(editingTask.id, taskData);
        } else {
            addTask({
                ...taskData,
                currency: currency, // Default to current currency
                actualTime: 0,
                actualCost: 0
            });
        }
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handlePlayTTS = async (task: Task) => {
        if (readingTaskId) {
            // Stop logic
            if (audioContextRef.current) {
                try { await audioContextRef.current.close(); } catch (e) { }
                audioContextRef.current = null;
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            // Clear ref to release memory
            utteranceRef.current = null;

            setReadingTaskId(null);
            // If clicking the same task that is playing, just stop.
            if (readingTaskId === task.id) return;
        }

        setLoadingTaskId(task.id);

        // Construct a natural sentence using localized formatting
        let dateSpoken = task.dueDate;
        try {
            if (task.dueDate) {
                const [y, m, d] = task.dueDate.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                dateSpoken = dateObj.toLocaleDateString(localeStr, { weekday: 'long', month: 'long', day: 'numeric' });
            }
        } catch (e) { }

        const priorityText = t.priorityVal[task.priority];
        const ts = t.ttsStructure;

        // "Task: Title. Priority High. Due on Monday..." vs "Tarea: Título. Prioridad Alta. Vence el Lunes..."
        const textToSay = `${ts.prefix} ${task.title}. ${ts.priority} ${priorityText}. ${ts.due} ${dateSpoken}. ${ts.desc} ${task.description}`;

        try {
            const apiKey = process.env.API_KEY || '';
            if (!apiKey) throw new Error("API_KEY_MISSING");

            const ai = new GoogleGenAI({ apiKey });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: [{ parts: [{ text: textToSay }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' }
                        }
                    }
                }
            });

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) throw new Error("NO_AUDIO_DATA");

            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;

            // Resume context if suspended (common in some browsers)
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const buffer = await decodeAudioData(
                base64ToUint8Array(audioData),
                ctx
            );

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => {
                setReadingTaskId(null);
                audioContextRef.current = null;
            };
            source.start();
            setReadingTaskId(task.id);

        } catch (error) {
            console.warn("Gemini TTS failed, falling back to Web Speech API", error);
            addLog('warning', 'VoiceAI', 'Gemini TTS failed, using system voice', error);

            // Fallback to Web Speech API
            if ('speechSynthesis' in window) {
                // Ensure we cancel any previous
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(textToSay);
                utterance.lang = language === 'es' ? 'es-MX' : 'en-US';

                // Try to select a good voice
                const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
                // Prefer Google voices if available as they are usually higher quality
                const preferredVoice = voices.find(v => v.lang.startsWith(utterance.lang) && v.name.includes('Google')) ||
                    voices.find(v => v.lang.startsWith(utterance.lang));

                if (preferredVoice) utterance.voice = preferredVoice;

                utterance.onend = () => {
                    setReadingTaskId(null);
                    utteranceRef.current = null;
                };
                utterance.onerror = (e) => {
                    console.error("SpeechSynthesis Error", e);
                    setReadingTaskId(null);
                    setLoadingTaskId(null);
                    utteranceRef.current = null;
                };

                // CRITICAL: Store in ref to prevent Garbage Collection which stops audio prematurely in Chrome
                utteranceRef.current = utterance;

                setReadingTaskId(task.id);
                window.speechSynthesis.speak(utterance);
            } else {
                alert("Text-to-Speech not supported.");
                setLoadingTaskId(null);
            }
        } finally {
            // We only want to clear loading state here.
            // If reading started, readingTaskId is already set, so UI updates to 'Stop' button.
            setLoadingTaskId(null);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col animate-fade-in">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {(['list', 'board', 'calendar', 'table', 'matrix', 'kpi'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${viewMode === mode
                                ? 'bg-primary-600 text-white shadow-md'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {mode === 'list' ? 'list' :
                                    mode === 'board' ? 'view_kanban' :
                                        mode === 'calendar' ? 'calendar_month' :
                                            mode === 'table' ? 'table_view' :
                                                mode === 'matrix' ? 'grid_view' : 'bar_chart'}
                            </span>
                            {t.view[mode]}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* Show/Hide Completed Button */}
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border
                            ${showCompleted
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                : 'bg-white text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 hover:text-gray-600'}
                        `}
                        title={showCompleted ? t.hideCompleted : t.showCompleted}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {showCompleted ? 'check_circle' : 'visibility_off'}
                        </span>
                        <span className="hidden xl:inline">
                            {t.showCompleted}
                        </span>
                    </button>

                    <div className="relative flex-1 md:flex-none">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder={t.search}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full md:w-64 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-bold shadow-sm transition-transform active:scale-95 whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined">add</span>
                        <span className="hidden sm:inline">{t.addTaskShort}</span>
                    </button>
                </div>
            </div>

            {/* View Content */}
            <div className="flex-1 min-h-0 relative">
                {viewMode === 'kpi' ? (
                    <KpiModule />
                ) : (
                    <>
                        {viewMode === 'list' && <ListView tasks={filteredTasks} t={t} currency={currency} updateTask={updateTask} onTaskClick={handleEditClick} onDeleteClick={handleDeleteClick} onEditClick={handleEditClick} onPlayTTS={handlePlayTTS} readingTaskId={readingTaskId} loadingTaskId={loadingTaskId} />}
                        {viewMode === 'board' && <KanbanView tasks={filteredTasks} t={t} currency={currency} updateTask={updateTask} onTaskClick={handleEditClick} onDeleteClick={handleDeleteClick} onEditClick={handleEditClick} onPlayTTS={handlePlayTTS} readingTaskId={readingTaskId} loadingTaskId={loadingTaskId} />}
                        {viewMode === 'table' && <TableView tasks={filteredTasks} t={t} currency={currency} updateTask={updateTask} onTaskClick={handleEditClick} onDeleteClick={handleDeleteClick} onEditClick={handleEditClick} onPlayTTS={handlePlayTTS} readingTaskId={readingTaskId} loadingTaskId={loadingTaskId} />}
                        {viewMode === 'matrix' && <EisenhowerMatrixView tasks={filteredTasks} t={t} currency={currency} updateTask={updateTask} onTaskClick={handleEditClick} onDeleteClick={handleDeleteClick} onEditClick={handleEditClick} onPlayTTS={handlePlayTTS} readingTaskId={readingTaskId} loadingTaskId={loadingTaskId} />}
                        {viewMode === 'calendar' && <CalendarView tasks={filteredTasks} t={t} currency={currency} updateTask={updateTask} onTaskClick={handleEditClick} onDeleteClick={handleDeleteClick} onEditClick={handleEditClick} onPlayTTS={handlePlayTTS} readingTaskId={readingTaskId} loadingTaskId={loadingTaskId} language={language} />}
                    </>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-surface-dark w-full md:max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingTask ? t.editTask : t.newTask}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.title}</label>
                                <input name="title" required defaultValue={editingTask?.title} placeholder={t.taskTitlePlaceholder} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.status}</label>
                                    <select name="status" defaultValue={editingTask?.status || Status.NOT_STARTED} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none">
                                        {Object.values(Status).map(s => <option key={s} value={s}>{t.statusVal[s]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.priority}</label>
                                    <select name="priority" defaultValue={editingTask?.priority || Priority.MEDIUM} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none">
                                        {Object.values(Priority).map(p => <option key={p} value={p}>{t.priorityVal[p]}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.dueDate}</label>
                                    <input type="date" name="dueDate" required defaultValue={editingTask?.dueDate || new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.assignee}</label>
                                    <input name="assignee" defaultValue={editingTask?.assignee || 'Me'} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.description}</label>
                                <textarea name="description" rows={3} defaultValue={editingTask?.description} placeholder={t.addDetails} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none resize-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.estTime}</label>
                                    <input type="number" step="0.5" name="estimatedTime" defaultValue={editingTask?.estimatedTime} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.estCost}</label>
                                    <input type="number" step="10" name="estimatedCost" defaultValue={editingTask?.estimatedCost} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none" />
                                </div>
                            </div>

                            {editingTask && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.actTime}</label>
                                        <input type="number" step="0.5" name="actualTime" defaultValue={editingTask?.actualTime} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.actCost}</label>
                                        <input type="number" step="10" name="actualCost" defaultValue={editingTask?.actualCost} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 outline-none" />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="isUrgent" defaultChecked={editingTask?.isUrgent} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.matrix.urgent}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="isImportant" defaultChecked={editingTask?.isImportant} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.matrix.important}</span>
                                </label>
                            </div>

                            {editingTask && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <TaskTimer task={editingTask} updateTask={updateTask} t={t} variant="bar" />
                                </div>
                            )}

                        </form>

                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 flex-shrink-0 mb-safe">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">{t.cancel}</button>
                            <button onClick={(e) => { e.preventDefault(); (document.querySelector('form') as HTMLFormElement).requestSubmit(); }} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-bold shadow-md transition-all active:scale-95">{t.save}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};