/**
 * Signature Spell - Cart Functionality & Count Logic Fixes
 */
(function() {
  "use strict";

  // Override CartStorage.count to count unique product entries instead of total quantities
  if (typeof CartStorage !== "undefined" && CartStorage.count) {
    CartStorage.count = function() {
      return this.get().length;
    };
    
    // Dispatch a cartUpdated event immediately to update UI count badges on load
    document.addEventListener("DOMContentLoaded", () => {
      document.dispatchEvent(new CustomEvent("cartUpdated"));
    });
  }

  let wasFreeDeliveryUnlocked = null;

  function triggerCelebration(banner) {
    if (!banner) return;
    const colors = ["#ffc107", "#ff85a2", "#85a2ff", "#a2ff85", "#f1a7ff", "#ffd185"];
    const rect = banner.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    for (let i = 0; i < 45; i++) {
      const p = document.createElement("div");
      p.className = "celebration-particle";

      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 140;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const rot = (Math.random() * 360) + "deg";

      p.style.setProperty("--tx", `${tx}px`);
      p.style.setProperty("--ty", `${ty}px`);
      p.style.setProperty("--rot", rot);
      p.style.left = `${centerX}px`;
      p.style.top = `${centerY}px`;

      const size = 6 + Math.random() * 8;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

      if (Math.random() > 0.5) {
        p.style.borderRadius = "0"; // Diamond particles
        p.style.transform = "rotate(45deg)";
      }

      banner.appendChild(p);

      setTimeout(() => {
        p.remove();
      }, 1200);
    }
  }

  // Handle injecting the "Add more items +" link and checking for free delivery celebration
  document.addEventListener("cartUpdated", () => {
    const itemsContainer = document.querySelector(".cart-items-list");
    const cart = typeof CartStorage !== "undefined" ? CartStorage.get() : [];

    if (itemsContainer && !itemsContainer.querySelector("#continue-shopping-cta")) {
      if (cart.length > 0) {
        const linkContainer = document.createElement("div");
        linkContainer.className = "add-more-items-container";
        linkContainer.style.marginTop = "24px";
        linkContainer.style.textAlign = "left";
        
        const link = document.createElement("a");
        link.href = "shop.html";
        link.id = "continue-shopping-cta";
        link.className = "add-more-items-link";
        link.innerHTML = "Add more items +";
        
        linkContainer.appendChild(link);
        itemsContainer.appendChild(linkContainer);
      }
    }

    // Celebration check
    let subtotal = 0;
    if (typeof PRODUCTS !== "undefined") {
      cart.forEach(item => {
        const p = PRODUCTS.find(prod => prod.id === item.id);
        if (p) subtotal += p.price * item.qty;
      });
    }

    const isFreeUnlocked = subtotal >= 500;
    if (wasFreeDeliveryUnlocked === false && isFreeUnlocked === true) {
      setTimeout(() => {
        const banner = document.querySelector(".free-ship-banner");
        if (banner) triggerCelebration(banner);
      }, 150);
    }
    wasFreeDeliveryUnlocked = isFreeUnlocked;
  });
})();
