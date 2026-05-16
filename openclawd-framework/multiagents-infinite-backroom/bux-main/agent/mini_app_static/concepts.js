const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const params = new URLSearchParams(window.location.search);
if (params.get("dev") === "1") localStorage.buxMiniAppDev = "1";
const initData = tg?.initData || (localStorage.buxMiniAppDev === "1" ? "dev" : "");
const app = document.querySelector("#app");
const toastEl = document.querySelector("#toast");

const CONCEPTS = [
  { id: 1, slug: "swipe", name: "Spark Deck", line: "A fast Tinder-style yes/no stack for useful work.", idea: "Swipe right to start, left to skip.", score: "Fastest" },
  { id: 2, slug: "quest", name: "Quest Log", line: "Cards become missions with XP, streaks, and boss fights.", idea: "Clear quests, level up your agent.", score: "Most addictive" },
  { id: 3, slug: "feed", name: "Signal Feed", line: "An x-style stream where every post is actionable.", idea: "Like scrolling, but productive.", score: "Most familiar" },
  { id: 4, slug: "cockpit", name: "Mission Control", line: "A cockpit for goals, risk, active work, and next moves.", idea: "See the system, launch the next action.", score: "Most powerful" },
  { id: 5, slug: "bento", name: "Bento OS", line: "A playful tile board of goals, cards, automations, and wins.", idea: "Tap the tile that matters now.", score: "Most glanceable" },
  { id: 6, slug: "story", name: "Story Mode", line: "One goal unfolds as a guided narrative with chapters.", idea: "Make progress like turning pages.", score: "Most human" },
  { id: 7, slug: "radar", name: "Opportunity Radar", line: "Cards orbit by urgency and leverage like a live scanner.", idea: "Pull the hottest blip into action.", score: "Most futuristic" },
  { id: 8, slug: "arcade", name: "Action Arcade", line: "A dopamine-heavy control pad for streaks and combo clears.", idea: "Clear one more card.", score: "Most game-like" },
  { id: 9, slug: "triage", name: "Triage Lane", line: "Inbox-zero discipline with a tight approve, snooze, delegate loop.", idea: "Every card leaves the lane.", score: "Most productive" },
  { id: 10, slug: "coach", name: "Pocket Coach", line: "Chat and cards merge into a compact AI sidekick.", idea: "The agent explains, you approve.", score: "Most conversational" },
];

const state = {
  cards: [],
  goals: [],
  topics: [],
  stats: {},
  activity: [],
  me: { settings: {} },
  conceptId: conceptIdFromPath(),
  selected: {},
  focusCardId: null,
};

function conceptIdFromPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const match = path.match(/(?:mini[-_]?app|miniapp)[-/]?(\d{1,2})$/i);
  if (!match) return 0;
  const value = Number(match[1]);
  return value >= 1 && value <= 10 ? value : 0;
}

function conceptPath(id) {
  const suffix = params.get("dev") === "1" || localStorage.buxMiniAppDev === "1" ? "?dev=1" : "";
  return `/mini-app-${id}${suffix}`;
}

