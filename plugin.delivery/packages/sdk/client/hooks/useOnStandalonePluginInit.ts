import { useEffect } from 'react';

import { PluginPayload, SolanaClawdOS } from '@/client';

export const useOnStandalonePluginInit = <T = any>(
  callback: (payload: PluginPayload<T>) => void,
) => {
  useEffect(() => {
    SolanaClawdOS.getPluginPayload().then((e) => {
      if (!e) return;

      callback(e);
    });
  }, []);
};

