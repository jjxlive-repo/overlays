// ==UserScript==
// @name         JJxLive Mod TTS Allowlist
// @namespace    jjxlive
// @version      1.0
// @description  Lets specific moderators trigger the "." TTS command on the Social Stream Ninja dock without a paid channel membership, via a self-maintained allowlist.
// @match        https://socialstream.ninja/dock.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  var STORAGE_KEY = "jjxlive_mod_tts_list";

  function hasGM() {
    return typeof GM_getValue === "function" && typeof GM_setValue === "function";
  }

  function loadList() {
    try {
      var raw = hasGM() ? GM_getValue(STORAGE_KEY, "[]") : (localStorage.getItem(STORAGE_KEY) || "[]");
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveList(list) {
    var raw = JSON.stringify(list);
    if (hasGM()) {
      GM_setValue(STORAGE_KEY, raw);
    } else {
      localStorage.setItem(STORAGE_KEY, raw);
    }
  }

  function normalize(name) {
    return (name || "").toString().trim().toLowerCase();
  }

  var modList = new Set(loadList().map(normalize));

  // --- Patch processData so allow-listed chat names pass the members-only TTS gate ---
  function tryPatch() {
    if (typeof window.processData !== "function" || window.processData.__jjxlivePatched) {
      return false;
    }
    var original = window.processData;
    var wrapped = function (data, reloaded) {
      try {
        var raw = data && data.contents ? data.contents : data;
        if (raw && raw.chatname) {
          var name = normalize(raw.chatname);
          if (modList.has(name) && !raw.membership) {
            raw.membership = true;
            raw.hasMembership = true;
            console.log("[Mod TTS] granted TTS pass to", raw.chatname);
          }
        }
      } catch (e) {
        console.error("[Mod TTS] patch error", e);
      }
      return original.apply(this, arguments);
    };
    wrapped.__jjxlivePatched = true;
    window.processData = wrapped;
    console.log("[Mod TTS] processData patched. Allowlist:", Array.from(modList));
    return true;
  }

  var patchInterval = setInterval(function () {
    if (tryPatch()) clearInterval(patchInterval);
  }, 150);
  setTimeout(function () {
    clearInterval(patchInterval);
    if (typeof window.processData !== "function" || !window.processData.__jjxlivePatched) {
      console.error("[Mod TTS] could not find window.processData after 20s — allowlist is NOT active.");
    }
  }, 20000);

  // --- Floating panel UI ---
  function buildPanel() {
    if (document.getElementById("jjxlive-modtts-panel")) return;

    var panel = document.createElement("div");
    panel.id = "jjxlive-modtts-panel";
    panel.style.cssText =
      "position:fixed;bottom:12px;right:12px;z-index:999999;background:#1a0430;" +
      "border:1px solid #A855F7;border-radius:10px;padding:10px;font-family:sans-serif;" +
      "font-size:12px;color:#FAF5FF;width:220px;box-shadow:0 4px 16px rgba(0,0,0,.5);";
    panel.innerHTML =
      '<div id="jjxlive-modtts-toggle" style="font-weight:900;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">' +
      "<span>🎙️ Mod TTS List</span><span id=\"jjxlive-modtts-caret\">▾</span>" +
      "</div>" +
      '<div id="jjxlive-modtts-body">' +
      '<div style="display:flex;gap:4px;margin-bottom:6px;">' +
      '<input id="jjxlive-modtts-input" placeholder="username" style="flex:1;min-width:0;padding:4px 6px;border-radius:6px;border:1px solid #7B2FBE;background:#000;color:#fff;">' +
      '<button id="jjxlive-modtts-add" style="padding:4px 8px;border-radius:6px;border:none;background:#A855F7;color:#fff;cursor:pointer;">+</button>' +
      "</div>" +
      '<div id="jjxlive-modtts-items"></div>' +
      "</div>";
    document.body.appendChild(panel);

    function render() {
      var container = panel.querySelector("#jjxlive-modtts-items");
      container.innerHTML = "";
      Array.from(modList).sort().forEach(function (name) {
        var row = document.createElement("div");
        row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:2px 0;";
        var label = document.createElement("span");
        label.textContent = name;
        var remove = document.createElement("span");
        remove.textContent = "✕";
        remove.dataset.name = name;
        remove.style.cssText = "cursor:pointer;color:#E879F9;";
        remove.className = "jjxlive-modtts-remove";
        row.appendChild(label);
        row.appendChild(remove);
        container.appendChild(row);
      });
      container.querySelectorAll(".jjxlive-modtts-remove").forEach(function (el) {
        el.addEventListener("click", function () {
          modList.delete(el.dataset.name);
          saveList(Array.from(modList));
          render();
        });
      });
    }

    panel.querySelector("#jjxlive-modtts-add").addEventListener("click", function () {
      var input = panel.querySelector("#jjxlive-modtts-input");
      var name = normalize(input.value);
      if (name) {
        modList.add(name);
        saveList(Array.from(modList));
        input.value = "";
        render();
      }
    });
    panel.querySelector("#jjxlive-modtts-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") panel.querySelector("#jjxlive-modtts-add").click();
    });
    panel.querySelector("#jjxlive-modtts-toggle").addEventListener("click", function () {
      var body = panel.querySelector("#jjxlive-modtts-body");
      var caret = panel.querySelector("#jjxlive-modtts-caret");
      var hidden = body.style.display === "none";
      body.style.display = hidden ? "" : "none";
      caret.textContent = hidden ? "▾" : "▸";
    });

    render();
  }

  if (document.body) {
    buildPanel();
  } else {
    window.addEventListener("DOMContentLoaded", buildPanel);
  }
})();
