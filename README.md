# Trantor Task - Intelligent Task Management

Trantor Task is a modern, AI-powered task management system built to optimize productivity for transport operators and teams. It combines robust project management tools with a cutting-edge Voice AI assistant powered by **Google Gemini**.

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="Trantor Dashboard" width="100%" />
</div>

## 🚀 Features

### Core Task Management
- **Multiple Views**: Switch seamlessly between:
  - 📋 **List View**: Standard detailed list.
  - 🍱 **Kanban Board**: Drag-and-drop workflow management.
  - 📅 **Calendar**: Monthly, weekly, and daily agendas.
  - 🦅 **Eisenhower Matrix**: Prioritize based on urgency and importance.
  - 📊 **Table**: Information-dense spreadsheet view.
- **Smart Timers**: Track actual time spent vs. estimated time per task globally or granularly.
- **Notifications**: Automatic alerts for overdue tasks, due-today items, and system events.

### 🎙️ AI Voice Assistant
Integrated with **Google Gemini Live API**, the Voice Assistant is designed for hands-free operation in noisy environments (e.g., truck cabins):
- **Real-time Audio Processing**: Custom DSP pipeline with high-pass/low-pass filters and adaptive noise gating.
- **Natural Interaction**: Speak naturally to add tasks or query your schedule.
- **Multi-language Support**: Fully functional in **English** and **Spanish**.

### 📈 Analytics & Design
- **KPI Dashboard**: Real-time metrics on completion rates, efficiency, and project costs.
- **Modern UI/UX**: Built with Tailwind CSS, featuring Dark Mode support and responsive mobile-first design.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Charts**: Recharts
- **State Management**: React Context API

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A Google Gemini API Key

### Installation

1. **Clone the repository** (if applicable) or download source.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env.local` file in the root directory and add your API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The app will start at `http://localhost:3000`.

## 📁 Project Structure

```
src/
├── components/      # React components (TaskModule, VoiceAssistant, etc.)
├── services/        # Audio processing and utilities
├── utils/           # Helper functions
├── types.ts         # TypeScript definitions
└── constants.ts     # Configuration, translations, and mock data
```

## 🌍 Localization

The application automatically supports **English** and **Spanish**. You can toggle the language from the user profile or settings.

---

Built for the **Google Cloud x TM Forum AI Hackathon**.
