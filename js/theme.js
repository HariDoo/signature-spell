/**
 * Signature Spell - Dark / Light Theme Manager
 */
(function () {
  "use strict";

  // 1. Setup theme toggle once DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    injectThemeToggle();
  });

  function injectThemeToggle() {
    // Locate the navigation icons container
    const navIcons = document.querySelector(".nav-icons");
    if (!navIcons) return;

    // Check if toggle already exists
    if (document.getElementById("global-theme-toggle")) return;

    // Create the toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "global-theme-toggle";
    toggleBtn.className = "icon-btn theme-toggle-btn";
    toggleBtn.setAttribute("aria-label", "Toggle Dark/Light Mode");

    // Set appropriate icon
    updateToggleIcon(
      toggleBtn,
      document.documentElement.getAttribute("data-theme") || "light",
    );

    // Add click handler
    toggleBtn.addEventListener("click", () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      const newTheme = currentTheme === "dark" ? "light" : "dark";

      // Update attribute and localStorage
      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.setAttribute("data-bs-theme", newTheme);
      localStorage.setItem("theme", newTheme);

      // Update stylesheets disabled state
      const lightLink = document.getElementById("theme-light");
      const darkLink = document.getElementById("theme-dark");
      if (lightLink && darkLink) {
        lightLink.disabled = newTheme === "dark";
        darkLink.disabled = newTheme === "light";
      }

      // Update icon
      updateToggleIcon(toggleBtn, newTheme);
    });

    // Insert as the first icon or before mobile hamburger
    const hamburger = document.getElementById("hamburger-toggle");
    if (hamburger) {
      navIcons.insertBefore(toggleBtn, hamburger);
    } else {
      navIcons.appendChild(toggleBtn);
    }
  }

  function updateToggleIcon(btn, theme) {
    if (theme === "dark") {
      // Sun Icon for dark mode
      btn.innerHTML = `<i class="bi bi-sun-fill"></i>`;
    } else {
      // Moon stars Icon for light mode
      btn.innerHTML = `<i class="bi bi-moon-stars-fill"></i>`;
    }
  }
})();
