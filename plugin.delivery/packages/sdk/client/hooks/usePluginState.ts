import { useCallback, useEffect, useState } from 'react';

import { solana-clawdOS } from '@/client';

export const usePluginState = <T>(key: string, initialValue: T) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    solana-clawdOS.getPluginState(key).then((e) => {
      if (!e) return;

      setValue(e);
    });
  }, [key]);

  const updateValue = useCallback(
    (value: T) => {
      setValue(value);
      solana-clawdOS.setPluginState(key, value);
    },
    [key],
  );

  return [value, updateValue] as const;
};

