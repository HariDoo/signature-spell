/**
 * Signature Spell - 3D Tilt Cards & Cursor Spotlight Effects
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    init3DCardEffects();
  });

  function init3DCardEffects() {
    const MAX_TILT = 10; // degrees

    // Mousemove Event Delegation for interactive tilt & glow spotlight
    document.body.addEventListener("mousemove", (e) => {
      const card = e.target.closest(".product-card, .category-card, .testimonial-card");
      if (!card) return;

      // Inject glow layer dynamically if not present
      let glow = card.querySelector(".card-glow");
      if (!glow) {
        glow = document.createElement("div");
        glow.className = "card-glow";
        card.insertBefore(glow, card.firstChild);
      }

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotateY = ((x - cx) / cx) * MAX_TILT;
      const rotateX = ((cy - y) / cy) * MAX_TILT;

      card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

      glow.style.left = `${x}px`;
      glow.style.top = `${y}px`;
      glow.style.opacity = "1";
    });

    // Mouseout Event Delegation to reset card transforms
    document.body.addEventListener("mouseout", (e) => {
      const card = e.target.closest(".product-card, .category-card, .testimonial-card");
      if (!card) return;

      // Only reset if mouse left the card entirely
      if (e.relatedTarget && card.contains(e.relatedTarget)) return;

      card.style.transform = "rotateX(0) rotateY(0) scale3d(1, 1, 1)";
      const glow = card.querySelector(".card-glow");
      if (glow) {
        glow.style.opacity = "0";
      }
    });
  }
})();
