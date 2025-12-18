
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
    if (!config || !config.enabled) {
      setState({ plugin: null, loading: false, error: null });
      return;
    }

    const { manifest, files } = config;
    const globalName = manifest.globalVar;
    const mainScriptUrl = files[manifest.main];
    const styleUrl = manifest.style ? files[manifest.style] : null;

    if (!mainScriptUrl) {
        setState({ 
          plugin: null, 
          loading: false, 
          error: `Configuration Error: Entry file '${manifest.main}' not found in the package resources. (Available: ${Object.keys(files).join(', ')})` 
        });
        return;
    }

    setState({ plugin: null, loading: true, error: null });

    let link: HTMLLinkElement | null = null;
    if (styleUrl) {
        const linkId = `plugin-style-${config.id}`;
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

    const loadScript = () => {
        const scriptId = `plugin-script-${config.id}`;
        
        if ((window as any)[globalName]) {
             const loadedModule = (window as any)[globalName];
             const resolved = loadedModule.default || loadedModule;
             setState({ plugin: resolved, loading: false, error: null });
             return null; 
        }

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
              error: `Runtime Error: Script loaded, but 'window.${globalName}' was not initialized. Check your Vite 'name' config.` 
            });
          }
        };

        const handleError = () => {
          setState({ 
            plugin: null, 
            loading: false, 
            error: `Network Error: Failed to load entry point '${manifest.main}'. The file might be corrupted or incorrectly served.` 
          });
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        return { script, handleLoad, handleError };
    };

    const scriptHandles = loadScript();

    return () => {
      if (link && document.head.contains(link)) {
          document.head.removeChild(link);
      }

      if (scriptHandles) {
          const { script, handleLoad, handleError } = scriptHandles;
          script.removeEventListener('load', handleLoad);
          script.removeEventListener('error', handleError);
          
          if (document.body.contains(script)) {
              document.body.removeChild(script);
          }
          
          if ((window as any)[globalName]) {
              delete (window as any)[globalName];
          }
      }
    };
  }, [config.id, config.enabled, config.manifest.main]);

  return state;
};
