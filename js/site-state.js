"use strict";

(function() {
  const page = window.location.pathname.split("/").pop().toLowerCase();
  const isBypassedPage = page === "admin.html" || page === "store-manager.html" || page === "admin" || page === "store-manager";

  // Run immediately, don't wait for DOMContentLoaded if possible.
  // Use a fast interval to wait for Firebase to become available
  const checkFbInterval = setInterval(() => {
    if (typeof firebase !== "undefined" && typeof db !== "undefined") {
      clearInterval(checkFbInterval);
      initSiteState();
    }
  }, 10);

  // Synchronous cache check to prevent flash of content on page load
  if (localStorage.getItem("maintenanceMode") === "true" && !isBypassedPage) {
    // Optimistically lock the page. If Firebase later says it's off, we unlock it.
    enforceMaintenanceLock();
  }

  function initSiteState() {

    setupAnnouncementsListener();
    setupMaintenanceListener();
  }

  function setupAnnouncementsListener() {
    db.ref("announcements").on("value", snapshot => {
      // Clear existing banner
      const existing = document.getElementById("global-announcement-banner");
      if (existing) existing.remove();

      const data = snapshot.val();
      if (!data) return;

      // Get the most recent announcement
      const announcements = Object.values(data);
      if (announcements.length === 0) return;
      
      const latest = announcements[announcements.length - 1]; // Firebase push keys are chronologically ordered

      // Create banner
      const banner = document.createElement("div");
      banner.id = "global-announcement-banner";
      banner.className = "global-announcement-banner";
      
      // Close button logic via localStorage so users can dismiss it
      const storageKey = `dismissed_announcement_${latest.timestamp || Object.keys(data)[announcements.length - 1]}`;
      if (localStorage.getItem(storageKey)) return;

      banner.innerHTML = `
        <div class="announcement-content">
          <strong>${latest.title || 'Announcement'}</strong>: ${latest.message || latest.desc || ''}
        </div>
        <button class="announcement-close" aria-label="Dismiss Announcement">&times;</button>
      `;

      // Inject at the very top of body
      document.body.insertBefore(banner, document.body.firstChild);

      // Handle close
      banner.querySelector(".announcement-close").addEventListener("click", () => {
        banner.remove();
        localStorage.setItem(storageKey, "true");
      });
    });
  }

  function setupMaintenanceListener() {
    db.ref("maintenanceMode").on("value", snapshot => {
      const isMaintenanceActive = snapshot.val() === true;
      
      // Cache the state locally so next page load applies lockdown instantly
      localStorage.setItem("maintenanceMode", isMaintenanceActive);

      if (!isMaintenanceActive) {
        removeMaintenanceOverlay();
        return;
      }

      // Maintenance is active! Check if user is an admin.
      if (typeof auth === "undefined") {
        enforceMaintenanceLock();
        return;
      }

      auth.onAuthStateChanged(async (user) => {
        if (user) {
          const isAdmin = await checkIsAdmin(user);
          if (isAdmin) {
            // Admin user: remove lock if exists, show badge
            removeMaintenanceOverlay();
            showAdminMaintenanceBadge();
          } else {
            // Regular logged-in user: lock out
            enforceMaintenanceLock();
          }
        } else {
          // Not logged in: lock out
          enforceMaintenanceLock();
        }
      });
    });
  }

  async function checkIsAdmin(user) {
    if (user.email === "nandheswara21@gmail.com" || user.email === "admin@signaturespell.com") {
      return true;
    }
    try {
      const snapshot = await db.ref("users/" + user.uid + "/role").once("value");
      return snapshot.val() === "admin";
    } catch (err) {
      return false;
    }
  }

  function enforceMaintenanceLock() {
    if (isBypassedPage) return;
    if (document.getElementById("maintenance-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "maintenance-overlay";
    overlay.className = "maintenance-overlay";
    overlay.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--color-cream, #fdfbf7); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); touch-action: none;";
    
    overlay.innerHTML = `
      <div class="maintenance-box" style="background: var(--color-off-white); color: var(--color-dark); padding: 40px 20px; border-radius: 12px; width: 100%; max-width: 500px; box-sizing: border-box; margin: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid var(--color-light-gray); text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, var(--color-primary), var(--color-accent));"></div>
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" style="margin-bottom: 20px; color: var(--color-accent); drop-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h1 style="margin-bottom: 15px; font-family: var(--font-heading); font-size: clamp(1.5rem, 6vw, 2rem); color: var(--color-dark);">We'll Be Right Back</h1>
        <p style="color: var(--color-muted-gray); font-size: clamp(0.95rem, 3.5vw, 1.1rem); line-height: 1.6; margin-bottom: 20px;">
          Signature Spell is currently undergoing scheduled maintenance to improve your experience. 
          Please check back soon!
        </p>
      </div>
    `;

    document.body.appendChild(overlay);
    // Hide scrolling on both html and body to completely lock down scrolling
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function removeMaintenanceOverlay() {
    const overlay = document.getElementById("maintenance-overlay");
    if (overlay) overlay.remove();
    // Restore scrolling
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    const badge = document.getElementById("maintenance-admin-badge");
    if (badge) badge.remove();
  }

  function showAdminMaintenanceBadge() {
    if (isBypassedPage) return;
    if (document.getElementById("maintenance-admin-badge")) return;
    const badge = document.createElement("div");
    badge.id = "maintenance-admin-badge";
    badge.className = "maintenance-admin-badge";
    badge.textContent = "Maintenance Mode Active (Admin View)";
    document.body.appendChild(badge);
  }
})();
