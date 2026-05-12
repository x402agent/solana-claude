import { useCallback, useEffect, useState } from 'react';

import { SolanaClawdOS } from '@/client';

export const usePluginSettings = <T>(initialValue: T) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    SolanaClawdOS.getPluginSettings().then((e) => {
      if (!e) return;

      setValue(e);
    });
  }, []);

  const updateValue = useCallback((value: T) => {
    setValue(value);
    SolanaClawdOS.setPluginSettings(value);
  }, []);

  return [value, updateValue] as const;
};

