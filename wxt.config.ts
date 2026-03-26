import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Social Blocker",
    description:
      "A psychological defense system against social media addiction. Block Instagram Reels and reclaim your time.",
    version: "1.0.0",
    permissions: ["storage", "declarativeNetRequest", "alarms"],
    host_permissions: ["*://www.instagram.com/*", "*://instagram.com/*"],
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
  },
});
