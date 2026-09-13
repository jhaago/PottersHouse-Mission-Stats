const STATS_URL = "https://script.google.com/macros/s/AKfycbxjutZvjWHqyQYZixZs3fVyApTZgF62woPNxXOSJBdkVkMCqzAmTWOLClhvqaQYuKLe/exec";
const CACHE_KEY = "pottershouse-mission-stats";
const REFRESH_MS = 30000;

const connectionsCount = document.getElementById("connectionsCount");
const healedCount = document.getElementById("healedCount");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const lastUpdated = document.getElementById("lastUpdated");
const refreshButton = document.getElementById("refreshButton");

function renderStats(data, source = "live") {
  connectionsCount.textContent = Number(data.connections || 0).toLocaleString();
  healedCount.textContent = Number(data.healed || 0).toLocaleString();

  const when = data.updatedAt ? new Date(data.updatedAt) : new Date();
  lastUpdated.textContent = formatTime(when);

  statusDot.className = `status-dot ${source === "live" ? "live" : "offline"}`;
  statusText.textContent = source === "live" ? "Live totals" : "Showing last saved totals";
}

function formatTime(date) {
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function loadCachedStats() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && typeof cached.connections !== "undefined") {
      renderStats(cached, "cached");
      return true;
    }
  } catch (error) {
    console.warn("Could not load cached stats", error);
  }
  return false;
}

async function refreshStats() {
  refreshButton.disabled = true;

  if (!navigator.onLine) {
    statusDot.className = "status-dot offline";
    statusText.textContent = "Offline — showing last saved totals";
    refreshButton.disabled = false;
    return;
  }

  statusText.textContent = "Refreshing…";

  try {
    const response = await fetch(`${STATS_URL}?mode=stats&t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Stats request failed");

    const normalized = {
      connections: Number(data.connections || 0),
      healed: Number(data.healed || 0),
      updatedAt: data.updatedAt || new Date().toISOString()
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
    renderStats(normalized, "live");
  } catch (error) {
    console.error("Stats refresh failed", error);
    const hasCache = loadCachedStats();
    statusDot.className = "status-dot offline";
    statusText.textContent = hasCache ? "Could not refresh — showing saved totals" : "Could not load totals";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", refreshStats);
window.addEventListener("online", refreshStats);
window.addEventListener("offline", () => {
  statusDot.className = "status-dot offline";
  statusText.textContent = "Offline — showing last saved totals";
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshStats();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}

loadCachedStats();
refreshStats();
setInterval(refreshStats, REFRESH_MS);
