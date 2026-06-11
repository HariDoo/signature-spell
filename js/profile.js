"use strict";

let firebaseUser = null;

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initProfilePage();
  }, 300);
});

function initProfilePage() {
  const loadingState = document.getElementById("profile-loading-state");
  const authRequired = document.getElementById("profile-auth-required");
  const profileWorkspace = document.getElementById("profile-workspace");

  if (typeof firebase !== "undefined" && isFirebaseInitialized) {
    auth.onAuthStateChanged(user => {
      if (user) {
        firebaseUser = user;
        syncUserDbMetadata(user).then(() => {
          if (loadingState) loadingState.style.display = "none";
          if (authRequired) authRequired.style.display = "none";
          if (profileWorkspace) profileWorkspace.style.display = "block";
          populateProfileFields(user);
        });
      } else {
        firebaseUser = null;
        if (loadingState) loadingState.style.display = "none";
        if (authRequired) authRequired.style.display = "block";
        if (profileWorkspace) profileWorkspace.style.display = "none";
      }
    });
  } else {
    if (loadingState) loadingState.style.display = "none";
    if (authRequired) authRequired.style.display = "block";
    if (profileWorkspace) profileWorkspace.style.display = "none";
    const alertContainer = document.getElementById("details-alert-container");
    showInlineAlert(alertContainer, "Firebase service not initialized. Please verify configuration.", "danger");
  }

  // Reload orders when they are updated in the background
  document.addEventListener("ordersUpdated", () => {
    if (firebaseUser) {
      loadUserOrders(firebaseUser);
    }
  });

  setupProfileFormBindings();
}