function hubPath() {
  return `/mini-apps${params.get("dev") === "1" || localStorage.buxMiniAppDev === "1" ? "?dev=1" : ""}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function refresh() {
  const [goals, topics, cards, stats, activity, me] = await Promise.all([
    api("/api/goals"),
    api("/api/topics"),
    api("/api/cards"),
    api("/api/stats"),
    api("/api/activity"),
    api("/api/me"),
  ]);
  state.goals = goals.goals || [];
  state.topics = topics.topics || [];
  state.cards = cards.cards || [];
  state.stats = stats.stats || {};
  state.activity = activity.activity || [];
  state.me = me || { settings: {} };
  if (!state.focusCardId && state.cards[0]) state.focusCardId = state.cards[0].id;
  render();
}

function render() {
  const concept = CONCEPTS.find((item) => item.id === state.conceptId);
  if (!concept) {
    app.className = "concept-shell hub-mode";
    document.body.className = "hub";
    app.innerHTML = renderHub();
    return;
  }
  document.body.className = `concept-${concept.id} theme-${concept.slug}`;
  app.className = `concept-shell concept-${concept.id}`;
  app.innerHTML = `
    ${renderTop(concept)}
    ${renderConcept(concept)}
    ${renderActionDock()}
  `;
}

function renderHub() {
  return `
    <section class="hub-hero">
      <p class="micro">bux experiment lab</p>
      <h1>10 futures for the AI work feed.</h1>
      <p>Each Mini App uses the same live cards, goals, and Telegram-safe actions. The interaction model changes completely, so you can feel what sticks.</p>
      <div class="hub-stats">
        <span>${state.cards.length} live cards</span>
        <span>${state.goals.length + state.topics.length} lanes</span>
        <span>${state.activity.length} recent decisions</span>
      </div>
    </section>
    <section class="concept-grid">
      ${CONCEPTS.map((concept) => `
        <a class="concept-tile concept-tile-${concept.id}" href="${conceptPath(concept.id)}">
          <span class="tile-number">Mini App ${concept.id}</span>
          <strong>${escapeHtml(concept.name)}</strong>
          <p>${escapeHtml(concept.line)}</p>
          <small>${escapeHtml(concept.score)}</small>
        </a>
      `).join("")}
    </section>
  `;
}

function renderTop(concept) {
  return `
    <header class="concept-top">
      <a class="back-link" href="${hubPath()}">All 10</a>
      <div>
        <p class="micro">Mini App ${concept.id} / ${escapeHtml(concept.score)}</p>
        <h1>${escapeHtml(concept.name)}</h1>
        <p>${escapeHtml(concept.line)}</p>
      </div>
      <nav class="number-nav" aria-label="Mini app versions">
        ${CONCEPTS.map((item) => `
          <a class="${item.id === concept.id ? "active" : ""}" href="${conceptPath(item.id)}">${item.id}</a>
        `).join("")}
      </nav>
    </header>
  `;
}

function renderConcept(concept) {
  const renderers = {
    1: renderSwipeDeck,
    2: renderQuestLog,
    3: renderSignalFeed,
    4: renderMissionControl,
    5: renderBentoOS,
    6: renderStoryMode,
    7: renderRadar,
    8: renderArcade,
    9: renderTriageLane,
    10: renderCoach,
  };
  return renderers[concept.id]?.(concept) || "";
}

function renderSwipeDeck(concept) {
  const cards = topCards(3);
  return `
    <section class="swipe-stage">
      <div class="swipe-copy">
        <span>${escapeHtml(concept.idea)}</span>
        <strong>${state.cards.length} cards waiting</strong>
      </div>
      <div class="phone-stack">
        ${cards.map((card, index) => renderHeroCard(card, `stack-${index}`)).join("") || emptyPanel()}
      </div>
      <div class="gesture-row">
        ${button("skip", cards[0]?.id, "Nope")}
        <button class="ghost-action" data-action="context" data-card-id="${cards[0]?.id || ""}">Refine</button>
        ${button("start", cards[0]?.id, "Start")}
      </div>
    </section>
  `;
}

function renderQuestLog() {
  const quests = topCards(5);
  return `
    <section class="quest-layout">
      <aside class="level-card">
        <p class="micro">agent level</p>
        <h2>${Math.max(1, Number(state.stats.done || 0) + 3)}</h2>
        <p>${state.stats.open || state.cards.length} quests open. Clear three to unlock a streak.</p>
        <div class="xp-track"><span style="width:${Math.min(94, 18 + state.cards.length * 9)}%"></span></div>
      </aside>
      <div class="quest-list">
        ${quests.map((card, index) => `
          <article class="quest-card">
            <span class="quest-rank">Q${index + 1}</span>
            <div>
              <strong>${escapeHtml(card.title)}</strong>
              <p>${escapeHtml(card.why || "This move is ready.")}</p>
              <div class="mini-actions">${variantButtons(card)}${button("start", card.id, "Claim XP")}</div>
            </div>
          </article>
        `).join("") || emptyPanel()}
      </div>
    </section>
  `;
}

function renderSignalFeed() {
  return `
    <section class="feed-layout">
      <aside class="feed-sidebar">
        <strong>For you</strong>
        <span>${state.stats.open || state.cards.length} signals</span>
        <span>${state.goals.length} goals</span>
        <span>${state.topics.length} topics</span>
      </aside>
      <div class="post-feed">
        ${topCards(8).map((card) => `
          <article class="post-card">
            <div class="avatar">${escapeHtml(sourceInitial(card))}</div>
            <div>
              <header><strong>${escapeHtml(sourceName(card))}</strong><span>${escapeHtml(relative(card.created_at))}</span></header>
              <h2>${escapeHtml(card.title)}</h2>
              <p>${escapeHtml(card.why || actionPreview(card))}</p>
              <div class="post-actions">${button("skip", card.id, "Skip")}${button("context", card.id, "Comment")}${button("start", card.id, selectedLabel(card))}</div>
            </div>
          </article>
        `).join("") || emptyPanel()}
      </div>
    </section>
  `;
}

function renderMissionControl() {
  const focus = focusedCard();
  return `
    <section class="cockpit-layout">
      <div class="cockpit-grid">
        <article class="instrument primary">
          <p class="micro">next launch</p>
          ${focus ? `<h2>${escapeHtml(focus.title)}</h2><p>${escapeHtml(focus.why || actionPreview(focus))}</p><div class="mini-actions">${variantButtons(focus)}${button("start", focus.id, "Launch")}</div>` : emptyPanel()}
        </article>
        <article class="instrument"><span>Open</span><strong>${state.stats.open || state.cards.length}</strong></article>
        <article class="instrument"><span>Done</span><strong>${state.stats.done || 0}</strong></article>
        <article class="instrument"><span>Notes</span><strong>${state.stats.comments || 0}</strong></article>
      </div>
      <div class="runway">
        ${topCards(6).map((card) => `
          <button class="${card.id === state.focusCardId ? "active" : ""}" data-action="focus" data-card-id="${card.id}">
            <span>${escapeHtml(sourceName(card))}</span>
            <strong>${escapeHtml(card.title)}</strong>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBentoOS() {
  const cards = topCards(6);
  return `
    <section class="bento-grid">
      <article class="bento-tile hero-tile">
        <p class="micro">today's board</p>
        <h2>${state.cards.length || 0} live cards</h2>
        <p>Tap the tile with the highest leverage. The agent does private work first.</p>
      </article>
      ${cards.map((card, index) => `
        <article class="bento-tile tile-${index + 1}">
          <span>${escapeHtml(sourceName(card))}</span>
          <strong>${escapeHtml(card.title)}</strong>
          <p>${escapeHtml(clip(card.why || actionPreview(card), 94))}</p>
          <div class="mini-actions">${button("start", card.id, selectedLabel(card))}</div>
        </article>
      `).join("") || emptyPanel()}
    </section>
  `;
}

function renderStoryMode() {
  const card = focusedCard() || state.cards[0];
  const chapters = state.cards.slice(0, 5);
  return `
    <section class="story-layout">
      <aside class="chapters">
        ${chapters.map((item, index) => `
          <button class="${item.id === card?.id ? "active" : ""}" data-action="focus" data-card-id="${item.id}">
            <span>Chapter ${index + 1}</span>
            <strong>${escapeHtml(clip(item.title, 42))}</strong>
          </button>
        `).join("")}
      </aside>
      <article class="story-card">
        ${card ? `
          <p class="micro">${escapeHtml(sourceName(card))}</p>
          <h2>${escapeHtml(card.title)}</h2>
          <p>${escapeHtml(card.why || "The agent has enough context to begin.")}</p>
          <blockquote>${escapeHtml(primaryBlock(card) || actionPreview(card))}</blockquote>
          <div class="mini-actions">${variantButtons(card)}${button("start", card.id, "Continue story")}</div>
        ` : emptyPanel()}
      </article>
    </section>
  `;
}

function renderRadar() {
  const cards = topCards(8);
  return `
    <section class="radar-layout">
      <div class="radar-screen">
        <div class="sweep"></div>
        ${cards.map((card, index) => `
          <button class="blip blip-${index + 1}" data-action="focus" data-card-id="${card.id}">
            <span>${escapeHtml(sourceInitial(card))}</span>
          </button>
        `).join("")}
        <div class="radar-core">AI</div>
      </div>
      <aside class="radar-card">
        ${focusedCard() ? renderCompactFocus(focusedCard(), "Pull into work") : emptyPanel()}
      </aside>
    </section>
  `;
}

function renderArcade() {
  const card = focusedCard() || state.cards[0];
  return `
    <section class="arcade-layout">
      <div class="scoreboard">
        <span>combo x${Math.max(1, Math.min(9, state.activity.length + 1))}</span>
        <strong>${String((state.stats.done || 0) * 100 + state.cards.length * 25).padStart(5, "0")}</strong>
        <span>${state.cards.length} lives</span>
      </div>
      <article class="arcade-card">
        ${card ? `<h2>${escapeHtml(card.title)}</h2><p>${escapeHtml(card.why || actionPreview(card))}</p>${variantButtons(card)}` : emptyPanel()}
      </article>
      <div class="arcade-pad">
        ${button("skip", card?.id, "Pass")}
        ${button("context", card?.id, "Power up")}
        ${button("start", card?.id, "Fire")}
      </div>
    </section>
  `;
}

function renderTriageLane() {
  return `
    <section class="triage-layout">
      <div class="triage-columns">
        <article><span>Now</span>${topCards(3).map((card) => triageItem(card)).join("") || emptyPanel()}</article>
        <article><span>Needs context</span>${state.cards.slice(3, 6).map((card) => triageItem(card)).join("") || emptyPanel()}</article>
        <article><span>Done soon</span>${state.activity.slice(0, 4).map((item) => `<div class="done-item">${escapeHtml(item.title || item.status)}</div>`).join("") || `<div class="done-item">No decisions yet.</div>`}</article>
      </div>
    </section>
  `;
}

function renderCoach() {
  const card = focusedCard() || state.cards[0];
  return `
    <section class="coach-layout">
      <div class="coach-thread">
        <div class="bubble agent">I found ${state.cards.length} useful moves. Want the highest-leverage one?</div>
        ${card ? `
          <div class="bubble card-bubble">
            <strong>${escapeHtml(card.title)}</strong>
            <p>${escapeHtml(card.why || actionPreview(card))}</p>
            ${variantButtons(card)}
          </div>
          <div class="bubble user">Show me the fastest safe action.</div>
          <div class="bubble agent">I can start private work now and ask again before anything visible.</div>
        ` : `<div class="bubble agent">No cards yet. Ask me to scan your connected tools.</div>`}
      </div>
      <footer class="coach-composer">
        <button data-action="generate">Scan</button>
        <button data-action="context" data-card-id="${card?.id || ""}">Guide it</button>
        <button data-action="start" data-card-id="${card?.id || ""}">Approve</button>
      </footer>
    </section>
  `;
}

function renderActionDock() {
  return `
    <footer class="global-dock">
      <button data-action="generate">Generate cards</button>
      <button data-action="autopilot">Private work</button>
      <a href="/tinder${params.get("dev") === "1" ? "?dev=1" : ""}">Current app</a>
    </footer>
  `;
}

function renderHeroCard(card, className = "") {
  return `
    <article class="hero-card ${className}" data-card-id="${card.id}">
      <div class="card-glow"></div>
      <p>${escapeHtml(sourceName(card))}</p>
      <h2>${escapeHtml(card.title)}</h2>
      <span>${escapeHtml(clip(card.why || actionPreview(card), 120))}</span>
      <div class="mini-actions">${variantButtons(card)}${button("start", card.id, selectedLabel(card))}</div>
    </article>
  `;
}

function renderCompactFocus(card, cta) {
  return `
    <p class="micro">${escapeHtml(sourceName(card))}</p>
    <h2>${escapeHtml(card.title)}</h2>
    <p>${escapeHtml(card.why || actionPreview(card))}</p>
    <div class="mini-actions">${variantButtons(card)}${button("start", card.id, cta)}</div>
  `;
}

function triageItem(card) {
  return `
    <div class="triage-item">
      <strong>${escapeHtml(card.title)}</strong>
      <small>${escapeHtml(sourceName(card))}</small>
      <div>${button("skip", card.id, "Skip")}${button("context", card.id, "Edit")}${button("start", card.id, "Do")}</div>
    </div>
  `;
}

function variantButtons(card) {
  const buttons = cardButtons(card).slice(0, 3);
  if (!buttons.length) return "";
  return buttons.map((item, index) => `
    <button class="variant ${selectedIndex(card) === index ? "active" : ""}" data-action="variant" data-card-id="${card.id}" data-index="${index}">
      ${escapeHtml(item.text)}
    </button>
  `).join("");
}

function button(action, cardId, label) {
  const disabled = !cardId ? "disabled" : "";
  return `<button class="action ${action}" data-action="${action}" data-card-id="${cardId || ""}" ${disabled}>${escapeHtml(label || action)}</button>`;
}

function topCards(limit) {
  return state.cards.slice(0, limit);
}

function focusedCard() {
  return state.cards.find((card) => String(card.id) === String(state.focusCardId)) || state.cards[0] || null;
}

function selectedIndex(card) {
  const total = cardButtons(card).length;
  if (!total) return 0;
  const raw = Number(state.selected[String(card.id)] || 0);
  return Math.max(0, Math.min(total - 1, raw));
}

function selectedLabel(card) {
  return cardButtons(card)[selectedIndex(card)]?.text || "Start";
}

function selectedRaw(card) {
  return cardButtons(card)[selectedIndex(card)]?.raw || "";
}

function cardButtons(card) {
  const labels = Array.isArray(card?.buttons) ? card.buttons : [];
  const prompt = String(card?.action || "").trim();
  const mapped = labels.map((item) => String(item || "").trim()).filter(Boolean);
  if (!prompt && !mapped.length) return [];
  if (!mapped.length) return [{ raw: "Do it", text: "Start" }];
  return mapped.map((item) => ({ raw: item, text: clip(buttonText(item), 24) }));
}

function buttonText(value) {
  return String(value || "")
    .replace(/^✅\s*/, "")
    .replace(/^🛠️?\s*/, "")
    .replace(/^✏️\s*/, "")
    .trim() || "Start";
}

function primaryBlock(card) {
  const index = selectedIndex(card);
  const blocks = Array.isArray(card.blocks) ? card.blocks : [];
  return blocks[index]?.body || blocks[0]?.body || "";
}

function sourceName(card) {
  return card.source_label || card.topic_title || card.source || "bux";
}

function sourceInitial(card) {
  return sourceName(card).trim().slice(0, 1).toUpperCase() || "B";
}

function actionPreview(card) {
  if (String(card?.source || "").startsWith("miniapp-setup:")) return "Connect this surface, then turn real context into cards.";
  if (String(card?.source || "").startsWith("miniapp-goal:")) return "Lock this goal and ask the agent to find concrete follow-ups.";
  return "Private work starts now. Visible side effects still come back for approval.";
}

function relative(ts) {
  const value = Number(ts || 0);
  if (!value) return "now";
  const minutes = Math.max(1, Math.round((Date.now() / 1000 - value) / 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function clip(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1)).trim()}...` : text;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function emptyPanel() {
  return `<article class="empty-panel"><strong>No cards yet</strong><p>Generate cards or connect a tool to fill this prototype with real work.</p></article>`;
}

async function startCard(card) {
  await api(`/api/cards/${card.id}/start`, {
    method: "POST",
    body: JSON.stringify({ button: selectedRaw(card) }),
  });
  toast("Started.");
  await refresh();
}

async function dismissCard(card) {
  await api(`/api/cards/${card.id}/dismiss`, { method: "POST", body: "{}" });
  toast("Skipped.");
  await refresh();
}

async function addContext(card) {
  const comment = window.prompt("What should the agent optimize for?");
  if (!comment?.trim()) return;
  await api(`/api/cards/${card.id}/comment`, {
    method: "POST",
    body: JSON.stringify({ comment: comment.trim() }),
  });
  toast("Context sent.");
  await refresh();
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const cardId = target.dataset.cardId;
  const card = state.cards.find((item) => String(item.id) === String(cardId));
  try {
    if (action === "focus" && card) {
      state.focusCardId = card.id;
      render();
    } else if (action === "variant" && card) {
      state.selected[String(card.id)] = Number(target.dataset.index || 0);
      state.focusCardId = card.id;
      render();
    } else if (action === "start" && card) {
      await startCard(card);
    } else if (action === "skip" && card) {
      await dismissCard(card);
    } else if (action === "context" && card) {
      await addContext(card);
    } else if (action === "generate") {
      await api("/api/generate", { method: "POST", body: "{}" });
      toast("Scan requested.");
    } else if (action === "autopilot") {
      await api("/api/autopilot", { method: "POST", body: "{}" });
      toast("Private work requested.");
    }
  } catch (error) {
    toast(error.message);
  }
});

try {
  await refresh();
} catch (error) {
  document.body.className = "auth-failed";
  app.innerHTML = `
    <section class="auth-card">
      <p class="micro">secure mini app</p>
      <h1>${!initData ? "Open from Telegram" : "Could not load prototypes"}</h1>
      <p>${escapeHtml(!initData ? "Reopen this from the Telegram bot so the session can be verified." : error.message)}</p>
    </section>
  `;
}
