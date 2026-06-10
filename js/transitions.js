/* ==========================================================================
   SIGNATURE SPELL - CINEMATIC PAGE TRANSITIONS (CANDLE IGNITION & LIGHT GLOW)
   ========================================================================== */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  initPageTransitions();
});

function initPageTransitions() {
  // Check if we are in the admin page - skip void transitions for administrative operations
  if (getPageName() === "admin.html") return;

  const playEntrance = sessionStorage.getItem("play_transition") === "void";
  sessionStorage.removeItem("play_transition");

  const wrapper = document.createElement("div");
  wrapper.id = "app-wrapper";
  
  while (document.body.firstChild) {
    wrapper.appendChild(document.body.firstChild);
  }
  document.body.appendChild(wrapper);

  if (playEntrance) {
    document.body.classList.add("transitioning-in");
    
    const portal = document.createElement("div");
    portal.id = "candle-portal";
    portal.className = "active entrance";
    portal.innerHTML = `
      <div class="candle-container">
        <div class="flame-glow" style="transform: translateX(-50%) scale(40); opacity: 1;"></div>
      </div>
    `;
    document.body.appendChild(portal);

    setTimeout(() => {
      document.body.classList.remove("transitioning-in");
      portal.remove();
    }, 1500);
  }

  document.addEventListener("click", (e) => {
    const cta = e.target.closest("#hero-shop-cta");
    if (cta) {
      e.preventDefault();
      const targetUrl = cta.getAttribute("href");
      triggerCandleTransition(targetUrl);
    }
  });
}

function triggerCandleTransition(url) {
  sessionStorage.setItem("play_transition", "void");
  document.body.classList.add("transitioning-out");
  
  let portal = document.getElementById("candle-portal");
  if (!portal) {
    portal = document.createElement("div");
    portal.id = "candle-portal";
    portal.innerHTML = `
      <div class="match-spark"></div>
      <div class="candle-container">
        <div class="candle-wick"></div>
        <div class="flame-outer-wrap">
          <div class="flame-outer"></div>
        </div>
        <div class="flame-inner-wrap">
          <div class="flame-inner"></div>
        </div>
        <div class="flame-glow"></div>
      </div>
    `;
    document.body.appendChild(portal);
  }
  portal.className = "active igniting";
  
  // Navigate after the flame expands to consume the screen
  setTimeout(() => {
    window.location.href = url;
  }, 1800);
}

// Scrape page name from location
function getPageName() {
  const pagePath = window.location.pathname;
  return pagePath.substring(pagePath.lastIndexOf("/") + 1);
}