async function syncUserDbMetadata(user) {
  try {
    const userRef = db.ref("users/" + user.uid);
    const snapshot = await userRef.once("value");
    const val = snapshot.val();
    
    const now = Date.now();
    if (!val) {
      await userRef.set({
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        role: (user.email === "nandheswara21@gmail.com" || user.email === "admin@signaturespell.com") ? "admin" : "user",
        status: "active",
        createdAt: now,
        lastActive: now
      });
    } else {
      await userRef.update({
        lastActive: now
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function populateProfileFields(user) {
  const nameInitials = document.getElementById("profile-avatar-initials");
  const summaryName = document.getElementById("summary-display-name");
  const summaryEmail = document.getElementById("summary-email");
  const summaryVerify = document.getElementById("summary-verification-badge");
  const summaryCreated = document.getElementById("summary-created-at");
  const summaryLast = document.getElementById("summary-last-signin");
  
  const nameInput = document.getElementById("profile-name-input");
  const phoneInput = document.getElementById("profile-phone-input");

  const displayName = user.displayName || user.email.split("@")[0];
  if (summaryName) summaryName.textContent = displayName;
  if (nameInput) nameInput.value = user.displayName || "";
  if (summaryEmail) summaryEmail.textContent = user.email;
  
  if (nameInitials) {
    nameInitials.textContent = getInitials(displayName);
  }

  if (summaryVerify) {
    if (user.emailVerified) {
      summaryVerify.textContent = "Verified";
      summaryVerify.className = "badge badge-success";
      const emailStatusDesc = document.getElementById("security-email-status-desc");
      if (emailStatusDesc) emailStatusDesc.textContent = "Your email has been verified.";
      const verifyBtn = document.getElementById("verify-email-btn");
      if (verifyBtn) verifyBtn.style.display = "none";
    } else {
      summaryVerify.textContent = "Unverified";
      summaryVerify.className = "badge badge-warning";
      const verifyBtn = document.getElementById("verify-email-btn");
      if (verifyBtn) verifyBtn.style.display = "inline-block";
    }
  }

  db.ref("users/" + user.uid).once("value").then(snapshot => {
    const data = snapshot.val();
    if (data) {
      if (phoneInput && data.phoneNumber) phoneInput.value = data.phoneNumber;
      if (summaryCreated && data.createdAt) summaryCreated.textContent = new Date(data.createdAt).toLocaleDateString("en-IN", {year:'numeric', month:'short', day:'numeric'});
      if (summaryLast && data.lastActive) summaryLast.textContent = new Date(data.lastActive).toLocaleString("en-IN");
    }
  });

  // Load user order history
  loadUserOrders(user);
}

function loadUserOrders(user) {
  const loadingState = document.getElementById("orders-loading-state");
  const container = document.getElementById("profile-orders-container");

  if (!container) return;

  const renderOrdersList = (orders) => {
    if (loadingState) loadingState.style.display = "none";
    container.style.display = "block";

    // Filter orders by customer email matching the logged-in user
    const userOrders = orders.filter(o => o.email && o.email.toLowerCase() === user.email.toLowerCase());

    if (userOrders.length === 0) {
      container.innerHTML = `
        <div class="empty-orders-state">
          <p>You haven't placed any orders yet.</p>
          <a href="shop.html" class="btn btn-primary" style="display: inline-block; padding: 10px 20px; font-size: 0.85rem;">Shop Our Candles</a>
        </div>
      `;
      return;
    }

    // Sort by date (newest first)
    userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = userOrders.map(order => {
      const formattedDate = new Date(order.date).toLocaleDateString("en-IN", {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const productsList = order.items.map(item => `
        <li>${item.name} <span class="qty">&times; ${item.qty}</span></li>
      `).join("");

      // Status badge class mapping
      let badgeClass = "badge badge-info";
      const status = (order.status || "Confirmed").toLowerCase();
      if (status === "delivered") {
        badgeClass = "badge badge-success";
      } else if (status === "cancelled") {
        badgeClass = "badge badge-danger";
      } else if (status === "processing" || status === "shipped") {
        badgeClass = "badge badge-warning";
      }

      return `
        <div class="user-order-item">
          <div class="user-order-header">
            <div>
              <span class="user-order-id">${order.id}</span>
              <span class="user-order-date">placed on ${formattedDate}</span>
            </div>
            <span class="${badgeClass}">${order.status || "Confirmed"}</span>
          </div>
          <div class="user-order-details">
            <ul class="user-order-products">
              ${productsList}
            </ul>
            <div class="user-order-summary">
              <div style="font-size: 0.8rem; color: var(--color-muted-gray);">Total Amount</div>
              <div class="user-order-total">₹${Number(order.total).toFixed(2)}</div>
            </div>
          </div>
          <div class="user-order-footer">
            <div style="font-size: 0.8rem; color: var(--color-muted-gray); max-width: 70%; text-align: left;">
              <strong>Ship To:</strong> ${order.address || "N/A"}
            </div>
            <a href="order-tracking.html?orderId=${order.id}" class="user-order-tracking-btn">
              Track Order &rarr;
            </a>
          </div>
        </div>
      `;
    }).join("");
  };

  if (typeof firebase !== "undefined" && isFirebaseInitialized) {
    db.ref("orders").once("value")
      .then(snapshot => {
        const val = snapshot.val();
        const arr = val ? Object.values(val) : [];
        renderOrdersList(arr);
      })
      .catch(err => {
        console.error("Error fetching firebase orders:", err);
        // Fallback to local storage orders
        const stored = localStorage.getItem("signature_spell_orders");
        const arr = stored ? JSON.parse(stored) : [];
        renderOrdersList(arr);
      });
  } else {
    // Fallback to local storage orders
    const stored = localStorage.getItem("signature_spell_orders");
    const arr = stored ? JSON.parse(stored) : [];
    renderOrdersList(arr);
  }
}

function getInitials(name) {
  if (!name) return "SS";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function setupProfileFormBindings() {
  const detailsForm = document.getElementById("profile-details-form");
  if (detailsForm) {
    detailsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const displayName = document.getElementById("profile-name-input").value.trim();
      const phoneNumber = document.getElementById("profile-phone-input").value.trim();
      const alertContainer = document.getElementById("details-alert-container");

      if (isFirebaseInitialized && firebaseUser) {
        firebaseUser.updateProfile({ displayName: displayName })
          .then(() => {
            return db.ref("users/" + firebaseUser.uid).update({
              displayName: displayName,
              phoneNumber: phoneNumber
            });
          })
          .then(() => {
            showInlineAlert(alertContainer, "Profile details updated successfully!", "success");
            showToast("Profile details updated.");
            populateProfileFields(firebaseUser);
          })
          .catch(err => {
            showInlineAlert(alertContainer, err.message, "danger");
          });
      }
    });
  }

  const newPassInput = document.getElementById("profile-new-pass");
  if (newPassInput) {
    newPassInput.addEventListener("input", (e) => {
      const pass = e.target.value;
      const fill = document.getElementById("pass-strength-fill");
      const text = document.getElementById("pass-strength-text");
      
      if (!pass) {
        fill.className = "progress-bar-fill";
        text.textContent = "Password strength: Empty";
        return;
      }

      let score = 0;
      if (pass.length >= 6) score += 1;
      if (pass.length >= 10) score += 1;
      if (/[A-Z]/.test(pass)) score += 1;
      if (/[0-9]/.test(pass)) score += 1;
      if (/[^A-Za-z0-9]/.test(pass)) score += 1;

      if (score <= 2) {
        fill.className = "progress-bar-fill strength-weak";
        text.textContent = "Password strength: Weak";
      } else if (score <= 4) {
        fill.className = "progress-bar-fill strength-fair";
        text.textContent = "Password strength: Fair";
      } else if (score === 5) {
        fill.className = "progress-bar-fill strength-strong";
        text.textContent = "Password strength: Strong";
      }
    });
  }

  const passwordForm = document.getElementById("profile-password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const oldPass = document.getElementById("profile-old-pass").value;
      const newPass = document.getElementById("profile-new-pass").value;
      const confirmPass = document.getElementById("profile-confirm-pass").value;
      const alertContainer = document.getElementById("password-alert-container");

      if (newPass.length < 6) {
        showInlineAlert(alertContainer, "New password must be at least 6 characters.", "danger");
        return;
      }

      if (newPass !== confirmPass) {
        showInlineAlert(alertContainer, "New passwords do not match.", "danger");
        return;
      }

      if (isFirebaseInitialized && firebaseUser) {
        const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, oldPass);
        firebaseUser.reauthenticateWithCredential(credential)
          .then(() => {
            return firebaseUser.updatePassword(newPass);
          })
          .then(() => {
            showInlineAlert(alertContainer, "Password changed successfully!", "success");
            passwordForm.reset();
            document.getElementById("pass-strength-fill").className = "progress-bar-fill";
            document.getElementById("pass-strength-text").textContent = "Password strength: Empty";
          })
          .catch(err => {
            showInlineAlert(alertContainer, err.message, "danger");
          });
      }
    });
  }

  const deleteForm = document.getElementById("delete-account-form");
  if (deleteForm) {
    deleteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const password = document.getElementById("delete-password-input").value;
      const alertContainer = document.getElementById("delete-modal-alert");

      if (isFirebaseInitialized && firebaseUser) {
        const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, password);
        firebaseUser.reauthenticateWithCredential(credential)
          .then(() => {
            return db.ref("users/" + firebaseUser.uid).remove();
          })
          .then(() => {
            return firebaseUser.delete();
          })
          .then(() => {
            window.location.href = "index.html";
          })
          .catch(err => {
            showInlineAlert(alertContainer, err.message, "danger");
          });
      }
    });
  }

  const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
  const modalCloseBtn = document.getElementById("delete-modal-close");
  const deleteOverlay = document.getElementById("delete-confirm-modal");
  
  const closeModal = () => {
    if (deleteOverlay) deleteOverlay.classList.remove("active");
  };

  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
}

window.handleProfileLogout = function() {
  if (isFirebaseInitialized) {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  }
};

window.triggerLoginModal = function() {
  const overlay = document.getElementById("auth-modal-overlay");
  if (overlay) overlay.classList.add("active");
};

window.handleSendEmailVerification = function() {
  const alertContainer = document.getElementById("security-alert-container");
  if (isFirebaseInitialized && firebaseUser) {
    firebaseUser.sendEmailVerification()
      .then(() => {
        showInlineAlert(alertContainer, "Verification email has been dispatched to your inbox.", "info");
      })
      .catch(err => {
        showInlineAlert(alertContainer, err.message, "danger");
      });
  }
};

window.triggerDeleteAccountModal = function() {
  const deleteOverlay = document.getElementById("delete-confirm-modal");
  const passInput = document.getElementById("delete-password-input");
  const alertContainer = document.getElementById("delete-modal-alert");
  
  if (passInput) passInput.value = "";
  if (alertContainer) alertContainer.innerHTML = "";
  if (deleteOverlay) deleteOverlay.classList.add("active");
};





