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
      let authContainer = document.getElementById("mobile-auth-container");
      if (!authContainer) {
        authContainer = document.createElement("div");
        authContainer.id = "mobile-auth-container";
        authContainer.className = "mobile-auth-wrapper";
        
        const closeBtn = document.getElementById("mobile-close-btn");
        if (closeBtn && closeBtn.nextSibling) {
          mobileDrawer.insertBefore(authContainer, closeBtn.nextSibling);
        } else if (mobileDrawer.firstChild) {
          mobileDrawer.insertBefore(authContainer, mobileDrawer.firstChild);
        } else {
          mobileDrawer.appendChild(authContainer);
        }
      }

      if (user) {
        const userName = user.name || "User";
        authContainer.innerHTML = `
          <div class="mobile-user-info">
            <span class="mobile-welcome-text">Hello, <strong>${userName}</strong></span>
            <div class="mobile-auth-links">
              <a href="profile.html" class="mobile-auth-sublink">My Profile</a>
              <span class="divider">|</span>
              <a href="#" class="mobile-auth-sublink" id="mobile-logout-btn">Log Out</a>
            </div>
          </div>
        `;
        
        const logoutBtn = authContainer.querySelector("#mobile-logout-btn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const mobileOverlay = document.getElementById("mobile-overlay");
            if (mobileOverlay) mobileOverlay.classList.remove("active");
            mobileDrawer.classList.remove("active");
            
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
        authContainer.innerHTML = `
          <a href="#" class="mobile-auth-btn" id="mobile-login-btn">
            <i class="bi bi-person-circle"></i> Login / Signup
          </a>
        `;
        
        const loginBtn = authContainer.querySelector("#mobile-login-btn");
        if (loginBtn) {
          loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const mobileOverlay = document.getElementById("mobile-overlay");
            if (mobileOverlay) mobileOverlay.classList.remove("active");
            mobileDrawer.classList.remove("active");
            
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

      // Handle Log Out option click
      const logoutBtn = menu.querySelector("#user-dropdown-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
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
        });
      }

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
