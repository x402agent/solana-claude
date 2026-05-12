import React, { FC } from 'react';
import { SolanaPayLogo } from '../images/SolanaPayLogo';
import css from './PoweredBy.module.css';

export const PoweredBy: FC = () => {
    return (
        <div className={css.root}>
            OpenClawd POS · Solana Pay · USDC <SolanaPayLogo />
        </div>
    );
};
