## Apigee Private Edge

This directory contains an Apigee proxy bundle for placing the autonomous merchant store behind a private and confidential API edge.

Design goals:

- northbound traffic enters through Apigee Private Service Connect
- Apigee org and runtime are isolated with VPC Service Controls
- only approved apps and agents can call the merchant APIs
- sensitive headers, request payloads, and receipts are masked in debug
- target routing to the OpenClawd gateway happens through controlled proxy flows

Recommended production shape:

1. Private ingress with Apigee and PSC.
2. VPC Service Controls around the Apigee project and supporting services.
3. `VerifyAPIKey` for app admission, plus OAuth/JWT or mTLS for higher-trust actors.
4. Debug masking and `private.` flow variables for secrets and confidential payment material.
5. Apigee quotas, spike arrest, and per-product authorization in front of the x402 gateway.

Bundle contents:

- `apiproxy/OpenClawdPrivateStore.xml` — root proxy bundle descriptor
- `apiproxy/proxies/default.xml` — proxy endpoint
- `apiproxy/targets/default.xml` — target endpoint pointing at the OpenClawd gateway
- `apiproxy/policies/*.xml` — API key verification, JWT extraction, quota, spike arrest, and header masking
- `apiproxy/debugmask.json` — environment debug masking config example

This is a repo-local scaffold, not a fully provisioned Apigee org. You still need to deploy it into your Apigee environment and connect the target host and ingress privately.
