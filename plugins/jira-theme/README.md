
# 🟦 GalagaV Plugin: Jira Management Console

An enterprise-grade plugin for the GalagaV Dashboard that provides both a **Professional Theme** (global CSS overrides) and a **Management Tool** (dedicated project tab).

---

## 🚀 Working State Features
- **Global Theme Overrides**: Strips arcade effects (scanlines, pixel fonts) and applies an Atlassian-inspired blue/gray palette.
- **Project Insight Tool**: Adds a "Management Insight" tab to projects with status statistics and automated task generation.
- **Standalone Build**: Includes a local `types.ts` to resolve build errors and ensure zero-dependency compilation.
- **Shared Runtime**: Leverages the host's `React` and `Lucide` instances to keep the package size under 10KB.

---

## 🛠 Development & Build

### 1. Setup
Install dependencies (ensure you have Node.js installed):
```bash
npm install
```

### 2. Compiling
The plugin must be compiled into a **UMD (Universal Module Definition)** format. This is handled automatically by the Vite configuration:
```bash
npm run build
```
The output will be generated in the `dist/` directory:
- `index.js`: The logic and component code.
- `style.css`: The theme and component styles.
- `manifest.json`: Metadata (copied from `public/`).

---

## 📦 Packaging for GalagaV
The host application expects a specific ZIP structure to correctly identify and load the plugin.

### The "Flat-Zip" Rule
**⚠️ CRITICAL:** You must zip the **contents** of the `dist/` folder, not the `dist/` folder itself.

1.  Open the `dist/` folder after running `npm run build`.
2.  Select all files: `index.js`, `manifest.json`, and `style.css`.
3.  Right-click and select **Compress** (Mac) or **Send to Zip** (Windows).
4.  The resulting `.zip` file should have `manifest.json` at its root level.

---

## 🧬 Technical Architecture

### Type Safety
To avoid relative path errors during `tsc` (TypeScript Compilation), the plugin uses a local `src/types.ts` file. This allows the plugin to be built in isolation without needing access to the host application's source code.

### Shared Globals
The plugin is configured via `vite.config.ts` to treat the following as external:
- `react` (mapped to `window.React`)
- `react-dom` (mapped to `window.ReactDOM`)
- `lucide-react` (mapped to `window.Lucide`)

This ensures that the plugin uses the exact same React context as the host, preventing "Invalid Hook Call" errors.

---

## 📄 Manifest Reference
The `manifest.json` defines how the host interacts with the plugin:

```json
{
  "id": "com.galagav.theme.jira",
  "name": "Jira Management Console",
  "version": "1.1.0",
  "main": "index.js",
  "style": "style.css",
  "globalVar": "GalagaPlugin_JiraTheme",
  "type": "tool"
}
```
- `globalVar`: Must match the `name` property in the Vite `build.lib` config.
- `type`: Set to `"tool"` to add a tab to the UI. The styles in `style.css` will still apply globally as a theme.

---
*Created for the GalagaV Project Dashboard System.*
