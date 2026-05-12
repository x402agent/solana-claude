import { AppProvider } from '@solana/connector/react';
import { getDefaultConfig } from '@solana/connector/headless';
import type { Address } from '@solana/kit';
import { address } from '@solana/kit';
import { AppContext, AppProps as NextAppProps, default as NextApp } from 'next/app';
import { AppInitialProps } from 'next/dist/shared/lib/utils';
import { FC, useMemo } from 'react';
import { MAINNET_ENDPOINT, MAINNET_USDC_MINT } from '../../utils/constants';
import { ConfigProvider } from '../contexts/ConfigProvider';
import { FullscreenProvider } from '../contexts/FullscreenProvider';
import { PaymentProvider } from '../contexts/PaymentProvider';
import { ThemeProvider } from '../contexts/ThemeProvider';
import { TransactionsProvider } from '../contexts/TransactionsProvider';
import { SolanaPayLogo } from '../images/SolanaPayLogo';
import { USDCIcon } from '../images/USDCIcon';
import css from './App.module.css';

interface AppProps extends NextAppProps {
    host: string;
    query: {
        recipient?: string;
        label?: string;
        message?: string;
        amount?: string;
        item?: string;
    };
}

const connectorConfig = getDefaultConfig({
    appName: 'OpenClawd Agentic POS',
    autoConnect: true,
    network: 'mainnet',
});

const App: FC<AppProps> & { getInitialProps(appContext: AppContext): Promise<AppInitialProps> } = ({
    Component,
    host,
    query,
    pageProps,
}) => {
    const baseURL = `https://${host}`;

    // If you're testing without a mobile wallet, set this to true to allow a browser wallet to be used.
    const connectWallet = false;

    const link = useMemo(() => new URL(`${baseURL}/api/`), [baseURL]);

    let recipient: Address | undefined = undefined;
    const { recipient: recipientParam, label, message } = query;
    if (recipientParam && label) {
        try {
            recipient = address(recipientParam);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <ThemeProvider>
            <FullscreenProvider>
                {recipient && label ? (
                    <AppProvider connectorConfig={connectorConfig}>
                            <ConfigProvider
                                baseURL={baseURL}
                                link={link}
                                recipient={recipient}
                                label={label}
                                message={message}
                                splToken={MAINNET_USDC_MINT}
                                symbol="USDC"
                                icon={<USDCIcon />}
                                decimals={6}
                                minDecimals={2}
                                connectWallet={connectWallet}
                            >
                            <TransactionsProvider>
                                <PaymentProvider>
                                    <Component {...pageProps} />
                                </PaymentProvider>
                            </TransactionsProvider>
                        </ConfigProvider>
                    </AppProvider>
                ) : (
                    <div className={css.logo}>
                        <SolanaPayLogo width={240} height={88} />
                    </div>
                )}
            </FullscreenProvider>
        </ThemeProvider>
    );
};

App.getInitialProps = async (appContext) => {
    const props = await NextApp.getInitialProps(appContext);

    const { query, req } = appContext.ctx;
    const recipient = query.recipient as string;
    const label = query.label as string;
    const message = query.message || undefined;
    const amount = query.amount as string | undefined;
    const item = query.item as string | undefined;
    const host = req?.headers.host || 'localhost:3001';

    return {
        ...props,
        query: { recipient, label, message, amount, item },
        host,
    };
};

export default App;
