import { useCallback, useEffect, useState } from 'react';

import { SolanaClawdOS } from '@/client';

export const usePluginState = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    SolanaClawdOS.getPluginState(key).then((e) => {
      if (!e) return;

      setValue(e);
    });
  }, [key]);

  const updateValue = useCallback(
    (value: T) => {
      setValue(value);
      SolanaClawdOS.setPluginState(key, value);
    },
    [key],
  );

  return [value, updateValue] as const;
};

