
import { PluginConfig, PluginManifest } from '../types';

export const JIRA_MANIFEST: PluginManifest = {
  id: "com.galagav.theme.jira",
  name: "Professional Jira Theme",
  version: "1.0.0",
  description: "Transforms the dashboard into a professional, blue-scale enterprise interface.",
  main: "index.js",
  style: "style.css",
  globalVar: "GalagaPlugin_JiraTheme",
  type: "theme"
};

export const JIRA_CSS = `
/* JIRA / Enterprise Theme Overrides */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --jira-blue: #0052CC;
  --jira-blue-hover: #0747A6;
  --jira-bg: #F4F5F7;
  --jira-text: #172B4D;
  --jira-subtle: #5E6C84;
  --jira-border: #DFE1E6;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Helvetica Neue', sans-serif !important;
  background-color: var(--jira-bg) !important;
  color: var(--jira-text) !important;
}

.dark body { 
  background-color: #091E42 !important; 
  color: #DEEBFF !important;
}

/* Header Adjustments */
header {
  background-color: #FFFFFF !important;
  border-bottom: 1px solid var(--jira-border) !important;
  box-shadow: 0 1px 1px rgba(0,0,0,0.1) !important;
}

.dark header {
  background-color: #0747A6 !important;
  border-bottom: 1px solid #253858 !important;
}

/* Dashboard UI */
.group.relative.rounded-xl {
  border-radius: 3px !important;
  box-shadow: 0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31) !important;
  border: none !important;
  background-color: #FFFFFF !important;
}

.dark .group.relative.rounded-xl {
  background-color: #172B4D !important;
}

/* Navigation & Tabs */
button[role="tab"] {
  font-family: 'Inter', sans-serif !important;
  text-transform: none !important;
  font-weight: 500 !important;
}

button[role="tab"][aria-selected="true"] {
  color: var(--jira-blue) !important;
  border-bottom-color: var(--jira-blue) !important;
}

/* Buttons */
button {
  border-radius: 3px !important;
  font-family: 'Inter', sans-serif !important;
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 500 !important;
}

button.bg-cyan-600, 
button.bg-emerald-600 {
  background-color: var(--jira-blue) !important;
}

button.bg-cyan-600:hover, 
button.bg-emerald-600:hover {
  background-color: var(--jira-blue-hover) !important;
}

/* Typography Overrides */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Inter', sans-serif !important;
  letter-spacing: -0.01em !important;
}

.font-mono {
  font-family: 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace !important;
}

/* Form Elements */
input, textarea, select {
  border-radius: 3px !important;
  border: 2px solid var(--jira-border) !important;
  background-color: #FAFBFC !important;
  color: var(--jira-text) !important;
}

input:focus, textarea:focus, select:focus {
  border-color: #4C9AFF !important;
  background-color: #FFFFFF !important;
  box-shadow: 0 0 0 2px rgba(76, 154, 255, 0.2) !important;
}

/* Remove Gaming Effects */
.scanlines { display: none !important; }
.font-arcade { font-family: 'Inter', sans-serif !important; text-transform: none !important; }

/* Status Styles */
span.rounded-full, div.rounded {
  border-radius: 3px !important;
}
`;

export const JIRA_JS = `
(function(win) {
  const React = win.React;
  const Lucide = win.Lucide;
  
  const JiraThemeInfo = () => {
    if (!React || !Lucide) return null;
    
    return React.createElement('div', { 
        className: "p-12 flex flex-col items-center justify-center h-full text-center bg-[#F4F5F7] dark:bg-[#091E42]" 
      },
      React.createElement('div', { className: "bg-[#DEEBFF] p-6 rounded-full mb-6 shadow-sm" },
        React.createElement(Lucide.Briefcase || Lucide.Settings, { size: 48, className: "text-[#0052CC]" })
      ),
      React.createElement('h1', { className: "text-3xl font-bold text-[#172B4D] dark:text-white mb-4" }, "Enterprise Design Active"),
      React.createElement('p', { className: "text-[#5E6C84] dark:text-slate-400 max-w-lg leading-relaxed text-lg" }, 
        "The GalagaV interface has been successfully transformed into a professional workspace using the Enterprise Design System. Retro aesthetics have been suppressed for maximum productivity."
      ),
      React.createElement('div', { className: "mt-8 flex gap-3" },
        React.createElement('span', { className: "px-3 py-1 bg-[#EAE6FF] text-[#403294] text-xs font-bold rounded" }, "STABLE V1.0"),
        React.createElement('span', { className: "px-3 py-1 bg-[#E3FCEF] text-[#006644] text-xs font-bold rounded" }, "THEME ACTIVE")
      )
    );
  };

  win.GalagaPlugin_JiraTheme = {
    Component: JiraThemeInfo
  };
})(window);
`;

/**
 * Robustly encodes a string to a Base64 Data URI.
 * Uses TextEncoder to handle non-ASCII characters correctly.
 */
const toBase64DataUri = (content: string, mimeType: string) => {
  try {
    const bytes = new TextEncoder().encode(content);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    return `data:${mimeType};base64,${b64}`;
  } catch (e) {
    console.error(`Base64 encoding failed for ${mimeType}:`, e);
    return '';
  }
};

export const getJiraPlugin = (): PluginConfig => {
  const cssUri = toBase64DataUri(JIRA_CSS, 'text/css');
  const jsUri = toBase64DataUri(JIRA_JS, 'text/javascript');

  return {
    id: JIRA_MANIFEST.id,
    enabled: false,
    manifest: JIRA_MANIFEST,
    files: {
      "index.js": jsUri,
      "style.css": cssUri
    }
  };
};
