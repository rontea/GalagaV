# 📦 GalagaV Plugin Packaging Guide

This guide explains how to package a React component (like the **Jira Theme**) into a `.zip` archive that can be uploaded to the GalagaV Dashboard.

---

## 1. Directory Structure
Your plugin source should be isolated. Here is the standard structure (using the `jira-theme` as an example):

```text
/plugins/my-plugin
├── package.json
├── vite.config.ts
├── public/
│   └── manifest.json      <-- Required: Metadata
└── src/
    ├── index.tsx          <-- Required: Entry Point
    └── style.css          <-- Optional: Theme overrides
```

---

## 2. The Manifest (`manifest.json`)
This file tells the host app how to load your plugin. It **must** reside in your `public/` folder so it ends up in the root of your `dist/` folder.

```json
{
  "id": "com.developer.myplugin",
  "name": "My Cool Tool",
  "version": "1.0.0",
  "description": "Adds a custom management view.",
  "main": "index.js",
  "style": "style.css",
  "globalVar": "GalagaPlugin_MyPlugin",
  "type": "tool"
}
```

- **globalVar**: Must match the `name` in your `vite.config.ts`.
- **type**: `"tool"` adds a tab to the project view; `"theme"` runs invisibly to apply CSS.

---

## 3. Build Configuration (UMD)
GalagaV uses a **Shared Runtime**. You must not bundle React or Lucide. Configure your `vite.config.ts` as follows:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.tsx',
      name: 'GalagaPlugin_MyPlugin', // Matches manifest.globalVar
      fileName: () => `index.js`,
      formats: ['umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'lucide-react'], // Don't bundle these!
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'lucide-react': 'Lucide'
        }
      }
    }
  }
});
```

---

## 4. Creating the Zip (The "No Nesting" Rule)
The GalagaV loader expects the `manifest.json` to be at the **root** of the Zip file.

1.  Run your build: `npm run build`.
2.  Open your `dist/` folder.
3.  **Select the files inside** (e.g., `index.js`, `manifest.json`, `style.css`).
4.  Right-click and select **Compress** or **Send to Zip**.
5.  ❌ **DO NOT** zip the `dist/` folder itself.
6.  ✅ **DO** zip the files directly.

---

## 5. Installation
1.  Open the **GalagaV Dashboard**.
2.  Click the **Settings** (Gear Icon).
3.  Go to the **Plugins** tab.
4.  Drag your `.zip` file into the **Upload New Plugin** area.
5.  Click **Install** in the Local Repository section.
6.  Toggle the plugin to **Active**.

---

## 🛠 Shared Props
Your plugin component will receive the following props from the host:

| Prop | Type | Description |
| :--- | :--- | :--- |
| `project` | `Project` | The current active project data. |
| `onSave` | `(p: Project) => void` | Function to update project data. |
| `theme` | `'light' \| 'dark'` | The current UI theme. |
| `onNotify` | `(msg: string) => void` | Send a toast/log to the host. |
