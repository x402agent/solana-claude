<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,20:EA4335,45:FBBC04,70:4285F4,100:05060d&height=220&section=header&text=Clawd%20Agent%20Gateway&fontSize=48&fontColor=ffffff&animation=twinkling&fontAlignY=38&desc=Private%20Preview%20governance%20surface%20for%20ADK%20agents&descAlignY=60&descSize=16" alt="Clawd Agent Gateway" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=17&duration=1700&pause=350&color=FBBC04&center=true&vCenter=true&width=940&lines=registry+%E2%86%92+gateway+%E2%86%92+destinations;MCP+policy+surface+for+tools%2Fcall+and+tools%2Flist;IAP%2C+Model+Armor%2C+and+custom+authorization+extension+ready;private+ADK+manifest+at+%2Fadk%2Fmanifest.json" alt="Gateway flow" />

</div>

---

> [!WARNING]
> **Private Preview --- Agent Gateway**
>
> This feature is subject to the "Pre-GA Offerings Terms" in the General
> Service Terms section of the [Service Specific
> Terms](https://cloud.google.com/terms/service-terms#1). This feature provides capabilities to govern and secure AI Agents, so
> the "Agentic AI Services" Service Specific Terms apply. Pre-GA features are
> available "as is" and might have limited support. For
> more information, see the [launch
> stage descriptions](https://cloud.google.com/products/#product-launch-stages).
>
> To request access to use Agent Gateway with Agent Runtime,
> see the [access request page](https://forms.gle/ZLNYKUDW7j2B4a8K7).

# Clawd Gateway

This folder contains the HTTP gateway that exposes Clawd agent metadata, private Google ADK manifest data, registry discovery, and x402-facing destinations.

## Local Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /registry` | Main Clawd registry document with Google ADK metadata |
| `GET /identity` | Human-readable identity and registry guide |
| `GET /adk/manifest.json` | Private Google ADK connection manifest |
| `GET /metadata/agent{1,2,3}.json` | Metaplex-style agent metadata |
| `GET /capabilities/agent{1,2,3}.json` | Capability documents |

The ADK manifest includes:

- private mode status
- nine governed destination URLs
- external Agent Registry destination metadata
- installed catalog coverage for all source-backed agents
- links to `/api/agents`, `/api/agents/catalog`, and `/api/agents/registry`

## Security Boundary

The gateway README is intentionally safe to publish. It documents the control plane, required permissions, and deployment patterns, but it does not include live RPC URLs, API keys, wallet material, bot tokens, UCAN credentials, or local operator secrets.

Public docs can describe:

- endpoint paths and non-secret registry metadata
- Google Cloud permission names and API names
- placeholder YAML for Agent Gateway resources
- policy examples that use `PROJECT_ID`, `LOCATION`, and `AGENT_GATEWAY_NAME`

Private runtime values must stay in local `.env` files, secret managers, or shell-only exports.

## Required Google Cloud APIs

Enable these APIs in the project used for an Agent Gateway deployment:

- Compute Engine API
- Network Security API
- Network Services API

Optional:

- Model Armor API

## Required Permissions

Create and manage Agent Gateways with a custom role or predefined roles that include:

```text
compute.networkAttachments.list
compute.regions.list
modelarmor.templates.list
networksecurity.authzPolicies.create
networksecurity.authzPolicies.delete
networksecurity.authzPolicies.get
networksecurity.authzPolicies.list
networksecurity.operations.get
networkservices.agentGateways.create
networkservices.agentGateways.delete
networkservices.agentGateways.get
networkservices.agentGateways.list
networkservices.agentGateways.update
networkservices.agentGateways.use
networkservices.authzExtensions.create
networkservices.authzExtensions.delete
networkservices.authzExtensions.get
networkservices.authzExtensions.list
networkservices.authzExtensions.update
networkservices.authzExtensions.use
networkservices.operations.get
```

## Agent-to-Anywhere Egress

Use egress mode when Clawd or an ADK-hosted agent must reach governed tools, MCP servers, or external APIs.

```yaml
name: AGENT_GATEWAY_NAME
protocols:
  - MCP
googleManaged:
  governedAccessPath: AGENT_TO_ANYWHERE
registries:
  - AGENT_REGISTRY_PATH
```

Create or update the gateway:

```bash
gcloud alpha network-services agent-gateways import AGENT_GATEWAY_NAME \
  --source="my-agent-gateway-egress.yaml" \
  --location=LOCATION
```

For Agent Runtime agents, use a regional registry path. For Gemini Enterprise, use the project's global registry path.

Registry paths:

| Integration | Registry path |
| --- | --- |
| Agent Runtime | `//agentregistry.googleapis.com/projects/PROJECT_ID/locations/REGION` |
| Gemini Enterprise | `//agentregistry.googleapis.com/projects/PROJECT_ID/locations/global` |

A single Agent Gateway cannot serve both registry styles at the same time. Deploy a dedicated regional gateway for Agent Runtime and a dedicated global-registry gateway for Gemini Enterprise.

## Client-to-Agent Ingress

Use ingress mode when client traffic should enter through the governed gateway before reaching an agent.

```yaml
name: AGENT_GATEWAY_NAME
protocols:
  - MCP
googleManaged:
  governedAccessPath: CLIENT_TO_AGENT
```

Create or update the gateway:

```bash
gcloud alpha network-services agent-gateways import AGENT_GATEWAY_NAME \
  --source="my-agent-gateway-ingress.yaml" \
  --location=LOCATION
```

## VPC Connectivity

For private outbound connectivity, attach the gateway to a Private Service Connect network attachment and configure DNS peering.

```yaml
networkConfig:
  egress:
    networkAttachment: PSC_NETWORK_ATTACHMENT_URI
  dnsPeeringConfig:
    domains:
      - DOMAIN_NAME.
    targetProject: TARGET_PROJECT_ID
    targetNetwork: projects/TARGET_PROJECT_ID/global/networks/NETWORK_NAME
```

Agent Gateway network attachments require at least a `/28` subnet and must use supported private ranges.

## Authorization Policies

Agent Gateway can enforce request or content policies:

| Policy profile | Use |
| --- | --- |
| `REQUEST_AUTHZ` | Header and protocol-level authorization, including MCP method restrictions |
| `CONTENT_AUTHZ` | Request/response body inspection for Model Armor or custom processors |

Common delegation targets:

- Identity-Aware Proxy for centralized access decisions
- Model Armor for AI safety checks
- custom authorization extensions over gRPC

### IAP Request Authorization

Use IAP when access decisions should be made before the request reaches the destination.

```yaml
name: clawd-iap-request-authz-ext
service: iap.googleapis.com
failOpen: true
timeout: 1s
```

```yaml
name: clawd-iap-request-authz-policy
target:
  resources:
    - "projects/PROJECT_ID/locations/LOCATION/agentGateways/AGENT_GATEWAY_NAME"
policyProfile: REQUEST_AUTHZ
action: CUSTOM
customProvider:
  authzExtension:
    resources:
      - "projects/PROJECT_ID/locations/LOCATION/authzExtensions/clawd-iap-request-authz-ext"
```

For audit-only rollout, add metadata such as `iamEnforcementMode: "DRY_RUN"` to the extension and remove it when enforcement is ready.

### Model Armor Content Authorization

Use Model Armor when prompts, tool payloads, or responses need content inspection.

```yaml
name: clawd-ma-content-authz-ext
service: modelarmor.LOCATION.rep.googleapis.com
metadata:
  model_armor_settings: '[
    {
      "request_template_id": "projects/MODEL_ARMOR_PROJECT_ID/locations/LOCATION/templates/REQUEST_TEMPLATE_ID",
      "response_template_id": "projects/MODEL_ARMOR_PROJECT_ID/locations/LOCATION/templates/RESPONSE_TEMPLATE_ID"
    }
  ]'
failOpen: true
timeout: 1s
```

```yaml
name: clawd-ma-content-authz-policy
target:
  resources:
    - "projects/PROJECT_ID/locations/LOCATION/agentGateways/AGENT_GATEWAY_NAME"
policyProfile: CONTENT_AUTHZ
action: CUSTOM
customProvider:
  authzExtension:
    resources:
      - "projects/PROJECT_ID/locations/LOCATION/authzExtensions/clawd-ma-content-authz-ext"
httpRules:
  - to:
      operations:
        - paths:
            - prefix: "/"
    when: >
      request.headers['content-type'] == 'application/json' ||
      request.headers['content-type'].startsWith('text/')
```

Grant the Agent Gateway service account the required Model Armor callout and template roles when the gateway and templates live in different projects.

### Custom Authorization Extension

Custom authorization extensions can point to internal FQDNs that implement the expected Service Extensions protocol. Keep those endpoints private through VPC connectivity and DNS peering.

```yaml
name: clawd-custom-authz-ext
service: authz.internal.example
failOpen: true
timeout: 1s
wireFormat: EXT_AUTHZ_GRPC
```

Use `REQUEST_AUTHZ` for header/protocol decisions. Use `CONTENT_AUTHZ` only when the service supports streamed request and response body inspection.

## MCP Tool Restrictions

For MCP, allow base protocol methods and explicitly permit tool calls:

```yaml
name: clawd-allow-selected-tools
target:
  resources:
    - "projects/PROJECT_ID/locations/LOCATION/agentGateways/AGENT_GATEWAY_NAME"
policyProfile: REQUEST_AUTHZ
httpRules:
  - to:
      operations:
        - mcp:
            baseProtocolMethodsOption: MATCH_BASE_PROTOCOL_METHODS
            methods:
              - name: "tools/list"
              - name: "tools/call"
                params:
                  - exact: "get_agent_catalog_stats"
                  - exact: "search_agent_catalog"
                  - exact: "get_private_destinations"
action: ALLOW
```

For deny policies, target a method family such as `prompts` or an unsafe tool name. For allow policies, always include `baseProtocolMethodsOption: MATCH_BASE_PROTOCOL_METHODS` so initialization, logging, completion, notifications, and ping can continue to work.

## Agent Identity

Agent Identity gives each deployed agent a strongly attested SPIFFE-style identity:

```text
spiffe://TRUST_DOMAIN/resources/SERVICE/RESOURCE_PATH
principal://TRUST_DOMAIN/resources/SERVICE/RESOURCE_PATH
```

Use the principal form in IAM allow policies. Unlike shared service accounts, agent identities are per-agent, cannot be impersonated in the same way, and do not require long-lived service account keys in the repository.

Agent Identity auth manager can hold API key, OAuth 2-legged, OAuth 3-legged, and delegated end-user credentials. When used with Agent Gateway and Gemini Enterprise, end-user credentials are decrypted at the gateway boundary instead of being exposed directly to the agent.

## Agent Registry

Agent Registry is the inventory layer for discoverable agents, MCP servers, tools, and governed endpoints. For Clawd, the registry contract is:

| Registry task | Clawd mapping |
| --- | --- |
| Register agents | Source-backed agent records in `agents/src/*.json` |
| Register MCP servers | Gateway destinations and MCP-capable tool surfaces |
| Search agents and tools | `search_agent_catalog` in the ADK agent |
| Resolve endpoints | `/adk/manifest.json` plus private destination metadata |
| Register custom ADK agent | `adk/agent.ts` exported `rootAgent` |

Only registered destinations should be reachable through a governed production gateway.

## Safety Stack

The recommended safety posture is layered:

| Layer | Purpose |
| --- | --- |
| Gemini model defaults | baseline safety behavior |
| Configurable filters | threshold-based harm filtering |
| System instructions | brand, scope, and operating constraints |
| DLP | sensitive data detection, masking, or blocking |
| Gemini as a filter | custom policy evaluation for prompts, tool results, and responses |
| Model Armor | centralized gateway-level content guardrails |

Use gateway content authorization for traffic that crosses trust boundaries. Use local checks before a tool call when the risk is specific to Clawd execution, wallet operations, swaps, or deployment actions.

## Memory Bank Pattern

Agent Platform Sessions and Memory Bank can be used when a deployed agent needs durable user context:

1. Create a session for an opaque user ID.
2. Append ordered user, agent, and tool events.
3. Generate memories from the session or upload pre-extracted facts.
4. Retrieve scoped memories and inject them into system instructions.
5. Delete by resource name, filter criteria, or explicit user instruction.

For this repo, Memory Bank wiring must keep scopes opaque and must not store private keys, seed phrases, raw RPC credentials, bot tokens, or user secrets as memories.

## Monitoring

Agent Gateway logs use the monitored resource:

```text
networkservices.googleapis.com/Gateway
```

Logs Explorer query:

```text
resource.type="networkservices.googleapis.com/Gateway"
resource.labels.location="REGION"
resource.labels.gateway_name="AGENT_GATEWAY_NAME"
```

The log payload can include gateway request info, MCP method info, and the matched Agent Registry resource.

## Limits To Design Around

- Maximum four custom authorization policies per Agent Gateway.
- Multiple custom policies with the same profile do not have guaranteed order.
- `CONTENT_AUTHZ` custom extensions must support streamed body processing.
- Gemini Enterprise egress requires the region that maps to the Gemini Enterprise location, such as `global` or `us` to `us-central1`, and `eu` to `europe-west1`.

## Local Build

```bash
npm --prefix gateway run build
npm --prefix gateway start
```

Keep real RPC URLs, API keys, wallet keys, and bot tokens in local env files or secret managers only.
