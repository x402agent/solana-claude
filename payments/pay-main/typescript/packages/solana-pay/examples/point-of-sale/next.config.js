/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    outputFileTracingRoot: __dirname,
    webpack: (config) => {
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            '@solana/codecs-numbers$': require.resolve('@solana/codecs-numbers'),
            'rpc-websockets$': require.resolve('rpc-websockets'),
        };
        return config;
    },
    async redirects() {
        return [
            {
                source: '/',
                destination: '/new',
                permanent: false,
                has: [
                    {
                        type: 'query',
                        key: 'recipient',
                    },
                    {
                        type: 'query',
                        key: 'label',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
