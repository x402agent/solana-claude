const state = {
  launch: {},
};

const outputIds = ["plan-output", "quote-output", "perp-output", "inspect-output", "registry-output"];

document.querySelectorAll(".tabs button").forEach((button) => {
  button.addEventListener("click", () => activateOutput(button.dataset.output));
});

document.getElementById("launch-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = formData(event.currentTarget);
  state.launch = await postJson("/api/launch-plan", body);
  render("plan-output", state.launch);
});

document.getElementById("quote-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = { ...state.launch?.bondingCurve, ...formData(event.currentTarget) };
  render("quote-output", await postJson("/api/quote", body));
});

document.getElementById("perp-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const metadata = state.launch?.metadata ?? {};
  const curve = state.launch?.bondingCurve ?? {};
  render("perp-output", await postJson("/api/perp-plan", { ...metadata, ...curve, ...formData(event.currentTarget) }));
});

document.getElementById("inspect-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  render("inspect-output", await postJson("/api/inspect", formData(event.currentTarget)));
});

await boot();

async function boot() {
  const [health, registry] = await Promise.all([getJson("/api/health"), getJson("/api/registry")]);
  document.getElementById("status").textContent = `${health.network} · ${health.unsigned ? "unsigned review mode" : "signing enabled"}`;
  render("registry-output", registry);
  document.getElementById("launch-form").requestSubmit();
}

function activateOutput(id) {
  outputIds.forEach((outputId) => document.getElementById(outputId).classList.toggle("active", outputId === id));
  document.querySelectorAll(".tabs button").forEach((button) => button.classList.toggle("active", button.dataset.output === id));
}

function render(id, payload) {
  document.getElementById(id).textContent = JSON.stringify(payload, null, 2);
  activateOutput(id);
}

function formData(form) {
  const data = new FormData(form);
  const out = {};
  for (const [key, value] of data.entries()) {
    if (value === "") continue;
    const field = form.elements[key];
    const type = field instanceof RadioNodeList ? "radio" : field?.type;
    out[key] = type === "number" ? Number(value) : value;
  }
  return out;
}

async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `${path} ${res.status}`);
  return json;
}
