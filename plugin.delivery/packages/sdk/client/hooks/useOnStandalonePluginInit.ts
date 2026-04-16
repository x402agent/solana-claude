import { useEffect } from 'react';

import { PluginPayload, solana-clawdOS } from '@/client';

export const useOnStandalonePluginInit = <T = any>(
  callback: (payload: PluginPayload<T>) => void,
) => {
  useEffect(() => {
    solana-clawdOS.getPluginPayload().then((e) => {
      if (!e) return;

      callback(e);
    });
  }, []);
};

