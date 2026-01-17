import { Task, Priority, Status, Currency, User, Language } from './types';

// Helper for dynamic dates to ensure charts always have data relative to "today"
const getRelativeDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

// Helper to get locale string for Intl formatters
export const getLocale = (lang: Language): string => {
    return lang === Language.ES ? 'es-MX' : 'en-US';
};

export const MOCK_USER: User = {
    name: "Valentina Ramírez",
    email: "valentina@trantor.mx",
    avatar: "https://ui-avatars.com/api/?name=Valentina+Ramirez&background=0D8ABC&color=fff",
    role: "Gerente de Producto",
    department: "Desarrollo",
    bio: "Apasionada por crear experiencias de usuario intuitivas y eficientes. Liderando la transformación digital en Trantor."
};

export const INITIAL_TASKS: Task[] = [
    {
        id: '1',
        title: 'Diseño de Interfaz Móvil',
        description: 'Finalizar los prototipos de alta fidelidad para la versión móvil de la aplicación.',
        priority: Priority.HIGH,
        status: Status.IN_PROGRESS,
        dueDate: getRelativeDate(2), // Due in 2 days
        assignee: 'VR',
        relatedTo: 'Proyecto Alpha',
        estimatedCost: 15000,
        actualCost: 5000,
        currency: Currency.MXN,
        estimatedTime: 12,
        actualTime: 6.5,
        isUrgent: true,
        isImportant: true,
        comments: [
            {
                id: 'c1',
                text: 'Recuerda revisar las guías de accesibilidad para los colores.',
                author: 'Carlos Director',
                createdAt: getRelativeDate(-1) + 'T09:30:00',
                avatar: 'CD'
            }
        ]
    },
    {
        id: '2',
        title: 'Revisión de Presupuesto Q4',
        description: 'Analizar gastos del trimestre anterior y ajustar proyecciones para el cierre de año.',
        priority: Priority.HIGH,
        status: Status.NOT_STARTED,
        dueDate: getRelativeDate(5),
        assignee: 'VR',
        relatedTo: 'Finanzas',
        estimatedCost: 0,
        currency: Currency.MXN,
        estimatedTime: 4,
        actualTime: 0,
        isUrgent: false,
        isImportant: true
    },
    {
        id: '3',
        title: 'Actualización de API de Pagos',
        description: 'Implementar la nueva pasarela de pagos para soportar multicurrency nativo.',
        priority: Priority.MEDIUM,
        status: Status.COMPLETED,
        dueDate: getRelativeDate(-1),
        assignee: 'JP',
        estimatedCost: 800,
        actualCost: 850,
        currency: Currency.USD,
        estimatedTime: 8,
        actualTime: 7.5,
        isUrgent: true,
        isImportant: false,
        completedAt: getRelativeDate(-1)
    },
    {
        id: '4',
        title: 'Capacitación de Personal Nuevo',
        description: 'Onboarding para los 3 nuevos desarrolladores frontend.',
        priority: Priority.LOW,
        status: Status.IN_PROGRESS,
        dueDate: getRelativeDate(3),
        assignee: 'VR',
        relatedTo: 'Recursos Humanos',
        estimatedCost: 5000,
        currency: Currency.MXN,
        estimatedTime: 10,
        actualTime: 2,
        isUrgent: false,
        isImportant: false
    },
    {
        id: '5',
        title: 'Auditoría de Seguridad',
        description: 'Revisión trimestral de logs de acceso y permisos de usuarios.',
        priority: Priority.HIGH,
        status: Status.DEFERRED,
        dueDate: getRelativeDate(10),
        assignee: 'IT',
        estimatedCost: 0,
        currency: Currency.USD,
        estimatedTime: 6,
        actualTime: 0,
        isUrgent: false,
        isImportant: true
    },
    {
        id: '6',
        title: 'Preparar Demo para Cliente',
        description: 'Configurar ambiente de pruebas con datos reales para la presentación del viernes.',
        priority: Priority.HIGH,
        status: Status.COMPLETED,
        dueDate: getRelativeDate(-2),
        assignee: 'VR',
        estimatedCost: 0,
        currency: Currency.MXN,
        estimatedTime: 3,
        actualTime: 2.5,
        isUrgent: true,
        isImportant: true,
        completedAt: getRelativeDate(-2)
    }
];

