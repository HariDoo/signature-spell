/**
 * Signature Spell - Header Positioning, Profile Dropdown, and Authentication Flow
 */
(function() {
  "use strict";

  // Initialize auth session state immediately on script run
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("signature_spell_user")) {
    sessionStorage.setItem("auth_session_active", "true");
  }

  // Hook into UserSession.set to reload on new logins
  if (typeof UserSession !== "undefined" && UserSession.set) {
    const originalSet = UserSession.set;
    UserSession.set = function(user) {
      const wasLoggedIn = sessionStorage.getItem("auth_session_active");
      originalSet.call(this, user);
      if (user && wasLoggedIn !== "true") {
        sessionStorage.setItem("auth_session_active", "true");
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };
  }

  // Hook into UserSession.clear to reset reload state on logout
  if (typeof UserSession !== "undefined" && UserSession.clear) {
    const originalClear = UserSession.clear;
    UserSession.clear = function() {
      sessionStorage.removeItem("auth_session_active");
      originalClear.call(this);
    };
  }



  // Prevent logout or unauthenticated sync from wiping guest cart items when Firebase triggers auth changes
  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function(key) {
    if (key === "signature_spell_cart" || key === "signature_spell_wishlist") {
      const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
      if (!user) {
        // Keep guest items intact in localStorage instead of deleting them
        return;
      }
    }
    originalRemoveItem.apply(this, arguments);
  };

  let notificationItems = [];
  let notificationsRef = null;

  function getLocalNotificationKey(user) {
    if (user && user.uid) return "signature_spell_notifications_" + user.uid;
    return "signature_spell_notifications_guest";
  }

  function loadLocalNotifications(user) {
    try {
      const raw = localStorage.getItem(getLocalNotificationKey(user));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveLocalNotifications(list, user) {
    localStorage.setItem(getLocalNotificationKey(user), JSON.stringify(list.slice(0, 50)));
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatRelativeTime(ts) {
    const now = Date.now();
    const diff = Math.max(0, now - Number(ts || now));
    const min = 60 * 1000;
    const hr = 60 * min;
    const day = 24 * hr;
    if (diff < min) return "Just now";
    if (diff < hr) return Math.floor(diff / min) + "m ago";
    if (diff < day) return Math.floor(diff / hr) + "h ago";
    return Math.floor(diff / day) + "d ago";
  }

  function ensureNotificationIcon() {
    const navIcons = document.querySelector(".nav-icons");
    const wishlistBtn = document.getElementById("wishlist-btn");
    if (!navIcons || !wishlistBtn || document.getElementById("notification-btn")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "notification-dropdown-container";

    const button = document.createElement("a");
    button.href = "#";
    button.className = "icon-btn";
    button.id = "notification-btn";
    button.setAttribute("aria-label", "Notifications");
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span class="notification-count" id="notification-badge-count" style="display:none;">0</span>
    `;

    const menu = document.createElement("div");
    menu.className = "notification-dropdown-menu";
    menu.id = "notification-dropdown-menu";
    menu.innerHTML = `
      <div class="notification-menu-header">
        <strong>Notifications</strong>
        <button type="button" id="notification-mark-read-btn">Mark all read</button>
      </div>
      <div class="notification-menu-list" id="notification-menu-list"></div>
    `;

    wrapper.appendChild(button);
    wrapper.appendChild(menu);

    wishlistBtn.insertAdjacentElement("afterend", wrapper);

    button.addEventListener("click", function(e) {
      e.preventDefault();
      menu.classList.toggle("show");
    });

    document.addEventListener("click", function(e) {
      if (!wrapper.contains(e.target)) {
        menu.classList.remove("show");
      }
    });

    const markReadBtn = document.getElementById("notification-mark-read-btn");
    if (markReadBtn) {
      markReadBtn.addEventListener("click", function(e) {
        e.preventDefault();
        markAllNotificationsRead();
      });
    }
  }

  function renderNotificationMenu() {
    const listEl = document.getElementById("notification-menu-list");
    if (!listEl) return;

    const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
    if (!user) {
      listEl.innerHTML = `<div class="notification-empty">Log in to view notifications.</div>`;
      updateNotificationBadge();
      return;
    }

    if (!notificationItems.length) {
      listEl.innerHTML = `<div class="notification-empty">No notifications yet.</div>`;
      updateNotificationBadge();
      return;
    }

    listEl.innerHTML = notificationItems.slice(0, 20).map(function(item) {
      const href = item.link || "#";
      return `
        <a href="${escapeHtml(href)}" class="notification-item ${item.read ? "" : "unread"}" data-id="${escapeHtml(item.id || "")}">
          <span class="notification-title">${escapeHtml(item.title || "Update")}</span>
          <span class="notification-text">${escapeHtml(item.message || "")}</span>
          <span class="notification-time">${formatRelativeTime(item.createdAt)}</span>
        </a>
      `;
    }).join("");

    listEl.querySelectorAll(".notification-item").forEach(function(link) {
      link.addEventListener("click", function() {
        const id = link.getAttribute("data-id");
        if (id) markNotificationRead(id);
      });
    });

    updateNotificationBadge();
  }

  function updateNotificationBadge() {
    const badge = document.getElementById("notification-badge-count");
    if (!badge) return;
    const unread = notificationItems.filter(function(n) { return !n.read; }).length;
    badge.textContent = String(unread);
    badge.style.display = unread > 0 ? "flex" : "none";
  }

  function markNotificationRead(notificationId) {
    const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
    if (!user || !notificationId) return;

    if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && db) {
      db.ref("users/" + user.uid + "/notifications/" + notificationId + "/read").set(true);
      return;
    }

    notificationItems = notificationItems.map(function(item) {
      return item.id === notificationId ? { ...item, read: true } : item;
    });
    saveLocalNotifications(notificationItems, user);
    renderNotificationMenu();
  }

  function markAllNotificationsRead() {
    const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
    if (!user) return;

    if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && db) {
      const updates = {};
      notificationItems.forEach(function(item) {
        if (item.id && !item.read) {
          updates[item.id + "/read"] = true;
        }
      });
      if (Object.keys(updates).length) {
        db.ref("users/" + user.uid + "/notifications").update(updates);
      }
      return;
    }

    notificationItems = notificationItems.map(function(item) {
      return { ...item, read: true };
    });
    saveLocalNotifications(notificationItems, user);
    renderNotificationMenu();
  }

  function subscribeNotifications() {
    if (notificationsRef && typeof notificationsRef.off === "function") {
      notificationsRef.off();
      notificationsRef = null;
    }

    ensureNotificationIcon();

    const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
    if (!user) {
      notificationItems = [];
      renderNotificationMenu();
      return;
    }

    if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && db) {
      notificationsRef = db.ref("users/" + user.uid + "/notifications").limitToLast(50);
      notificationsRef.on("value", function(snapshot) {
        const val = snapshot.val() || {};
        const entries = Object.keys(val).map(function(key) {
          return { id: key, ...val[key] };
        });
        entries.sort(function(a, b) {
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        });
        notificationItems = entries;
        renderNotificationMenu();
      });
      return;
    }

    const local = loadLocalNotifications(user);
    local.sort(function(a, b) {
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });
    notificationItems = local;
    renderNotificationMenu();
  }

  // Function to update header auth state layout
  function updateHeaderAuthLayout() {
    const userBtn = document.getElementById("user-btn");
    if (!userBtn) return;

    const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
    let loginTextLink = document.getElementById("header-login-text-link");

    if (user) {
      // Logged In: Hide text link, show SVG profile icon button
      if (loginTextLink) {
        loginTextLink.style.display = "none";
      }
      userBtn.style.display = "inline-flex";

      // Update dropdown menu items dynamically
      const menu = document.querySelector(".user-dropdown-menu");
      if (menu) {
        const isAdmin = user && user.isAdmin;
        menu.innerHTML = `
          <a href="orders.html" class="user-dropdown-item"><i class="bi bi-bag"></i> My Orders</a>
          <a href="profile.html" class="user-dropdown-item"><i class="bi bi-person"></i> View Profile</a>
          ${isAdmin ? `
            <a href="admin.html" class="user-dropdown-item"><i class="bi bi-shield-lock"></i> Admin Dashboard</a>
            <a href="store-manager.html" class="user-dropdown-item"><i class="bi bi-gear"></i> Orders &amp; Catalog</a>
          ` : ''}
          <button class="user-dropdown-item" id="user-dropdown-logout"><i class="bi bi-box-arrow-right"></i> Log Out</button>
        `;
      }
    } else {
      // Logged Out: Show text link, hide SVG profile icon button
      if (!loginTextLink) {
        loginTextLink = document.createElement("a");
        loginTextLink.id = "header-login-text-link";
        loginTextLink.href = "#";
        loginTextLink.className = "header-login-text";
        loginTextLink.textContent = "Login/Signup";
        
        userBtn.parentNode.insertBefore(loginTextLink, userBtn);
        
        loginTextLink.addEventListener("click", (e) => {
          e.preventDefault();
          if (typeof window.triggerLoginModal === "function") {
            window.triggerLoginModal();
          }
        });
      }
      loginTextLink.style.display = "inline-block";
      userBtn.style.display = "none";
    }

    subscribeNotifications();

    // Update Mobile Nav links dynamically
    const mobileDrawer = document.getElementById("mobile-drawer");
    if (mobileDrawer) {
      const isAdmin = user && user.isAdmin;
      const userName = user ? (user.name || "User") : "";

      mobileDrawer.innerHTML = `
        <div class="mobile-drawer-header">
          <span class="mobile-drawer-title">Signature Spell</span>
          <button class="mobile-nav-close" id="mobile-close-btn" aria-label="Close menu">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="mobile-search-container">
          <form class="mobile-search-form" id="mobile-search-form">
            <div class="mobile-search-input-wrapper">
              <input type="text" id="mobile-search-input" placeholder="Search scents..." required autocomplete="off">
              <button type="submit" class="mobile-search-submit" aria-label="Search">
                <i class="bi bi-search"></i>
              </button>
            </div>
          </form>
        </div>

        <div class="mobile-drawer-content">
          ${user ? `
            <div class="mobile-user-profile-card">
              <div class="mobile-user-avatar">
                <i class="bi bi-person-circle"></i>
              </div>
              <div class="mobile-user-details">
                <span class="mobile-user-greet">Welcome,</span>
                <span class="mobile-user-name">${userName}</span>
              </div>
            </div>
          ` : ''}

          <ul class="mobile-unified-menu">
            <li>
              <a href="index.html" class="mobile-menu-item">
                <i class="bi bi-house"></i>
                <span>Home</span>
              </a>
            </li>
            <li>
              <a href="shop.html" class="mobile-menu-item">
                <i class="bi bi-shop"></i>
                <span>Shop</span>
              </a>
            </li>
            <li>
              <a href="about.html" class="mobile-menu-item">
                <i class="bi bi-book"></i>
                <span>Our Story</span>
              </a>
            </li>
            <li>
              <a href="contact.html" class="mobile-menu-item">
                <i class="bi bi-envelope"></i>
                <span>Contact</span>
              </a>
            </li>
            <li>
              <a href="order-tracking.html" class="mobile-menu-item">
                <i class="bi bi-geo-alt"></i>
                <span>Track Order</span>
              </a>
            </li>
            <li>
              <a href="cart.html" class="mobile-menu-item">
                <i class="bi bi-bag"></i>
                <span>Cart</span>
              </a>
            </li>

            <li class="mobile-menu-divider"></li>

            ${user ? `
              <li>
                <a href="profile.html" class="mobile-menu-item">
                  <i class="bi bi-person"></i>
                  <span>My Profile</span>
                </a>
              </li>
              <li>
                <a href="orders.html" class="mobile-menu-item">
                  <i class="bi bi-bag-check"></i>
                  <span>My Orders</span>
                </a>
              </li>
              ${isAdmin ? `
                <li>
                  <a href="admin.html" class="mobile-menu-item">
                    <i class="bi bi-shield-lock"></i>
                    <span>Admin Dashboard</span>
                  </a>
                </li>
                <li>
                  <a href="store-manager.html" class="mobile-menu-item">
                    <i class="bi bi-gear"></i>
                    <span>Orders &amp; Catalog</span>
                  </a>
                </li>
              ` : ''}
              <li>
                <a href="#" class="mobile-menu-item mobile-logout-item" id="mobile-logout-btn">
                  <i class="bi bi-box-arrow-right"></i>
                  <span>Log Out</span>
                </a>
              </li>
            ` : `
              <li>
                <a href="#" class="mobile-menu-item mobile-login-item" id="mobile-login-btn">
                  <i class="bi bi-box-arrow-in-right"></i>
                  <span>Login / Signup</span>
                </a>
              </li>
            `}
          </ul>
        </div>
      `;

      // Helper function to close mobile menu
      const closeMenu = () => {
        const mobileOverlay = document.getElementById("mobile-overlay");
        if (mobileOverlay) mobileOverlay.classList.remove("active");
        mobileDrawer.classList.remove("active");
      };

      // Bind dynamic close button
      const closeBtn = mobileDrawer.querySelector("#mobile-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", closeMenu);
      }

      // Bind search submission
      const searchForm = mobileDrawer.querySelector("#mobile-search-form");
      const searchInput = mobileDrawer.querySelector("#mobile-search-input");
      if (searchForm && searchInput) {
        searchForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const query = searchInput.value.trim();
          if (query) {
            closeMenu();
            window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
          }
        });
      }

      // Bind auth actions
      if (user) {
        const logoutBtn = mobileDrawer.querySelector("#mobile-logout-btn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            closeMenu();
            
            if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && auth) {
              auth.signOut();
            } else if (typeof UserSession !== "undefined") {
              UserSession.clear();
            }
            if (typeof showToast !== "undefined") {
              showToast("Logged out successfully.");
            }
            setTimeout(() => {
              window.location.reload();
            }, 500);
          });
        }
      } else {
        const loginBtn = mobileDrawer.querySelector("#mobile-login-btn");
        if (loginBtn) {
          loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            closeMenu();
            
            if (typeof window.triggerLoginModal === "function") {
              window.triggerLoginModal();
            }
          });
        }
      }
    }
  }

  // Hook into updateUserSessionUI so we run whenever the user session is set/changed
  const originalUpdateUserSessionUI = window.updateUserSessionUI;
  window.updateUserSessionUI = function() {
    if (originalUpdateUserSessionUI) {
      originalUpdateUserSessionUI();
    }
    updateHeaderAuthLayout();
  };

  // Initialize Profile Dropdown Menu with Interceptor
  function initProfileDropdown() {
    const userBtn = document.getElementById("user-btn");
    if (!userBtn) return;

    if (!userBtn.parentNode.classList.contains("user-dropdown-container")) {
      const wrapper = document.createElement("div");
      wrapper.className = "user-dropdown-container";
      
      userBtn.parentNode.insertBefore(wrapper, userBtn);
      wrapper.appendChild(userBtn);

      const menu = document.createElement("div");
      menu.className = "user-dropdown-menu";
      menu.innerHTML = `
        <a href="orders.html" class="user-dropdown-item"><i class="bi bi-bag"></i> My Orders</a>
        <a href="profile.html" class="user-dropdown-item"><i class="bi bi-person"></i> View Profile</a>
        <button class="user-dropdown-item" id="user-dropdown-logout"><i class="bi bi-box-arrow-right"></i> Log Out</button>
      `;
      wrapper.appendChild(menu);

      // Intercept click on the user profile button
      userBtn.addEventListener("click", (e) => {
        const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
        if (user) {
          // Prevent main.js redirect and toggle dropdown menu instead
          e.preventDefault();
          e.stopImmediatePropagation();
          menu.classList.toggle("show");
        }
      }, true); // Capture phase interceptor

      // Use event delegation on menu for Log Out button
      menu.addEventListener("click", (e) => {
        const btn = e.target.closest("#user-dropdown-logout");
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          menu.classList.remove("show");

          if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && auth) {
            auth.signOut();
          } else if (typeof UserSession !== "undefined") {
            UserSession.clear();
          }
          
          if (typeof showToast !== "undefined") {
            showToast("Logged out successfully.");
          }
          
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      });

      // Hide dropdown when clicking elsewhere
      document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
          menu.classList.remove("show");
        }
      });
      
      // Initial layout run
      updateHeaderAuthLayout();
      subscribeNotifications();
    }
  }

  document.addEventListener("authUpdated", subscribeNotifications);
  document.addEventListener("notificationsUpdated", subscribeNotifications);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfileDropdown);
  } else {
    initProfileDropdown();
  }
})();
