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
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfileDropdown);
  } else {
    initProfileDropdown();
  }
})();
