import { createTransfer } from '@solana/pay';
import type { Address } from '@solana/kit';
import {
    address,
    createNoopSigner,
    createTransactionMessage,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    compileTransaction,
    getBase64EncodedWireTransaction,
} from '@solana/kit';
import { NextApiHandler } from 'next';
import { rpc } from '../core';
import { getMerchantCatalog, getMerchantProduct } from '../core/catalog';
import { getPosRecipient } from '../core/runtime';
import { cors, rateLimit } from '../middleware';

interface GetResponse {
    label: string;
    icon: string;
}

const get: NextApiHandler<GetResponse> = async (request, response) => {
    const itemField = request.query.item;
    if (itemField && typeof itemField !== 'string') throw new Error('invalid item');

    const product = getMerchantProduct(itemField);
    const labelField = request.query.label;
    const fallbackLabel = product ? `${product.title} · OpenClawd` : getMerchantCatalog().merchant.name;
    const label = typeof labelField === 'string' ? labelField : fallbackLabel;

    const icon = `https://${request.headers.host}/solana-pay-logo.svg`;

    response.status(200).send({
        label,
        icon,
    });
};

interface PostResponse {
    transaction: string;
    message?: string;
}

const post: NextApiHandler<PostResponse> = async (request, response) => {
    const catalog = getMerchantCatalog();
    const recipientField =
        typeof request.query.recipient === 'string'
            ? request.query.recipient
            : getPosRecipient();
    if (!recipientField) throw new Error('missing recipient');
    const recipient = address(recipientField);

    const itemField = request.query.item;
    if (itemField && typeof itemField !== 'string') throw new Error('invalid item');
    const product = getMerchantProduct(itemField);

    const amountField =
        typeof request.query.amount === 'string'
            ? request.query.amount
            : product?.price.amount;
    if (!amountField) throw new Error('missing amount');
    const amount = parseFloat(amountField);

    const splTokenField = request.query['spl-token'];
    if (splTokenField && typeof splTokenField !== 'string') throw new Error('invalid spl-token');
    const splToken: Address | undefined = splTokenField
        ? address(splTokenField)
        : catalog.products[0]
            ? address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
            : undefined;

    const referenceField = request.query.reference;
    if (!referenceField) throw new Error('missing reference');
    if (typeof referenceField !== 'string') throw new Error('invalid reference');
    const reference = address(referenceField);

    const memoParam = request.query.memo;
    if (memoParam && typeof memoParam !== 'string') throw new Error('invalid memo');
    const memo = memoParam || (product ? `openclawd:${product.id}` : undefined);

    const messageParam = request.query.message;
    if (messageParam && typeof messageParam !== 'string') throw new Error('invalid message');
    const message =
        messageParam ||
        (product ? `OpenClawd checkout for ${product.title}` : 'OpenClawd agentic commerce settlement');

    const accountField = request.body?.account;
    if (!accountField) throw new Error('missing account');
    if (typeof accountField !== 'string') throw new Error('invalid account');
    const account = address(accountField);

    const senderSigner = createNoopSigner(account);
    const instructions = await createTransfer(rpc, senderSigner, {
        recipient,
        amount,
        splToken,
        reference,
        memo,
    });

    // Build a transaction message from the instructions
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const txMessage = appendTransactionMessageInstructions(
        instructions,
        setTransactionMessageLifetimeUsingBlockhash(
            latestBlockhash,
            setTransactionMessageFeePayer(
                account,
                createTransactionMessage({ version: 0 })
            )
        )
    );

    // Compile and serialize to base64 wire format
    const compiled = compileTransaction(txMessage);
    const base64 = getBase64EncodedWireTransaction(compiled);

    response.status(200).send({ transaction: base64, message });
};

const index: NextApiHandler<GetResponse | PostResponse> = async (request, response) => {
    await cors(request, response);
    await rateLimit(request, response);

    if (request.method === 'GET') return get(request, response);
    if (request.method === 'POST') return post(request, response);

    throw new Error(`Unexpected method ${request.method}`);
};

export default index;
