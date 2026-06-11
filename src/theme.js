// Theme application for extension pages. Dark tokens activate via
// html[data-theme="dark"]; anything else renders the light palette.

export function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}
