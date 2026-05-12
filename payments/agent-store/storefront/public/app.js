const state = {
  config: null,
  store: null,
  moonpayCapabilities: null,
  moonpayWorkbench: null,
  placesService: null,
  googleReady: false,
};

init().catch((error) => {
  console.error(error);
  document.getElementById("places-results").textContent = "Storefront failed to initialize.";
});

async function init() {
  const [configRes, storeRes] = await Promise.all([
    fetch("/api/config"),
    fetch("/api/store"),
  ]);

  state.config = await configRes.json();
  state.store = await storeRes.json();

  const [capabilitiesRes, workbenchRes] = await Promise.all([
    fetch("/api/moonpay/capabilities"),
    fetch("/api/moonpay/workbench"),
  ]);
  state.moonpayCapabilities = await capabilitiesRes.json();
  state.moonpayWorkbench = await workbenchRes.json();

  renderMetrics();
  renderSecurity();
  renderOffers();
  renderProducts();
  renderMoonPay();
  renderMoonPayAgentOps();
  renderFleet();
  bindPlaces();
  bindMoonPay();

  if (state.config.public.googleApiKey) {
    await loadGooglePlaces(state.config.public.googleApiKey);
  }
}

function renderMetrics() {
  const { manifest } = state.store;
  const metrics = [
    ["Fleet Agents", String(manifest.agents.length)],
    ["Protocols", manifest.commerce.protocols.join(" · ")],
    ["Ingress", "Apigee + PSC"],
    ["Settlement", manifest.commerce.settlementAsset],
  ];

  document.getElementById("metrics").innerHTML = metrics
    .map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

function renderSecurity() {
  const { manifest } = state.store;
  const items = [
    "Apigee private ingress with Private Service Connect.",
    "VPC Service Controls perimeter for production isolation.",
    "Trace/debug masking with private.* flow variables.",
    `Admitted agents only: ${manifest.policy.allowAgents.join(", ")}.`,
    `Denied by policy: ${manifest.policy.denyAgents.join(", ")}.`,
  ];
  document.getElementById("security-list").innerHTML = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function renderOffers() {
  const offers = state.store.catalog.featuredOffers || [];
  document.getElementById("offers").innerHTML = offers
    .map(
      (offer) => `
        <article class="offer">
          <h3>${escapeHtml(offer.label)}</h3>
          <p>${escapeHtml(offer.category)}</p>
          <div class="meta-line">
            <span class="chip">${escapeHtml(offer.price)}</span>
            <span class="chip">${escapeHtml(offer.protocol)}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderProducts() {
  const products = state.store.catalog.products || [];
  document.getElementById("products").innerHTML = products
    .map(
      (product) => `
        <article class="product">
          <h3>${escapeHtml(product.title)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <div class="meta-line">
            <span class="chip">${escapeHtml(product.price.amount)} ${escapeHtml(product.price.asset)}</span>
            ${product.protocols.map((protocol) => `<span class="chip">${escapeHtml(protocol)}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderMoonPay() {
  const { public: publicConfig, guards } = state.config;
  const link = document.getElementById("moonpay-link");
  const summary = document.getElementById("moonpay-summary");
  const configBox = document.getElementById("merchant-config");

  link.href = buildMoonPayUrl(publicConfig);
  summary.textContent = publicConfig.moonPayApiKey
    ? "Client-side onramp uses the MoonPay publishable key, merchant id, and target wallet only. Secret keys stay server-side."
    : "MoonPay public config is not loaded yet. Add it to .env.local before demo time.";

  const rows = [
    ["Merchant ID", publicConfig.moonPayMerchantId || "missing"],
    ["Wallet", publicConfig.moonPayWallet || "missing"],
    ["Bucket", publicConfig.merchantBucket || "missing"],
    ["SFTP Host", publicConfig.merchantServer || "missing"],
    ["Secrets Protected", guards.secretsProtected ? "yes" : "no"],
  ];

  configBox.innerHTML = rows
    .map(([label, value]) => `<div class="terminal-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

function renderMoonPayAgentOps() {
  const capabilityBox = document.getElementById("moonpay-capabilities");
  const workbenchBox = document.getElementById("moonpay-workbench");
  const caps = state.moonpayCapabilities;
  const workbench = state.moonpayWorkbench;

  capabilityBox.innerHTML = [
    ["CLI Installed", caps.installed ? "yes" : "no"],
    ["Version", caps.version || "not installed"],
    ["Surfaces", caps.surfaces.join(" · ")],
    ["Safety", caps.safety[0]],
  ]
    .map(([label, value]) => `<div class="terminal-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");

  workbenchBox.innerHTML = [
    ...workbench.lanes.map(
      (lane) =>
        `<div class="terminal-row"><span>${escapeHtml(lane.title)}</span><strong>${escapeHtml(lane.actions[0])}</strong></div>`,
    ),
    `<div class="terminal-row"><span>MCP</span><strong>${escapeHtml(workbench.mcp.command)}</strong></div>`,
  ].join("");
}

function renderFleet() {
  const fleet = state.store.manifest.agents || [];
  document.getElementById("fleet").innerHTML = fleet
    .map(
      (agent) => `
        <article class="fleet-card">
          <h3>${escapeHtml(agent.name)}</h3>
          <p>${escapeHtml(agent.prompt || agent.role)}</p>
          <div class="lane-meta">
            <span class="chip">${escapeHtml(agent.runtime.lane)}</span>
            <span class="chip">${escapeHtml(agent.runtime.sandbox)}</span>
            <span class="chip">${escapeHtml(agent.runtime.cadence)}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function bindPlaces() {
  const button = document.getElementById("places-search");
  button.addEventListener("click", searchPlaces);
}

function bindMoonPay() {
  document.getElementById("moonpay-refresh").addEventListener("click", refreshMoonPayLink);
}

async function loadGooglePlaces(apiKey) {
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  state.googleReady = true;
  const container = document.createElement("div");
  state.placesService = new google.maps.places.PlacesService(container);
  document.getElementById("places-results").textContent = "Google Places ready.";
}

function searchPlaces() {
  const results = document.getElementById("places-results");
  if (!state.googleReady || !state.placesService) {
    results.textContent = "Google Places is unavailable. Add a browser-restricted GOOGLE_API_KEY.";
    return;
  }

  const query = document.getElementById("places-query").value.trim();
  results.textContent = "Searching...";
  state.placesService.textSearch({ query }, (places, status) => {
    if (status !== google.maps.places.PlacesServiceStatus.OK || !places?.length) {
      results.textContent = `No Google Places results. Status: ${status}`;
      return;
    }
    results.innerHTML = places
      .slice(0, 4)
      .map((place) => {
        const address = place.formatted_address || "Address unavailable";
        return `<div class="place-row"><span>${escapeHtml(place.name)}</span><strong>${escapeHtml(address)}</strong></div>`;
      })
      .join("");
  });
}

function buildMoonPayUrl(config) {
  if (!config.moonPayApiKey || !config.moonPayWallet) return "#";
  const params = new URLSearchParams({
    apiKey: config.moonPayApiKey,
    walletAddress: config.moonPayWallet,
    currencyCode: "usdc_sol",
    baseCurrencyCode: "usd",
    externalCustomerId: "openclawd-hackathon",
    showWalletAddressForm: "false",
    lockAmount: "false",
  });
  if (config.moonPayMerchantId) params.set("merchantId", config.moonPayMerchantId);
  return `https://buy.moonpay.com?${params.toString()}`;
}

async function refreshMoonPayLink() {
  const amount = document.getElementById("moonpay-amount").value || "50";
  const response = await fetch("/api/moonpay/buy-link", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  const payload = await response.json();
  const link = document.getElementById("moonpay-link");
  if (payload?.url) {
    link.href = payload.url;
    link.textContent = `Fund ${payload.amountUsd} USD With MoonPay`;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
