# GalagaV

Current version: `0.1.0`

**GalagaV** is a full-stack project operations environment built for managing projects, tasks, architecture design, and versioned repository workflows from a single UI.

## Overview

GalagaV combines a rich React frontend and a lightweight Express backend to let users:
- manage projects with timelines, milestones, and task boards
- stage and commit code changes through an integrated commit workflow
- view repository metadata such as branch, version, and semantic release status
- connect local folders and Todo files for persistent project tracking
- extend the app with plugins like theme packs and schema builders

## Core Features

- **Project dashboard** with version and branch metadata
- **Commit workflow** with file staging, commit details, and conventional commit support
- **Semantic release indicator** showing when semantic-release is configured
- **Automated semver workflow checklist** showing captured release script, config, version writer, and GitHub Action status
- **Branch switcher** and uncommitted change warning
- **Project archive confirmation** to prevent accidental deletions
- **Todo and task management** backed by an Express API and local persistence
- **Architect / schema visualization** for relationship design and mapping
- **Plugin system** for additional UI modules and custom behaviors
- **AI commit message generation** support via Google Gemini for conventional commit content

## How to Use the UI

### Project Dashboard

When you open a project, the header shows:
- project name and description
- current Git branch
- project version badge
- local semantic version display from `package.json`
- semantic release indicator when configured
- semver workflow readiness checklist
- quick action buttons for Todos, snippets, commit flow, merge, and settings

### Commit Workflow

The commit flow is accessible from the dashboard via the `Commit` button:
1. Open the commit modal.
2. Review changed files in the `Changes` tab.
3. Select files and stage them with `Stage Selected`.
4. Switch to `Commit Details` once files are staged.
5. Choose a commit type, optional scope, subject, body, and issue references.
6. Execute the commit with confirmation.

This workflow enforces staging first, then commit details, so it matches a real Git commit process.

### Semantic Release Indicator

A `Semantic Release` badge appears when a project is configured for semantic versioning. The app detects semantic-release readiness from:
- `package.json` containing a `release:semver` script
- `package.json` commitizen configuration
- the presence of `.releaserc-semver.cjs` or `.releaserc-semver.js`
- the release workflow at `.github/workflows/release.yml`

The dashboard also shows a semver workflow checklist so you can see whether the UI captured:
- release script
- release config
- package version writer
- GitHub Action

### Automated Semantic Release Setup

Use `Settings` > `Configure Semantic Release` after setting `Local Folder Path` to apply semantic-release setup to that linked folder. The action creates or updates:
- `package.json` scripts, Commitizen config, and semantic-release dev dependencies
- `.releaserc-semver.cjs`
- `.github/workflows/release.yml`
- `CHANGELOG.md` when it does not already exist

After setup, the project dashboard can detect the generated files and show the semver workflow checklist as ready.

### Branch Switching

Use the branch button in the header to open the branch switcher.
- It checks for uncommitted changes first.
- If changes exist, the UI warns you and suggests committing before switching.
- You can search branches and switch safely from the modal.

### Version and Project Metadata

The header also shows:
- current semantic version `vX.Y.Z` from the closest `package.json`
- current branch name
- whether semantic-release is configured
- automated semver workflow readiness from the linked repository files

## Semantic Versioning and Releases

GalagaV is wired for semantic-release using conventional commits.

### Available Scripts

- `npm run commit` - launches Commitizen if installed and configured
- `npm run release:semver` - runs semantic-release using `.releaserc-semver.cjs`
- `npm run dev` - starts the app in development mode
- `npm run build` - builds frontend assets and backend bundle
- `npm start` - runs the production server
- `npm run lint` - runs TypeScript type checking

### How Versioning Works

1. Use the UI commit workflow to create commits in conventional commit format.
2. Conventional commit messages should use `type(scope): subject` semantics.
3. `feat` commits produce minor releases, `fix`, `perf`, and `update` commits produce patch releases, and breaking changes produce major releases.
4. When semantic-release runs, it analyzes commit history and calculates the next semantic version.
5. `@semantic-release/npm` writes that version into `package.json` and `package-lock.json` without publishing to npm.
6. `@semantic-release/changelog` updates `CHANGELOG.md`.
7. `@semantic-release/git` commits the updated release assets back to the repository.
8. The app reads the latest version from the closest linked `package.json` and updates the version badge.

### CI Release Pipeline

A GitHub Actions workflow has been added at `.github/workflows/release.yml`.
- It triggers on `push` to `main`
- It runs on Node.js 20 for semantic-release 24 compatibility
- It installs dependencies with `npm ci` and runs `npm run release:semver`
- It uses `GITHUB_TOKEN` to commit updated assets such as `package.json`, `package-lock.json`, and `CHANGELOG.md`

## Local Folder Integration

GalagaV supports connecting to local project folders:
- Set `Local Folder Path` in project settings
- The app reads Git metadata and executes terminal commands inside that folder
- It also resolves and stores Todo paths for direct local persistence

### Important Notes

- The linked folder should already exist before connecting it.
- The app does not copy or move your project folder into the GalagaV directory.
- Local Git operations depend on the folder being a valid Git repository.

## Project Structure

- `/components` - core UI components used by the app
- `/src/frontend` - frontend application views and components
- `/src/backend` - Express API controllers, services, and models
- `/lib` - shared utilities, SQLite integration, and Firestore helpers
- `/plugins` - plugin packages and manifests
- `server.ts` - main Express + Vite server entry point
- `.releaserc-semver.cjs` - semantic-release configuration
- `.github/workflows/release.yml` - GitHub Actions release pipeline

## Notes for Developers

- Frontend is built with React + Tailwind + Vite
- Backend is Express + TypeScript and uses the local terminal API for Git commands
- Semantic-release is integrated into the repo but requires `npm install` to activate
- Commit messages should follow the conventional commit standard to make version bumps predictable

## Troubleshooting

- If the semantic release badge is not showing, ensure the project contains:
  - `release:semver` in `package.json`
  - `commitizen` config in `package.json`
  - `.releaserc-semver.cjs`
  - `.github/workflows/release.yml`
- If the version badge is stale, click `Sync` on the project dashboard to reread the linked folder's `package.json`.
- If the linked folder is missing semver files, open project settings and run `Configure Semantic Release`.
- If local Git operations fail, verify the folder path is correct and the directory is a Git repo.
- If AI commit generation fails, verify `GEMINI_API_KEY` is set in `.env`.

## Contact

For questions, feature requests, or bug reports, update the issue tracker or use the project settings UI to open a support issue.
