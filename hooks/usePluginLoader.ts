
import { useState, useEffect } from 'react';
import { PluginConfig } from '../types';

interface PluginState {
  plugin: any | null;
  loading: boolean;
  error: string | null;
}

// Global registry to track scripts being loaded to avoid race conditions
const loadingScripts = new Set<string>();

/**
 * Simple hash function to generate a short signature for strings.
 * Used to detect content changes in the main script.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export const usePluginLoader = (config: PluginConfig): PluginState => {
  const [state, setState] = useState<PluginState>({
    plugin: null,
    loading: false,
    error: null,
  });

  const { manifest, files } = config;
  const globalName = manifest.globalVar;
  const mainScriptUrl = files[manifest.main];
  const styleUrl = manifest.style ? files[manifest.style] : null;
  
  // Create a content-aware script ID
  // If the code changes, this ID will change, forcing re-injection
  const contentHash = mainScriptUrl ? simpleHash(mainScriptUrl) : 'no-content';
  const scriptId = `plugin-script-${config.id}-${contentHash}`;

  useEffect(() => {
    if (!config || !config.enabled) {
      setState({ plugin: null, loading: false, error: null });
      return;
    }

    if (!mainScriptUrl) {
        setState({ 
          plugin: null, 
          loading: false, 
          error: `Configuration Error: Entry file '${manifest.main}' not found in resources.` 
        });
        return;
    }

    // Check if already in global scope AND matches current scriptId
    // If the global exists but we have a NEW script ID, we must purge and reload
    const existingScript = document.getElementById(scriptId);
    if ((window as any)[globalName] && existingScript) {
      const loadedModule = (window as any)[globalName];
      const resolved = loadedModule.default || loadedModule;
      console.log(`[PLUGIN_BRIDGE] Module verified: window.${globalName}`);
      setState({ plugin: resolved, loading: false, error: null });
      return;
    }

    setState({ plugin: null, loading: true, error: null });

    // Stylesheet injection
    let link: HTMLLinkElement | null = null;
    if (styleUrl) {
        // Styles use content hash too to ensure updates
        const styleHash = simpleHash(styleUrl);
        const styleId = `plugin-style-${config.id}-${styleHash}`;
        let existingLink = document.getElementById(styleId) as HTMLLinkElement;
        if (!existingLink) {
            // Clean up old styles for this plugin
            const oldStyles = document.querySelectorAll(`link[id^="plugin-style-${config.id}-"]`);
            oldStyles.forEach(s => s.remove());

            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleUrl;
            link.id = styleId;
            document.head.appendChild(link);
        } else {
            link = existingLink;
        }
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const handleLoad = () => {
      loadingScripts.delete(scriptId);
      const loadedModule = (window as any)[globalName];
      if (loadedModule) {
        const resolved = loadedModule.default || loadedModule;
        console.log(`[PLUGIN_BRIDGE] Successfully bridged module: window.${globalName} (Content ID: ${contentHash})`);
        setState({ plugin: resolved, loading: false, error: null });
      } else {
        setState({ 
          plugin: null, 
          loading: false, 
          error: `Runtime Error: Global 'window.${globalName}' was not initialized. Check plugin's build configuration.` 
        });
      }
    };

    const handleError = () => {
      loadingScripts.delete(scriptId);
      setState({ 
        plugin: null, 
        loading: false, 
        error: `Network Error: Failed to execute entry point '${manifest.main}'.` 
      });
    };

    if (!script) {
        // Before creating new script, purge old scripts of the same plugin ID
        const oldScripts = document.querySelectorAll(`script[id^="plugin-script-${config.id}-"]`);
        oldScripts.forEach(s => s.remove());
        
        // Also purge the global variable to ensure fresh initialization
        if ((window as any)[globalName]) {
          delete (window as any)[globalName];
        }

        script = document.createElement('script');
        script.src = mainScriptUrl;
        script.async = true;
        script.id = scriptId;
        loadingScripts.add(scriptId);
        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
        document.body.appendChild(script);
    } else {
        // If script tag exists but module not yet in window, wait for it
        if (loadingScripts.has(scriptId)) {
            script.addEventListener('load', handleLoad);
            script.addEventListener('error', handleError);
        } else {
            // Already loaded but maybe not assigned to state yet
            handleLoad();
        }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      }
    };
  }, [config.id, config.enabled, mainScriptUrl, styleUrl, globalName, scriptId, contentHash]);

  return state;
};
