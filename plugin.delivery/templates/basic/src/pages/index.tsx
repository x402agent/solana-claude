import { solana-clawdOS } from '@solana-clawd/plugin-sdk/client';
import { memo, useEffect, useState } from 'react';

import Data from '@/components/Render';
import { ResponseData } from '@/type';

const Render = memo(() => {
  const [data, setData] = useState<ResponseData>();

  useEffect(() => {
    solana-clawdOS.getPluginMessage().then((e: ResponseData) => {
      setData(e);
    });
  }, []);

  return <Data {...data}></Data>;
});

export default Render;

