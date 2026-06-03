
import { PluginConfig, PluginManifest } from '../types';

export const PROFESSIONAL_MANIFEST: PluginManifest = {
  id: "com.galagav.theme.professional",
  name: "Professional System Theme",
  version: "1.1.0",
  description: "An enterprise-grade system theme that transforms the dashboard into a professional, blue-scale interface.",
  main: "index.js",
  style: "style.css",
  globalVar: "GalagaPlugin_ProfessionalTheme",
  type: "theme"
};

export const PROFESSIONAL_CSS = `
/* Professional / Enterprise Theme Overrides (Jira-Inspired) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', -apple-system, sans-serif !important;
  background-color: #F4F5F7 !important;
  color: #172B4D !important;
}
.dark body { background-color: #0747A6 !important; color: #FFFFFF !important; }

/* Header */
header {
  background-color: #FFFFFF !important;
  border-bottom: 1px solid #DFE1E6 !important;
}
.dark header {
  background-color: #091E42 !important;
  border-bottom: 1px solid #253858 !important;
}

/* All text transforms */
h1, h2, h3, h4, h5, h6, button, input, textarea, select, .font-mono {
  font-family: 'Inter', sans-serif !important;
  letter-spacing: normal !important;
  text-transform: none !important;
}

/* Buttons */
button {
  border-radius: 3px !important;
  font-weight: 500 !important;
}

/* Primary Actions (Atlassian Blue) */
.bg-cyan-600, button.bg-cyan-600, .bg-emerald-600 {
  background-color: #0052CC !important;
}

/* Card Style */
.group.relative.rounded-xl {
  border-radius: 3px !important;
  border: 1px solid #DFE1E6 !important;
  box-shadow: 0 1px 1px rgba(9, 30, 66, 0.25) !important;
}

/* Remove Arcade Effects */
.scanlines { display: none !important; }
`;

export const PROFESSIONAL_JS = `
(function(global) {
  const React = global.React;
  
  const ProfessionalThemeInfo = () => {
    return React.createElement('div', { className: "p-12 flex flex-col items-center justify-center h-full text-center bg-[#F4F5F7] dark:bg-[#0747A6]" },
      React.createElement('div', { className: "bg-[#DEEBFF] p-4 rounded-full mb-6" },
        React.createElement(global.Lucide.Briefcase, { size: 40, className: "text-[#0052CC]" })
      ),
      React.createElement('h1', { className: "text-2xl font-bold text-[#172B4D] dark:text-white mb-4" }, "Enterprise Theme Active"),
      React.createElement('p', { className: "text-[#5E6C84] dark:text-[#EBECF0] max-w-md leading-relaxed" }, 
        "The system interface is using the Professional System Theme. All typography, color palettes, and UI density have been calibrated to Atlassian design standards."
      )
    );
  };

  global.GalagaPlugin_ProfessionalTheme = {
    Component: ProfessionalThemeInfo
  };
})(window);
`;

export const getProfessionalPlugin = (): PluginConfig => {
  const toBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));

  const cssUri = `data:text/css;base64,${toBase64(PROFESSIONAL_CSS)}`;
  const jsUri = `data:text/javascript;base64,${toBase64(PROFESSIONAL_JS)}`;

  return {
    id: PROFESSIONAL_MANIFEST.id,
    enabled: false,
    manifest: PROFESSIONAL_MANIFEST,
    files: {
      "index.js": jsUri,
      "style.css": cssUri
    }
  };
};
