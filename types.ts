
export enum Priority {
    HIGH = 'High',
    MEDIUM = 'Medium',
    LOW = 'Low'
}

export enum Status {
    NOT_STARTED = 'Not Started',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    DEFERRED = 'Deferred'
}

export enum Currency {
    USD = 'USD',
    MXN = 'MXN'
}

export enum Language {
    ES = 'es',
    EN = 'en'
}

export interface Comment {
    id: string;
    text: string;
    author: string; // User name
    createdAt: string; // ISO Date string
    avatar?: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    status: Status;
    dueDate: string; // ISO Date string
    assignee: string; // Avatar URL or initials
    relatedTo?: string; // Account or Contact name
    estimatedCost?: number;
    actualCost?: number;
    currency?: Currency;
    estimatedTime?: number; // Hours
    actualTime?: number; // Hours
    isUrgent?: boolean;
    isImportant?: boolean;
    // New fields for timer functionality
    isTimerRunning?: boolean;
    timerStartTime?: number; // Timestamp
    completedAt?: string; // ISO Date string
    comments?: Comment[];
}

export interface User {
    name: string;
    email: string;
    avatar: string;
    role: string;
    department: string;
    bio: string;
}

export type ViewMode = 'list' | 'board' | 'calendar' | 'table' | 'matrix' | 'kpi';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'alert' | 'info' | 'success';
    isRead: boolean;
    timestamp: Date;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'success';
    category: 'System' | 'VoiceAI' | 'Task' | 'Network';
    message: string;
    details?: any;
}

export interface AppContextType {
    user: User | null;
    login: () => void;
    logout: () => void;
    darkMode: boolean;
    toggleDarkMode: () => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    currency: Currency;
    setCurrency: (curr: Currency) => void;
    tasks: Task[];
    addTask: (task: Omit<Task, 'id'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    currentRoute: string;
    setRoute: (route: string) => void;
    // Notification props
    notifications: AppNotification[];
    markAllRead: () => void;
    clearNotifications: () => void;
    // Logging props
    logs: LogEntry[];
    addLog: (level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any) => void;
    clearLogs: () => void;
}