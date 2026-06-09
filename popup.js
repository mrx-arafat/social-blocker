import { getSettings, saveSettings, getDayStats } from "./src/storage.js";

const $ = (s) => document.querySelector(s);

async function render() {
  const settings = await getSettings();
  const day = await getDayStats();

  $("#masterToggle").checked = settings.enabled;

  $("#sAttempts").textContent = day.attempts;
  $("#sDismissed").textContent = day.dismissed;
  const resolved = day.continued + day.dismissed;
  const rate = resolved ? Math.round((day.dismissed / resolved) * 100) : 0;
  $("#sRate").textContent = rate + "%";

  $("#todayNote").textContent = day.attempts
    ? `${day.attempts} interruption${day.attempts === 1 ? "" : "s"} today — ${
        day.dismissed
      } ended in stepping away.`
    : "No interruptions yet today.";
}

$("#masterToggle").addEventListener("change", async (e) => {
  const settings = await getSettings();
  settings.enabled = e.target.checked;
  await saveSettings(settings);
});

$("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
