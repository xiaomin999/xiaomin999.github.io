/* 灵感匣剪藏 · 弹窗逻辑 */
const DEFAULT_APP = "https://xiaomin999.github.io/tools/lingganxia/";

function loadAppUrl(cb) {
  chrome.storage.local.get({ appUrl: DEFAULT_APP }, (r) => cb(r.appUrl || DEFAULT_APP));
}
function saveAppUrl(v) {
  chrome.storage.local.set({ appUrl: v });
}

document.addEventListener("DOMContentLoaded", async () => {
  const appInput = document.getElementById("app-url");
  loadAppUrl((u) => (appInput.value = u));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let sel = "";
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (window.getSelection ? window.getSelection().toString() : ""),
    });
    sel = res ? res.result : "";
  } catch (e) {
    sel = "";
  }

  document.getElementById("pg-title").value = tab.title || "";
  document.getElementById("pg-url").value = tab.url || "";
  document.getElementById("pg-text").value = sel;

  const u = tab.url || "";
  let src = "web";
  if (u.includes("xiaohongshu")) src = "xiaohongshu";
  else if (u.includes("weixin") || u.includes("mp.weixin")) src = "wechat";
  document.getElementById("pg-source").value = src;

  document.getElementById("save").addEventListener("click", () => {
    const app = (appInput.value || "").trim().replace(/\/+$/, "");
    saveAppUrl(app);
    const title = encodeURIComponent(document.getElementById("pg-title").value);
    const url = encodeURIComponent(document.getElementById("pg-url").value);
    const text = encodeURIComponent(document.getElementById("pg-text").value);
    const cat = encodeURIComponent(document.getElementById("pg-cat").value);
    const srcv = document.getElementById("pg-source").value;
    const target = `${app}/?clip=1&title=${title}&url=${url}&text=${text}&category=${cat}&source=${srcv}`;
    chrome.tabs.create({ url: target });
    window.close();
  });
});