export const TRANSLATIONS = {
    [Language.EN]: {
        dashboard: "Dashboard",
        tasks: "Tasks",
        kpis: "Insights & KPIs",
        profile: "Profile",
        settings: "Settings",
        voiceAssistant: "Voice Assistant",
        logout: "Log out",
        newTask: "New Task",
        addTaskShort: "Task",
        editTask: "Edit Task",
        search: "Search task...",
        filter: "Filter",
        share: "Share",
        status: "Status",
        priority: "Priority",
        dueDate: "Due Date",
        assignee: "Assignee",
        description: "Description",
        comments: "Comments",
        noComments: "No comments yet.",
        addComment: "Add a comment...",
        cost: "Cost",
        estCost: "Est. Cost",
        actCost: "Actual Cost",
        close: "Close",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        update: "Update",
        title: "Title",
        details: "Details",
        view: {
            list: "List",
            board: "Board",
            calendar: "Calendar",
            table: "Table",
            matrix: "Matrix",
            kpi: "Charts"
        },
        welcome: "Welcome back",
        listening: "Listening...",
        tapToSpeak: "Tap to speak",
        currency: "Currency",
        language: "Language",
        darkMode: "Dark Mode",
        timeTracking: "Time Tracking",
        estTime: "Est. Time (h)",
        actTime: "Actual Time (h)",
        efficiency: "Efficiency",
        matrix: {
            doFirst: "Do First",
            schedule: "Schedule",
            delegate: "Delegate",
            delete: "Eliminate",
            urgent: "Urgent",
            notUrgent: "Not Urgent",
            important: "Important",
            notImportant: "Not Important"
        },
        // Mappings
        statusVal: {
            [Status.NOT_STARTED]: "Not Started",
            [Status.IN_PROGRESS]: "In Progress",
            [Status.COMPLETED]: "Completed",
            [Status.DEFERRED]: "Deferred"
        },
        priorityVal: {
            [Priority.HIGH]: "High",
            [Priority.MEDIUM]: "Medium",
            [Priority.LOW]: "Low"
        },
        // Dashboard specific
        totalTasks: "Total Tasks",
        inProgress: "In Progress",
        completed: "Completed",
        highPriority: "High Priority",
        taskCompletionHistory: "Task Completion (Last 7 Days)",
        recentTasks: "Recent Tasks",
        noTasks: "No tasks available.",
        myProfile: "My Profile",
        settingsTitle: "System Log",
        settingsDesc: "Monitor AI events, errors, and system actions.",
        // Login Screen
        loginSubtitle: "Please enter your details to access your workspace.",
        emailLabel: "Email address",
        phoneLabel: "Phone number",
        passwordLabel: "Password",
        signInButton: "Sign in",
        createAccount: "Create Account",
        heroTitle: "Manage projects effortlessly",
        heroSubtitle: "Track progress, collaborate with your team, and ship faster with TRANTOR.",
        signUp: "Sign Up",
        processing: "Processing...",
        orContinueWith: "Or continue with",
        alreadyHaveAccount: "Already have an account? Sign in",
        dontHaveAccount: "Don't have an account? Sign up",
        checkEmail: "Check your email for the confirmation link!",
        // Notifications
        notificationsTitle: "Notifications",
        markAllRead: "Mark all read",
        clearAll: "Clear all notifications",
        noNotifications: "No new notifications",
        welcomeTitle: "Welcome to Trantor!",
        welcomeMsg: "Your task management system is ready.",
        overdueTitle: "Task Overdue",
        dueTodayTitle: "Due Today",
        newTaskTitle: "New Task Created",
        // Profile
        personalInfo: "Personal Information",
        fullName: "Full Name",
        bio: "Bio",
        active: "Active",
        admin: "Admin",
        saveChanges: "Save Changes",
        // Delete Modal
        deleteTitle: "Delete Task?",
        deleteConfirm: "Are you sure you want to delete this task? This action cannot be undone.",
        // UI Elements
        addDetails: "Add details...",
        taskTitlePlaceholder: "e.g. Review Q3 Reports",
        dropTasks: "Drop tasks here",
        startTimer: "Start Timer",
        stopTimer: "Stop Timer",
        showCompleted: "Completed",
        hideCompleted: "Hide Completed",
        today: "Today",
        daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        // KPI Module
        timeRange: {
            day: "Day",
            week: "Week",
            month: "Month",
            year: "Year"
        },
        kpiLabels: {
            currentWeek: "Current Week",
            currentMonth: "Current Month",
            currentYear: "Current Year"
        },
        kpiMetrics: {
            completionRate: "Completion Rate",
            avgEfficiency: "Avg. Efficiency",
            totalCost: "Total Cost",
            onTimeDelivery: "On-Time Delivery",
            tasksCreatedVsCompleted: "Tasks: Created vs Completed",
            timeAnalysis: "Time Analysis (Est vs Actual)",
            costAnalysis: "Accumulated Cost",
            priorityDist: "Workload by Priority",
            created: "Created",
            budget: "Budget",
            actual: "Actual"
        },
        // Settings / Logs & Voice UI
        systemLogs: "System Logs",
        monitorEvents: "Monitor AI events, errors, and system actions.",
        clearLogs: "Clear Logs",
        time: "Time",
        level: "Level",
        category: "Category",
        message: "Message",
        noLogs: "No logs recorded yet.",
        viewDetails: "View Details",
        speakNow: "Speak now...",
        checkMic: "Check microphone if circles don't move",
        apiKeyMissing: "API Key missing",
        voiceControls: {
            strict: "Strict",
            noiseFilter: "Noise Filter",
            sensitive: "Sensitive",
            activeState: "Active"
        },
        // TTS / Voice Prompts
        ttsStructure: {
            prefix: "Task:",
            priority: "Priority",
            due: "Due on",
            desc: "Details:"
        }
    },
    [Language.ES]: {
        dashboard: "Tablero",
        tasks: "Tareas",
        kpis: "Indicadores",
        profile: "Perfil",
        settings: "Configuración",
        voiceAssistant: "Asistente de Voz",
        logout: "Cerrar sesión",
        newTask: "Nueva Tarea",
        addTaskShort: "Tarea",
        editTask: "Editar Tarea",
        search: "Buscar tarea...",
        filter: "Filtrar",
        share: "Compartir",
        status: "Estado",
        priority: "Prioridad",
        dueDate: "Vencimiento",
        assignee: "Asignado",
        description: "Descripción",
        comments: "Comentarios",
        noComments: "Sin comentarios aún.",
        addComment: "Agregar un comentario...",
        cost: "Costo",
        estCost: "Costo Est.",
        actCost: "Costo Real",
        close: "Cerrar",
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        update: "Actualizar",
        title: "Título",
        details: "Detalles",
        view: {
            list: "Lista",
            board: "Tablero",
            calendar: "Calendario",
            table: "Tabla",
            matrix: "Matriz",
            kpi: "Gráficas"
        },
        welcome: "Bienvenido de nuevo",
        listening: "Escuchando...",
        tapToSpeak: "Toca para hablar",
        currency: "Moneda",
        language: "Idioma",
        darkMode: "Modo Oscuro",
        timeTracking: "Seguimiento de Tiempo",
        estTime: "Tiempo Est. (h)",
        actTime: "Tiempo Real (h)",
        efficiency: "Eficiencia",
        matrix: {
            doFirst: "Hacer Primero",
            schedule: "Agendar",
            delegate: "Delegar",
            delete: "Eliminar",
            urgent: "Urgente",
            notUrgent: "No Urgente",
            important: "Importante",
            notImportant: "No Importante"
        },
        // Mappings
        statusVal: {
            [Status.NOT_STARTED]: "No Iniciada",
            [Status.IN_PROGRESS]: "En Progreso",
            [Status.COMPLETED]: "Completada",
            [Status.DEFERRED]: "Diferida"
        },
        priorityVal: {
            [Priority.HIGH]: "Alta",
            [Priority.MEDIUM]: "Media",
            [Priority.LOW]: "Baja"
        },
        // Dashboard specific
        totalTasks: "Total Tareas",
        inProgress: "En Progreso",
        completed: "Completadas",
        highPriority: "Alta Prioridad",
        taskCompletionHistory: "Historial (Últimos 7 días)",
        recentTasks: "Tareas Recientes",
        noTasks: "No hay tareas disponibles.",
        myProfile: "Mi Perfil",
        settingsTitle: "Log del Sistema",
        settingsDesc: "Monitoreo de eventos de IA, errores y acciones del sistema.",
        // Login Screen
        loginSubtitle: "Ingresa tus datos para acceder a tu espacio de trabajo.",
        emailLabel: "Correo electrónico",
        phoneLabel: "Número de teléfono",
        passwordLabel: "Contraseña",
        signInButton: "Iniciar Sesión",
        createAccount: "Crear Cuenta",
        heroTitle: "Gestiona proyectos sin esfuerzo",
        heroSubtitle: "Monitorea el progreso, colabora con tu equipo y entrega más rápido con TRANTOR.",
        signUp: "Registrarse",
        processing: "Procesando...",
        orContinueWith: "O continúa con",
        alreadyHaveAccount: "¿Ya tienes cuenta? Inicia sesión",
        dontHaveAccount: "¿No tienes cuenta? Regístrate",
        checkEmail: "¡Revisa tu correo para el enlace de confirmación!",
        // Notifications
        notificationsTitle: "Notificaciones",
        markAllRead: "Marcar todas como leídas",
        clearAll: "Borrar notificaciones",
        noNotifications: "No hay notificaciones nuevas",
        welcomeTitle: "¡Bienvenido a Trantor!",
        welcomeMsg: "Tu sistema de gestión de tareas está listo.",
        overdueTitle: "Tarea Vencida",
        dueTodayTitle: "Vence Hoy",
        newTaskTitle: "Nueva Tarea Creada",
        // Profile
        personalInfo: "Información Personal",
        fullName: "Nombre Completo",
        bio: "Biografía",
        active: "Activo",
        admin: "Admin",
        saveChanges: "Guardar Cambios",
        // Delete Modal
        deleteTitle: "¿Eliminar Tarea?",
        deleteConfirm: "¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.",
        // UI Elements
        addDetails: "Agregar detalles...",
        taskTitlePlaceholder: "ej. Revisar Reportes Q3",
        dropTasks: "Suelta tareas aquí",
        startTimer: "Iniciar Temporizador",
        stopTimer: "Detener Temporizador",
        showCompleted: "Terminadas",
        hideCompleted: "Ocultar Terminadas",
        today: "Hoy",
        daysShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        // KPI Module
        timeRange: {
            day: "Día",
            week: "Semana",
            month: "Mes",
            year: "Año"
        },
        kpiLabels: {
            currentWeek: "Semana Actual",
            currentMonth: "Mes Actual",
            currentYear: "Año Actual"
        },
        kpiMetrics: {
            completionRate: "Tasa de Finalización",
            avgEfficiency: "Eficiencia Promedio",
            totalCost: "Costo Total",
            onTimeDelivery: "Entrega a Tiempo",
            tasksCreatedVsCompleted: "Tareas: Creadas vs Completadas",
            timeAnalysis: "Análisis de Tiempo (Est vs Real)",
            costAnalysis: "Costo Acumulado",
            priorityDist: "Carga por Prioridad",
            created: "Creadas",
            budget: "Presupuesto",
            actual: "Real"
        },
        // Settings / Logs & Voice UI
        systemLogs: "Registros del Sistema",
        monitorEvents: "Monitorea eventos de IA, errores y acciones.",
        clearLogs: "Borrar Registros",
        time: "Hora",
        level: "Nivel",
        category: "Categoría",
        message: "Mensaje",
        noLogs: "No hay registros aún.",
        viewDetails: "Ver Detalles",
        speakNow: "Habla ahora...",
        checkMic: "Verifica micrófono si no se mueve",
        apiKeyMissing: "Falta API Key",
        voiceControls: {
            strict: "Estricto",
            noiseFilter: "Filtro Ruido",
            sensitive: "Sensible",
            activeState: "Activo"
        },
        // TTS / Voice Prompts
        ttsStructure: {
            prefix: "Tarea:",
            priority: "Prioridad",
            due: "Vence el",
            desc: "Detalles:"
        }
    }
};