# Theme Workflow Integration TODO

This document captures the planned implementation steps for integrating the `theme_wf-main` package workflows and UI features into the current application.

## GUI Manager for `TODO.md`
Develop a comprehensive web-based interface to easily manage the CLI/workflow `TODO.md` file:
- [x] **Add Todo**: Build forms to create new tasks and append them to the underlying `TODO.md` securely.
- [x] **Add/Edit Todo Type**: Provide settings to define or modify different types/categories of Todos.
- [x] **Add/Edit Status List**: Let the user manage the task status options (e.g., Pending, In Progress, Completed, Blocked).
- [x] **Add Contributor/Team Member**: Implement team management to maintain a list of contributors for assigning tasks.
- [x] **Add Subtasks**: Allow the creation and management of indented subtasks beneath parent tasks for granular tracking.

## CI/CD & Project Standardization
- [x] **Terminal Support**: Add terminal support/interface for both AI Agent and User to manage CI/CD and standardization tasks.
- [x] **Commitizen & Conventional Commits (Optional)**: Ensure the UI/backend correctly triggers or manages version bumps aligned with `git-cz` (can opt out or use alternative tools).
- [x] **Semantic Release Processing (Optional)**: Surface configuration or status for `.releaserc-semver.js` and `.releaserc-npm.js` (can opt out or use alternative tools).
- [x] **GitHub Actions Pipelines (Optional)**: Track or configure semantic-version-update workflows (can opt out or use alternative tools).
- [x] **Project GitHub Integration**: Added repository URL configuration to project settings and UI header.
- [x] **Server Initialization**: Guarantee stable startup for the local Node server in `server.ts` built to perform the read/writes to the Markdown/config files.
- [x] **Galagav Project Entry Point**: Ensure the initial entry point of this update is available and integrated on the galagav project.

## Full-Stack Redesign & Backend Translation
- [x] **Backend TODO Logic Translation**: Translate the legacy backend TODO logic into the main Express server (`server.ts`). Convert controllers, middleware, and models to a modern ESM/TypeScript approach for reading/writing `TODO.md` and JSON files.
- [x] **React + Tailwind Frontend Redesign**: Fully redesign the legacy HTML frontend. Migrate all User Interfaces (Modals, Tables, Forms) and Pages (Dashboard, Settings) to modern React components styled comprehensively with Tailwind CSS.

[ ] Title: Site update
ID: todo-TD597102
Date: 2026-06-03
Assign: Unassigned

Description: update&nbsp;the&nbsp;website

Type: #frontend | Status: To Do

Subtask:

Comment:

