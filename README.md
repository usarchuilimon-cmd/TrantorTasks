# Trantor Tasks

Trantor Tasks is a modern, responsive task management application built with **React**, **Vite**, and **Supabase**. It provides a robust platform for tracking projects, managing tasks, and visualizing team performance through an intuitive dashboard.

## 🚀 Features

-   **Authentication & Security**: Secure user authentication using Supabase Auth (Email/Password & Google OAuth).
-   **Task Management**: Create, read, update, and delete (CRUD) tasks with real-time updates.
-   **Dashboard & KPIs**: Visual insights into task completion rates, efficiency, and costs.
-   **Multilingual Support**: Fully localized interface with support for English and Spanish.
-   **Responsive Design**: Mobile-first UI powered by Tailwind CSS.
-   **Dark Mode**: Native dark mode support for all screens.

## 🛠 Technology Stack

-   **Frontend**: React 18, TypeScript, Vite
-   **Styling**: Tailwind CSS, PostCSS
-   **Backend / Database**: Supabase (PostgreSQL, Auth, Realtime)
-   **Icons**: Material Symbols (Google Fonts)
-   **Deploy**: GitHub Pages / Vercel (Ready)

## ⚙️ Setup & Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/usarchuilimon-cmd/TrantorTasks.git
    cd TrantorTasks
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env.local` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The app will run at `http://localhost:3000` (or similar).

## 🗄 Database Schema

The application uses a `tasks_tasks` table in Supabase with the following key fields:
-   `id` (uuid, pk)
-   `title` (text)
-   `description` (text)
-   `status` (text: 'not_started', 'in_progress', 'completed', 'deferred')
-   `priority` (text: 'low', 'medium', 'high')
-   `assignee` (text)
-   `due_date` (date)

## 🤝 Contributing

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
