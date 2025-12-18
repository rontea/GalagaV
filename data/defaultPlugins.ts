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
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif !important;
  background-color: #F4F5F7 !important;
}
.dark body { background-color: #172B4D !important; }

/* Header */
header {
  background-color: #FFFFFF !important;
  border-bottom: 1px solid #DFE1E6 !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
}
.dark header {
  background-color: #091E42 !important;
  border-bottom: 1px solid #253858 !important;
}

/* Project Cards */
.group.relative.rounded-xl {
  border-radius: 3px !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
  border: 1px solid #DFE1E6 !important;
}

/* Typography & Elements */
h1, h2, h3, h4, h5, h6, button, input, textarea, select {
  font-family: 'Roboto', sans-serif !important;
  letter-spacing: normal !important;
}

/* Buttons */
button {
  border-radius: 3px !important;
  font-weight: 500 !important;
  text-transform: none !important;
}

/* Primary Actions (Blue) */
button.bg-cyan-600, button.bg-emerald-600 {
  background-color: #0052CC !important;
}
button.bg-cyan-600:hover, button.bg-emerald-600:hover {
  background-color: #0747A6 !important;
}

/* Inputs */
input, textarea, select {
  border-radius: 3px !important;
  border: 2px solid #DFE1E6 !important;
  background-color: #FAFBFC !important;
  color: #172B4D !important;
}
input:focus, textarea:focus, select:focus {
  border-color: #4C9AFF !important;
  background-color: #FFFFFF !important;
  box-shadow: none !important;
}

/* Status Badges */
span.rounded-full, div.rounded {
  border-radius: 3px !important;
}

/* Remove Arcade Effects */
.scanlines { display: none !important; }
.font-mono { font-family: 'Roboto', sans-serif !important; }
`;

export const JIRA_JS = `
(function(global) {
  const React = global.React;
  
  // This component is only used if the plugin type is 'tool' or loaded manually.
  // Since we set type: 'theme', this component serves as metadata or preview if needed.
  const JiraThemeInfo = () => {
    return React.createElement('div', { className: "p-8 flex flex-col items-center justify-center h-full text-center" },
      React.createElement('div', { className: "bg-[#DEEBFF] p-4 rounded-full mb-4" },
        React.createElement(global.Lucide.Briefcase, { size: 32, className: "text-[#0052CC]" })
      ),
      React.createElement('h1', { className: "text-2xl font-bold text-[#172B4D] mb-4" }, "Enterprise Theme Active"),
      React.createElement('p', { className: "text-[#5E6C84] max-w-md" }, 
        "The system interface has been updated to use the Enterprise Design System. This theme overrides global styles to provide a cleaner, sans-serif look with professional blue accents."
      )
    );
  };

  global.GalagaPlugin_JiraTheme = {
    Component: JiraThemeInfo
  };
})(window);
`;

export const getJiraPlugin = (): PluginConfig => {
  // Helper to safe encode UTF-8 strings to Base64
  const toBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));

  const cssUri = `data:text/css;base64,${toBase64(JIRA_CSS)}`;
  const jsUri = `data:text/javascript;base64,${toBase64(JIRA_JS)}`;

  return {
    id: JIRA_MANIFEST.id,
    enabled: false, // Default to disabled
    manifest: JIRA_MANIFEST,
    files: {
      "index.js": jsUri,
      "style.css": cssUri
    }
  };
};