"use strict";

let firebaseUser = null;
let allUserOrders = [];

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initOrdersPage();
  }, 300);
});

function initOrdersPage() {
  const loadingState = document.getElementById("profile-loading-state");
  const authRequired = document.getElementById("profile-auth-required");
  const profileWorkspace = document.getElementById("profile-workspace");

  if (typeof firebase !== "undefined" && isFirebaseInitialized) {
    auth.onAuthStateChanged(user => {
      if (user) {
        firebaseUser = user;
        if (loadingState) loadingState.style.display = "none";
        if (authRequired) authRequired.style.display = "none";
        if (profileWorkspace) profileWorkspace.style.display = "block";
        populateProfileSummary(user);
        loadUserOrders(user);
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
  }

  // Reload orders when they are updated in the background
  document.addEventListener("ordersUpdated", () => {
    if (firebaseUser) {
      loadUserOrders(firebaseUser);
    }
  });
}

function populateProfileSummary(user) {
  const nameInitials = document.getElementById("profile-avatar-initials");
  const summaryName = document.getElementById("summary-display-name");
  const summaryEmail = document.getElementById("summary-email");
  const summaryCreated = document.getElementById("summary-created-at");

  const displayName = user.displayName || user.email.split("@")[0];
  if (summaryName) summaryName.textContent = displayName;
  if (summaryEmail) summaryEmail.textContent = user.email;
  
  if (nameInitials) {
    nameInitials.textContent = getInitials(displayName);
  }

  if (typeof db !== "undefined" && isFirebaseInitialized) {
    db.ref("users/" + user.uid).once("value").then(snapshot => {
      const data = snapshot.val();
      if (data) {
        if (summaryCreated && data.createdAt) {
          summaryCreated.textContent = new Date(data.createdAt).toLocaleDateString("en-IN", {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }
    });
  }
}

function getInitials(name) {
  if (!name) return "SS";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function loadUserOrders(user) {
  const loadingState = document.getElementById("orders-loading-state");
  const container = document.getElementById("profile-orders-container");

  if (!container) return;

  const fetchSuccess = (orders) => {
    // Filter orders by customer email matching the logged-in user
    allUserOrders = orders.filter(o => o.email && o.email.toLowerCase() === user.email.toLowerCase());
    
    // Sort by date (newest first)
    allUserOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (loadingState) loadingState.style.display = "none";
    container.style.display = "block";

    renderFilteredOrders();
  };

  if (typeof firebase !== "undefined" && isFirebaseInitialized) {
    db.ref("orders").once("value")
      .then(snapshot => {
        const val = snapshot.val();
        const arr = val ? Object.values(val) : [];
        fetchSuccess(arr);
      })
      .catch(err => {
        console.error("Error fetching firebase orders:", err);
        const stored = localStorage.getItem("signature_spell_orders");
        const arr = stored ? JSON.parse(stored) : [];
        fetchSuccess(arr);
      });
  } else {
    const stored = localStorage.getItem("signature_spell_orders");
    const arr = stored ? JSON.parse(stored) : [];
    fetchSuccess(arr);
  }
}

window.handleFiltersChange = function() {
  renderFilteredOrders();
};

function renderFilteredOrders() {
  const container = document.getElementById("profile-orders-container");
  if (!container) return;

  const searchQuery = document.getElementById("order-search-input")?.value.toLowerCase().trim() || "";
  const statusFilter = document.getElementById("order-status-filter")?.value || "all";

  // Apply filters
  const filtered = allUserOrders.filter(order => {
    // Status Filter
    const orderStatus = order.status || "Confirmed";
    if (statusFilter !== "all" && orderStatus.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }

    // Search Query Filter (checks order ID, or product names)
    if (searchQuery) {
      const matchId = order.id && order.id.toLowerCase().includes(searchQuery);
      const matchItems = order.items && order.items.some(item => item.name && item.name.toLowerCase().includes(searchQuery));
      return matchId || matchItems;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-orders-state" style="text-align: center; padding: 40px 20px;">
        <p style="color: var(--color-muted-gray); margin-bottom: 20px;">No orders found matching filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
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
}

window.handleOrdersLogout = function() {
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
