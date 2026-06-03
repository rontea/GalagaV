# GalagaV

Current version: `0.0.0-development`

**GalagaV** is a full-stack, comprehensive environment for managing projects, analyzing code snippets, and tracking architectural schemas. It combines a robust frontend project management interface with a dedicated backend API for tracking tasks, schemas, and executing local project operations.

## System Overview

At its core, GalagaV serves as a hybrid between a productivity tracker, an architect visualization tool, and a technical playground (including a retro Galaga mini-game, dynamic plugins, and terminal interactions).

### Core Features

- **Project Dashboard & Planning:** Manage projects globally with Timeline views, Sub-step cards, and Architect views. Each project supports detailed descriptions, attached system prompts, and code snippets.
- **Todo & Task Management Backend:** A fully functioning Model-View-Controller (MVC) Express backend handles Todo management. This includes CRUD operations built on local persistence (`todos.json`), tracking custom statuses, contributor assignments, and task types.
- **Architect / Schema View:** Design and visualize database architectures, relationships, and nodes directly within the application using an internal schema visualization model.
- **Extensible Plugin System:** The environment features a dynamic plugin bootstrap model allowing custom plugins (such as `professional-theme` and `schema-builder`) to be injected into the interface.
- **Rich Text & Content Editor:** Utilizes React-Quill for comprehensive markdown, image parsing, and step documentation tools.
- **Web Terminal Controller:** Run operations through an integrated backend terminal API that handles and executes specific terminal commands from the browser safely.
- **Legacy Theme Integration:** The directory structure maintains backward compatibility paths and data migration workflows for older components (found in `theme_wf-main`).

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Motion (Framer), and Lucide React.
- **Backend:** Express.js utilizing ESModules/TypeScript without requiring transpilation.
- **Database & Persistence:** SQLite (via `sql.js` stored locally) and local JSON stores.
- **AI Integration:** Support for Google GenAI SDK (`@google/genai`).
- **Plugins/Bundling:** Rollup / JSZip API integrations for zipping and fetching localized project subsets.

## Getting Started

### Running Locally

To run this project locally, outside of the hosted environment:

1. Ensure you have **Node.js** (v18+) installed.
2. Download the project code (via Settings menu > Export, or download from your hosted environment).
3. Extract the downloaded archive to a local folder.
4. Open your terminal and navigate to the project directory.
5. Run `npm install` to install dependencies.
6. (Optional) Copy `.env.example` to `.env` and fill in any required configuration.
   - **Important:** If you are using features that require the Gemini API, you MUST set your `GEMINI_API_KEY` in the `.env` file.
   - Example: `GEMINI_API_KEY="AIzaSyYourKeyHere..."`
7. Run `npm run dev` to start the development server (runs Express serving Vite middleware on port 3000).

#### Folder Syncing on Local Drive

When running on your local machine, the application has native access to your filesystem. This allows robust, native syncing of your project folders and TODO markdowns:

- You can specify absolute paths (e.g., `C:\Projects\my-project` or `/Users/name/projects/my-project`) or relative paths (e.g., `./my-project`) in the project settings for **Local Folder Path** and **Todo Folder Path**.
- **Local Folder Path must already exist.** Adding a project links GalagaV to that folder; the app does not create, copy, or import the project folder into the GalagaV app directory.
- The backend `TodoService` will resolve these system paths and write TODO markdown files directly inside the linked project or configured todo folder.
- Running locally bypasses the sandbox constraints of the web preview environment, offering the intended developer experience with true local file persistence.

### Production Build

To run the application in production mode:

```bash
npm run build
npm start
```

## Architecture Map

- `/src/frontend` -> Reusable views and logic, such as the `TodoManagerView` and `TerminalView`.
- `/src/backend` -> Express backend models, controllers, and services powering the todo-list and terminal endpoints.
- `/components` -> Main layout systems including `ProjectList`, `ArchitectView`, `TimelineStepActions`, and the `GameCanvas` element.
- `/plugins` -> Extensible widget endpoints (like themes or schema builders) mapping dynamically at runtime.
- `/server.ts` -> Main application entry point for the custom HTTP server integrating Vite.
