import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React from 'react';
import { PaymentStatus, usePayment } from '../../hooks/usePayment';
import { BackButton } from '../buttons/BackButton';
import { TransactionsLink } from '../buttons/TransactionsLink';
import { PoweredBy } from '../sections/PoweredBy';
import { Progress } from '../sections/Progress';
import css from './ConfirmedPage.module.css';

const ConfirmedPage: NextPage = () => {
    const router = useRouter();
    const { reference, reset, signature, status } = usePayment();
    const [activating, setActivating] = React.useState(false);
    const [activationError, setActivationError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (router.query.gate !== '1') return;
        if (status !== PaymentStatus.Finalized) return;
        if (!signature || !reference || activating) return;

        let cancelled = false;
        setActivating(true);
        setActivationError(null);

        void fetch('/api/gate/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signature, reference }),
        })
            .then(async (response) => {
                const body = await response.json();
                if (!response.ok) {
                    throw new Error(body.error || 'gate_activation_failed');
                }
                if (!cancelled) {
                    router.replace('/agents');
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setActivationError(error instanceof Error ? error.message : 'gate_activation_failed');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setActivating(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activating, reference, router, signature, status]);

    return (
        <div className={css.root}>
            <div className={css.header}>
                <BackButton onClick={reset}>Start Over</BackButton>
                <TransactionsLink />
            </div>
            <div className={css.main}>
                <Progress />
                {router.query.gate === '1' ? (
                    <div style={{ marginTop: 18, color: '#cfc1a6', textAlign: 'center', lineHeight: 1.6 }}>
                        {activating
                            ? 'Verifying CLAWD transfer and opening the gated agent district...'
                            : activationError
                              ? `Gate activation failed: ${activationError}`
                              : 'Finalizing CLAWD gate access...'}
                    </div>
                ) : null}
            </div>
            <div className={css.footer}>
                <PoweredBy />
            </div>
        </div>
    );
};

export default ConfirmedPage;
