import { useState, useEffect } from 'react';
import { PluginConfig } from '../types';

interface PluginState {
  plugin: any | null;
  loading: boolean;
  error: string | null;
}

export const usePluginLoader = (config: PluginConfig): PluginState => {
  const [state, setState] = useState<PluginState>({
    plugin: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    // If config is missing or disabled, do nothing (or reset)
    if (!config || !config.enabled) {
      setState({ plugin: null, loading: false, error: null });
      return;
    }

    const { manifest, files } = config;
    const globalName = manifest.globalVar;
    const mainScriptUrl = files[manifest.main];
    const styleUrl = manifest.style ? files[manifest.style] : null;

    if (!mainScriptUrl) {
        setState({ plugin: null, loading: false, error: `Entry file '${manifest.main}' missing in plugin package.` });
        return;
    }

    setState({ plugin: null, loading: true, error: null });

    // 1. Inject CSS (Always ensure it exists when component mounts)
    let link: HTMLLinkElement | null = null;
    if (styleUrl) {
        const linkId = `plugin-style-${config.id}`;
        // Check if existing to prevent duplicates
        let existingLink = document.getElementById(linkId) as HTMLLinkElement;
        if (!existingLink) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleUrl;
            link.id = linkId;
            document.head.appendChild(link);
        } else {
            link = existingLink;
        }
    }

    // 2. Handle JS
    // We create a function to handle script injection so we can return cleanup handles
    const loadScript = () => {
        const scriptId = `plugin-script-${config.id}`;
        
        // A. Check Memory: If global var exists, use it immediately
        if ((window as any)[globalName]) {
             const loadedModule = (window as any)[globalName];
             const resolved = loadedModule.default || loadedModule;
             setState({ plugin: resolved, loading: false, error: null });
             // We return null handles because we didn't create a new script tag this pass
             return null; 
        }

        // B. Check DOM: If script tag exists (loading in progress), attach listeners to it
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (!script) {
            script = document.createElement('script');
            script.src = mainScriptUrl;
            script.async = true;
            script.id = scriptId;
            document.body.appendChild(script);
        }

        const handleLoad = () => {
          const loadedModule = (window as any)[globalName];
          if (loadedModule) {
            const resolved = loadedModule.default || loadedModule;
            setState({ plugin: resolved, loading: false, error: null });
          } else {
            setState({ 
              plugin: null, 
              loading: false, 
              error: `Script loaded but 'window.${globalName}' was not found.` 
            });
          }
        };

        const handleError = () => {
          setState({ 
            plugin: null, 
            loading: false, 
            error: `Failed to load plugin script: ${manifest.main}` 
          });
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        return { script, handleLoad, handleError };
    };

    const scriptHandles = loadScript();

    // CLEANUP FUNCTION
    // This runs when the component unmounts (e.g., plugin disabled or deleted)
    return () => {
      // 1. Remove CSS
      if (link && document.head.contains(link)) {
          document.head.removeChild(link);
      }

      // 2. Remove JS
      if (scriptHandles) {
          const { script, handleLoad, handleError } = scriptHandles;
          script.removeEventListener('load', handleLoad);
          script.removeEventListener('error', handleError);
          
          // Remove the script tag
          if (document.body.contains(script)) {
              document.body.removeChild(script);
          }
          
          // 3. Delete Global Variable
          // This ensures that if the plugin is re-added, it re-initializes fresh.
          if ((window as any)[globalName]) {
              delete (window as any)[globalName];
          }
      }
    };
  }, [config.id, config.enabled, config.manifest.main]); // Re-run if ID or entry point changes

  return state;
};