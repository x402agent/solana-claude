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

## Local Build

```bash
npm --prefix gateway run build
npm --prefix gateway start
```

Keep real RPC URLs, API keys, wallet keys, and bot tokens in local env files or secret managers only.
