import { useCallback, useEffect, useState } from 'react';

import { solana-clawdOS } from '@/client';

export const usePluginSettings = <T>(initialValue: T) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    solana-clawdOS.getPluginSettings().then((e) => {
      if (!e) return;

      setValue(e);
    });
  }, []);

  const updateValue = useCallback((value: T) => {
    setValue(value);
    solana-clawdOS.setPluginSettings(value);
  }, []);

  return [value, updateValue] as const;
};

