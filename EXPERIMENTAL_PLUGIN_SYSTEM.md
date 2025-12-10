# 🔌 GalagaV Plugin System (Zip Architecture)

> **Status:** Beta / Stable
> **Goal:** Enable dynamic loading of external React components via Zip Archives containing metadata and assets.

---

## 1. Architecture Overview

*   **Format:** Plugins are distributed as `.zip` files.
*   **Contents:**
    1.  `manifest.json` (Required): Metadata and entry points.
    2.  `index.js` (Required): The UMD compiled JavaScript.
    3.  `style.css` (Optional): External stylesheets.
*   **Shared Dependencies (CRITICAL):**
    *   The Host (GalagaV) exposes `React`, `ReactDOM`, and `Lucide` (icons) to the global window.
    *   **Plugins MUST NOT bundle these libraries.** They must treat them as external to keep file sizes small and avoid React context conflicts.

---

## 2. 🤖 INSTRUCTION FOR AI PLUGIN BUILDER

**Copy and paste the section below when you start a new chat/workspace to build a plugin.**

***

### SYSTEM PROMPT: Building a GalagaV Compatible Plugin (Zip Format)

You are an expert React Developer building a Plugin for the **GalagaV Host System**. 

**STRICT ARCHITECTURAL CONSTRAINTS:**

1.  **Build Target**: You are building a **Library (UMD)**, not an App.
2.  **External Dependencies**: You MUST NOT bundle `react`, `react-dom`, or `lucide-react`. 
    *   You must configure Vite/Rollup to treat them as `external`.
    *   You must rely on `window.React`, `window.ReactDOM`, and `window.Lucide`.
3.  **Output**: You must produce a `.zip` file containing `index.js` and `manifest.json`.

**STEP 1: `package.json`**
Ensure you have `vite` and `@vitejs/plugin-react`. You do NOT need css-injection plugins anymore as we support separate CSS files.

**STEP 2: `vite.config.ts` (CRITICAL)**
Use this configuration to exclude shared dependencies.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.tsx',
      name: 'GalagaPlugin_MyPlugin', // This must match manifest.globalVar
      fileName: (format) => `index.js`,
      formats: ['umd']
    },
    rollupOptions: {
      // CRITICAL: Do not bundle these. The Host provides them.
      external: ['react', 'react-dom', 'lucide-react'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'lucide-react': 'Lucide'
        },
        name: 'GalagaPlugin_MyPlugin', // MUST match manifest.globalVar
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          return assetInfo.name;
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
```

**STEP 3: `manifest.json` (Required)**
Create this file in your `public/` folder so it ends up in dist.

```json
{
  "id": "com.example.myplugin",
  "name": "My Plugin Name",
  "version": "1.0.0",
  "description": "Does cool stuff",
  "main": "index.js",
  "style": "style.css", 
  "globalVar": "GalagaPlugin_MyPlugin",
  "type": "tool" 
}
```

**Plugin Types (`type`):**
*   `"tool"` (Default): Adds a new tab to the Project Detail view. The plugin's exported Component is rendered in that tab.
*   `"theme"`: Does NOT add a tab. The plugin's CSS/JS is loaded in the background to override global styles.

**STEP 4: Entry Point (`src/index.tsx`)**

```typescript
import MyComponent from './MyComponent';

// The Host expects a specific default export structure
const plugin = {
  Component: MyComponent
};

export default plugin;
```

**STEP 5: Packaging**
1. Run `npm run build`.
2. Go to `dist/`.
3. Zip the contents (ensure `manifest.json` and `index.js` are at the root of the zip).

***

---

## 3. 📦 Packaging & Installation Guide (Manual)

If you are manually creating or packaging a plugin without using an AI builder, follow these steps carefully to ensure the GalagaV system accepts your file.

### Step 1: Prepare Your Build Files
Whether you use Vite, Webpack, or manual coding, your final output folder (usually `dist/`) must contain flat files.

**Required Files:**
1.  **`manifest.json`**: The metadata registry.
2.  **`index.js`**: Your compiled JavaScript code (UMD format).

**Optional Files:**
1.  **`style.css`**: Any custom styling.
2.  **Assets**: Images or other assets referenced relatively (advanced usage).

**Example Output Structure:**
```text
/dist
  ├── manifest.json
  ├── index.js
  └── style.css
```

### Step 2: Verify `manifest.json`
Open your manifest and double-check the filenames match exactly.

```json
{
  "id": "com.yourname.uniqueplugin",
  "name": "My Cool Plugin",
  "version": "1.0.0",
  "description": "Short description",
  "main": "index.js",       <-- Must match your JS filename
  "style": "style.css",     <-- Must match your CSS filename (optional)
  "globalVar": "GalagaPlugin_UniqueVar", <-- Must match 'name' in vite.config.ts
  "type": "tool"            <-- 'tool' (adds tab) or 'theme' (background style)
}
```

### Step 3: Create the Zip Archive (Crucial!)
**⚠️ IMPORTANT:** Do not zip the folder containing the files. You must zip the files directly.

**Correct Way:**
1.  Open your `dist/` or build folder.
2.  Select `manifest.json`, `index.js`, and `style.css`.
3.  Right-click the selection.
4.  Choose **"Compress"** (Mac) or **"Send to -> Compressed (zipped) folder"** (Windows).
5.  Name the file `my-plugin.zip`.

**Incorrect Way:**
*   ❌ Right-clicking the `dist/` folder itself and zipping it.
    *   *Why?* This creates a nested structure (e.g., `dist/manifest.json`), but GalagaV expects `manifest.json` at the root of the zip.

### Step 4: Install in GalagaV
1.  Open GalagaV Dashboard.
2.  Click **Settings** (Gear Icon).
3.  Navigate to the **Plugins** tab.
4.  Drag and drop your `my-plugin.zip` into the "Install New Plugin" drop zone.
5.  If successful, the plugin will appear in the list. Toggle the switch to **Active** to enable it.
