# GalagaV - Project Dashboard & Game

A modern, arcade-themed project management dashboard built with React, TypeScript, and Tailwind CSS. Originally designed as a dashboard for a Galaga Clone game, it has evolved into a fully functional task management tool with sub-tasks, history tracking, and JSON import/export capabilities.

![GalagaV Screenshot](https://via.placeholder.com/800x450?text=GalagaV+Dashboard)

## 🚀 Features

-   **Project Management**: Create, edit, and archive projects.
-   **Task Timeline**: Drag-and-drop reordering, nesting (sub-tasks), and history tracking.
-   **Customization**: Light/Dark modes, custom project icons, status colors, and categories.
-   **Data Portability**: Export projects to JSON and import them anywhere.
-   **Offline First**: Works completely offline using LocalStorage.
-   **Optional Integrations**:
    -   Firebase (High Scores & Profiles)
    -   Google Gemini API (AI Callsign Generation)

---

## 🛠️ Installation & Setup

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or higher)
-   npm or yarn

### 1. Clone or Download
Extract the project files to a directory of your choice.

```bash
cd galagav
```

### 2. Install Dependencies
Run the following command to install the required React and build libraries:

```bash
npm install
# or
yarn install
```

### 3. Run Locally (Development Mode)
Start the local development server. This will run the app at `http://localhost:5173` (by default).

```bash
npm run dev
# or
yarn dev
```

---

## 📦 Building for Production (Offline / Static Hosting)

To deploy this app to a static host (like Vercel, Netlify, GitHub Pages) or run it as a standalone offline web app:

1.  **Build the project:**
    ```bash
    npm run build
    ```

2.  **Locate the Output:**
    The compiled files will be in the `dist/` folder.

3.  **Run/Deploy:**
    -   **Web Server:** Upload the contents of `dist/` to any static web server.
    -   **Local Preview:** To preview the build locally:
        ```bash
        npm run preview
        ```

---

## 🔑 Environment Configuration (Optional)

The application runs 100% offline by default using LocalStorage. However, if you want to enable the **Game High Scores** or **AI Features**, you need to configure environment variables.

Create a `.env` file in the root directory:

```env
# Firebase Configuration (For Global High Scores)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini API (For AI Callsign Generation)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

*Note: If these keys are missing, the app will gracefully fall back to local storage for scores and a dummy generator for callsigns.*

---

## 📂 Project Structure

-   `/src`
    -   `/components` - UI components (ProjectList, ProjectDetail, etc.)
    -   `/hooks` - Game logic (useGameLoop)
    -   `/services` - API interactions (Firebase, Gemini)
    -   `App.tsx` - Main application controller
    -   `types.ts` - TypeScript interfaces

---

## 🎮 Keyboard Shortcuts & Accessibility

-   **Tab**: Navigate through projects and tasks.
-   **Enter/Space**: Select a project or toggle a task.
-   **Esc**: Close modals (Settings, Confirmation).
-   **Drag & Drop**: Reorder tasks or nest them as sub-tasks by dragging one card onto another.

---

## 📄 License

This project is open-source. Feel free to modify and distribute.