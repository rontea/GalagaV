import React from 'react';
import { GlobalConfig, PluginConfig } from '../types';
import { usePluginLoader } from '../hooks/usePluginLoader';

// Helper component to isolate hook usage for each plugin
const PluginInjector: React.FC<{ config: PluginConfig }> = ({ config }) => {
  usePluginLoader(config);
  return null;
};

interface PluginBootstrapProps {
  globalConfig: GlobalConfig;
}

const PluginBootstrap: React.FC<PluginBootstrapProps> = ({ globalConfig }) => {
  // Only load plugins that are enabled
  const enabledPlugins = (globalConfig.plugins || []).filter(p => p.enabled);

  return (
    <>
      {enabledPlugins.map(plugin => (
        <PluginInjector key={plugin.id} config={plugin} />
      ))}
    </>
  );
};

export default PluginBootstrap;