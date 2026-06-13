"use strict";

let allUsers = [];
let filteredUsers = [];
let selectedUserId = null;
let currentPage = 1;
const USERS_PER_PAGE = 5;

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initAdminConsole();
  }, 300);
});

function initAdminConsole() {
  const root = document.getElementById("admin-workspace-root");
  const deniedOverlay = document.getElementById("accessDeniedOverlay");
  const loadingOverlay = document.getElementById("loadingOverlay");

  if (!root) return;

  if (typeof firebase !== "undefined" && isFirebaseInitialized) {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const isAdminUser = await verifyAdminRole(user);
        if (isAdminUser) {
          if (loadingOverlay) loadingOverlay.style.display = "none";
          if (deniedOverlay) deniedOverlay.style.display = "none";
          root.style.display = "block";
          document.getElementById("admin-user-fullname").textContent = user.displayName || user.email.split("@")[0];
          initializeDashboard();
        } else {
          if (loadingOverlay) loadingOverlay.style.display = "none";
          root.style.display = "none";
          document.getElementById("access-denied-title").textContent = "Access Denied";
          document.getElementById("access-denied-desc").textContent = "You do not possess the required administrator credentials to view this page.";
          if (deniedOverlay) deniedOverlay.style.display = "flex";
        }
      } else {
        if (loadingOverlay) loadingOverlay.style.display = "none";
        root.style.display = "none";
        document.getElementById("access-denied-title").textContent = "Authentication Required";
        document.getElementById("access-denied-desc").textContent = "Please log in with administrator credentials.";
        if (deniedOverlay) deniedOverlay.style.display = "flex";
        if (typeof window.triggerLoginModal === "function") {
          window.triggerLoginModal();
        }
      }
    });
  } else {
    if (loadingOverlay) loadingOverlay.style.display = "none";
    root.style.display = "none";
    document.getElementById("access-denied-title").textContent = "Service Unavailable";
    document.getElementById("access-denied-desc").textContent = "Firebase is not initialized. Please verify configuration.";
    if (deniedOverlay) deniedOverlay.style.display = "flex";
  }

  checkImpersonationStatus();
  setupAdminFormBindings();
  document.addEventListener("ordersUpdated", () => {
    syncOrdersTable();
  });
}

async function verifyAdminRole(user) {
  if (user.email === "nandheswara21@gmail.com" || user.email === "admin@signaturespell.com") {
    return true;
  }
  try {
    const snapshot = await db.ref("users/" + user.uid + "/role").once("value");
    return snapshot.val() === "admin";
  } catch (err) {
    console.error(err);
    return false;
  }
}

function initializeDashboard() {
  loadStats();
  loadUserRegistry();
  syncCatalogTable();
  syncOrdersTable();
  loadAdminManagers();
  loadAuditTrails();
  loadBulletins();
}

function loadStats() {
  db.ref("users").on("value", snapshot => {
    const users = snapshot.val();
    if (users) {
      document.getElementById("stat-total-users").textContent = Object.keys(users).length.toString();
    }
  });

  db.ref("products").on("value", snapshot => {
    const products = snapshot.val();
    if (products) {
      document.getElementById("stat-total-candles").textContent = Object.keys(products).length.toString();
    }
  });

  db.ref("orders").on("value", snapshot => {
    const orders = snapshot.val();
    if (orders) {
      const arr = Object.values(orders);
      document.getElementById("stat-total-orders").textContent = arr.length.toString();
      const pending = arr.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").length;
      document.getElementById("stat-pending-shipments").textContent = pending.toString();
    }
  });
}

function loadUserRegistry() {
  db.ref("users").on("value", snapshot => {
    const users = snapshot.val();
    allUsers = [];
    if (users) {
      for (let uid in users) {
        allUsers.push({ uid: uid, ...users[uid] });
      }
    }
    filterUserRegistry();
  });
}

function filterUserRegistry() {
  const query = document.getElementById("admin-user-search")?.value.toLowerCase() || "";
  const role = document.getElementById("admin-role-filter")?.value || "all";
  const status = document.getElementById("admin-status-filter")?.value || "all";

  filteredUsers = allUsers.filter(u => {
    const matchEmail = u.email ? u.email.toLowerCase().includes(query) : false;
    const matchRole = role === "all" ? true : u.role === role;
    const matchStatus = status === "all" ? true : u.status === status;
    return matchEmail && matchRole && matchStatus;
  });

  currentPage = 1;
  renderUserRegistryTable();
}

function renderUserRegistryTable() {
  const tbody = document.getElementById("admin-user-table-body");
  if (!tbody) return;

  if (filteredUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-muted-gray);">No users match search conditions.</td></tr>`;
    document.getElementById("admin-user-pagination").innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * USERS_PER_PAGE;
  const pageUsers = filteredUsers.slice(start, start + USERS_PER_PAGE);

  tbody.innerHTML = pageUsers.map(u => {
    const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "-";
    return `
      <tr>
        <td><strong>${u.email}</strong><br><span style="font-size:0.75rem; color:var(--color-muted-gray);">${u.displayName || ""}</span></td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-info' : 'badge-warning'}">${u.role}</span></td>
        <td><span class="badge ${u.status === 'disabled' ? 'badge-danger' : 'badge-success'}">${u.status || 'active'}</span></td>
        <td>${createdStr}</td>
        <td>
          <button class="btn btn-secondary btn-small" onclick="openUserActionOptions('${u.uid}')" title="Settings"><span aria-hidden="true">⚙️</span></button>
          <button class="btn btn-primary btn-small" onclick="openEditUserModal('${u.uid}')" title="Edit"><span aria-hidden="true">✏️</span></button>
        </td>
      </tr>
    `;
  }).join("");

  renderUserRegistryPagination();
}

function renderUserRegistryPagination() {
  const container = document.getElementById("admin-user-pagination");
  if (!container) return;

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `<button onclick="changeUserRegistryPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changeUserRegistryPage(${i})">${i}</button>`;
  }
  html += `<button onclick="changeUserRegistryPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
  container.innerHTML = html;
}

window.changeUserRegistryPage = function(page) {
  currentPage = page;
  renderUserRegistryTable();
};

function syncCatalogTable() {
  const productTable = document.getElementById("admin-product-table-body");
  if (productTable) {
    productTable.innerHTML = PRODUCTS.map(p => `
      <tr>
        <td><img src="${p.image}" alt=""></td>
        <td><strong>${p.name}</strong><br><span style="color:var(--color-muted-gray); font-size:0.7rem;">${p.category}</span></td>
        <td>₹${p.price}</td>
        <td style="text-align:right;"><button class="btn-danger-sm" onclick="handleAdminDeleteProduct(${p.id})">Remove</button></td>
      </tr>
    `).join("");
  }
}

function syncOrdersTable() {
  const ordersTable = document.getElementById("admin-orders-table-body");
  if (ordersTable) {
    const orders = OrderDb.get();
    
    // Read filter values
    const query = document.getElementById("admin-order-search")?.value.toLowerCase() || "";
    const statusFilter = document.getElementById("admin-order-status-filter")?.value || "all";
    const startDateVal = document.getElementById("admin-order-start-date")?.value;
    const endDateVal = document.getElementById("admin-order-end-date")?.value;
    
    let startMidnight = null;
    let endMidnight = null;
    if (startDateVal) {
      startMidnight = new Date(startDateVal);
      startMidnight.setHours(0, 0, 0, 0);
    }
    if (endDateVal) {
      endMidnight = new Date(endDateVal);
      endMidnight.setHours(23, 59, 59, 999);
    }

    // Filter orders
    const filteredOrders = orders.filter(o => {
      const matchQuery = (o.id && o.id.toLowerCase().includes(query)) || 
                         (o.customer && o.customer.toLowerCase().includes(query)) ||
                         (o.email && o.email.toLowerCase().includes(query));
      const matchStatus = statusFilter === "all" ? true : o.status === statusFilter;
      
      let matchDate = true;
      if (o.date) {
        const orderDate = new Date(o.date);
        if (startMidnight && orderDate < startMidnight) matchDate = false;
        if (endMidnight && orderDate > endMidnight) matchDate = false;
      }
      
      return matchQuery && matchStatus && matchDate;
    });

    if (filteredOrders.length === 0) {
      ordersTable.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-muted-gray);">No matching orders found.</td></tr>`;
    } else {
      ordersTable.innerHTML = filteredOrders.map(o => {
        const d = new Date(o.date);
        return `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>${d.toLocaleDateString("en-IN", {month:'short', day:'numeric'})}</td>
            <td>${o.customer}</td>
            <td><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></td>
            <td>
              <select class="admin-status-select" onchange="handleAdminUpdateOrderStatus('${o.id}', this.value)" style="padding: 4px; border: 1px solid var(--color-light-gray); background: white;">
                <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
            <td style="text-align:right;">
              <button class="btn-danger-sm" onclick="handleAdminDeleteOrder('${o.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join("");

      // Upgrade inline status selects to custom styled dropdowns
      ordersTable.querySelectorAll("select.admin-status-select").forEach(sel => {
        if (typeof window.initCustomSelect === "function") {
          window.initCustomSelect(sel, { size: "small" });
        }
      });
    }
  }
}

window.filterOrders = function() {
  syncOrdersTable();
};

window.handleAdminUpdateOrderStatus = function(orderId, status) {
  if (isFirebaseInitialized) {
    db.ref("orders/" + orderId).update({ status: status })
      .then(() => {
        logAdminAction("order_status_updated", `Updated order ${orderId} status to ${status}`);
        showToast(`Order ${orderId} set to ${status}`);
      })
      .catch(err => showModal(err.message, { title: 'Update Error', type: 'error' }));
  } else {
    OrderDb.updateStatus(orderId, status);
    showToast(`Order ${orderId} status updated locally to ${status}`);
  }
};

window.handleAdminDeleteOrder = function(orderId) {
  showConfirm(`Are you sure you want to permanently delete order <strong>${orderId}</strong>? This action is irreversible.`, {
    title: 'Delete Order',
    icon: '🗑️',
    confirmText: 'Yes, Delete',
    cancelText: 'Cancel',
    dangerous: true
  }).then(function(confirmed) {
    if (!confirmed) return;
    if (isFirebaseInitialized) {
      db.ref("orders/" + orderId).remove()
        .then(() => {
          logAdminAction("order_deleted", `Deleted order record ${orderId}`);
          showToast(`Deleted order ${orderId}`);
        })
        .catch(err => showModal(err.message, { title: 'Delete Error', type: 'error' }));
    } else {
      let orders = OrderDb.get();
      orders = orders.filter(o => o.id !== orderId);
      OrderDb.save(orders);
      document.dispatchEvent(new CustomEvent("ordersUpdated"));
      showToast(`Deleted order ${orderId} locally`);
    }
  });
};

window.triggerExportOrders = function() {
  const orders = OrderDb.get();
  
  // Apply active filters
  const query = document.getElementById("admin-order-search")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("admin-order-status-filter")?.value || "all";
  const startDateVal = document.getElementById("admin-order-start-date")?.value;
  const endDateVal = document.getElementById("admin-order-end-date")?.value;
  
  let startMidnight = null;
  let endMidnight = null;
  if (startDateVal) {
    startMidnight = new Date(startDateVal);
    startMidnight.setHours(0, 0, 0, 0);
  }
  if (endDateVal) {
    endMidnight = new Date(endDateVal);
    endMidnight.setHours(23, 59, 59, 999);
  }

  const filteredOrders = orders.filter(o => {
    const matchQuery = (o.id && o.id.toLowerCase().includes(query)) || 
                       (o.customer && o.customer.toLowerCase().includes(query)) ||
                       (o.email && o.email.toLowerCase().includes(query));
    const matchStatus = statusFilter === "all" ? true : o.status === statusFilter;
    
    let matchDate = true;
    if (o.date) {
      const orderDate = new Date(o.date);
      if (startMidnight && orderDate < startMidnight) matchDate = false;
      if (endMidnight && orderDate > endMidnight) matchDate = false;
    }
    
    return matchQuery && matchStatus && matchDate;
  });

  if (filteredOrders.length === 0) {
    showModal("No matching orders found to export.", { title: "Export Orders", type: "info" });
    return;
  }

  // Generate CSV
  let csv = "Order ID,Date,Customer Name,Email,Phone,Shipping Address,Subtotal,Tax,Shipping Cost,Total,Items,Status\n";
  filteredOrders.forEach(o => {
    const itemsStr = o.items ? o.items.map(i => `${i.name} (x${i.qty})`).join(" | ") : "Package";
    const d = new Date(o.date).toISOString().split('T')[0];
    csv += `"${o.id}","${d}","${o.customer || ''}","${o.email || ''}","${o.phone || ''}","${(o.address || '').replace(/"/g, '""')}","₹${o.subtotal || 0}","₹${o.tax || 0}","₹${o.shipping || 0}","₹${o.total || 0}","${itemsStr.replace(/"/g, '""')}","${o.status}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signature_spell_orders_export_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  logAdminAction("orders_exported", `Exported CSV file containing ${filteredOrders.length} customer order records`);
  showToast(`CSV export generated for ${filteredOrders.length} orders`);
};

function loadAdminManagers() {
  db.ref("adminUsers").on("value", snapshot => {
    const managers = snapshot.val();
    const list = document.getElementById("admin-managers-list");
    if (!list) return;

    if (!managers) {
      list.innerHTML = `<p style="color:var(--color-muted-gray); font-size:0.85rem;">No designated co-administrators.</p>`;
      return;
    }

    let html = "";
    for (let key in managers) {
      const m = managers[key];
      const isPrimary = m.email === "nandheswara21@gmail.com" || m.email === "admin@signaturespell.com";
      html += `
        <div class="admin-manager-item">
          <div>
            <span style="font-weight: 700; font-size:0.9rem;">${m.email}</span>
            <small style="display:block; color:var(--color-muted-gray); font-size:0.75rem;">Added by ${m.addedByEmail || 'system'}</small>
          </div>
          ${isPrimary ? '<span class="badge badge-success">Primary</span>' : `<button class="btn btn-secondary btn-small" onclick="revokeAdminPrivileges('${key}', '${m.email}')">Revoke</button>`}
        </div>
      `;
    }
    list.innerHTML = html;
  });
}

async function logAdminAction(action, details) {
  const user = UserSession.get();
  if (!user) return;

  const logEntry = {
    timestamp: Date.now(),
    adminId: user.uid,
    adminEmail: user.email,
    action: action,
    details: details
  };

  if (isFirebaseInitialized) {
    try {
      await db.ref("adminLogs").push(logEntry);
    } catch (err) {
      console.error(err);
    }
  }
}

function loadAuditTrails() {
  const tbody = document.getElementById("admin-audit-logs-body");
  if (!tbody) return;

  if (isFirebaseInitialized) {
    db.ref("adminLogs").orderByChild("timestamp").limitToLast(10).on("value", snapshot => {
      const logs = snapshot.val();
      if (!logs) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-muted-gray);">No audit logs registered yet.</td></tr>`;
        return;
      }
      
      const arr = Object.values(logs).reverse();
      tbody.innerHTML = arr.map(l => `
        <tr>
          <td>${new Date(l.timestamp).toLocaleString("en-IN")}</td>
          <td><strong>${l.adminEmail}</strong></td>
          <td><span class="audit-action-badge" style="background:#e8f2ff; color:#0969da;">${l.action}</span></td>
          <td>${l.details}</td>
        </tr>
      `).join("");
    });
  }
}

function loadBulletins() {
  const feed = document.getElementById("admin-announcements-feed");
  if (!feed) return;

  if (isFirebaseInitialized) {
    db.ref("announcements").on("value", snapshot => {
      const bulletins = snapshot.val();
      if (!bulletins) {
        feed.innerHTML = `<p style="color: var(--color-muted-gray); font-size: 0.9rem; text-align: center;">No active bulletins.</p>`;
        return;
      }
      
      let html = "";
      for (let key in bulletins) {
        const b = bulletins[key];
        html += `
          <div style="background-color: var(--color-white); border: 1px solid var(--color-light-gray); padding: 12px; border-left: 3px solid var(--color-gold);">
            <div class="bulletin-header">
              <strong style="font-size:0.95rem;">${b.title}</strong>
              <button onclick="handleDeleteBulletin('${key}')" style="background:none; border:none; cursor:pointer; color:#cf222e; font-size:0.8rem;">Remove</button>
            </div>
            <p style="font-size:0.85rem; color:var(--color-muted-gray);">${b.message}</p>
          </div>
        `;
      }
      feed.innerHTML = html;
    });
  }
}

window.checkImpersonationStatus = function() {
  const userEmail = sessionStorage.getItem("impersonatedUserEmail");
  const banner = document.getElementById("impersonationBanner");
  const emailSpan = document.getElementById("impersonatedUser");
  
  if (userEmail) {
    if (banner && emailSpan) {
      emailSpan.textContent = userEmail;
      banner.style.display = "flex";
    }
  } else {
    if (banner) banner.style.display = "none";
  }
};

window.startImpersonatingUser = function(uid, email) {
  sessionStorage.setItem("impersonatedUserId", uid);
  sessionStorage.setItem("impersonatedUserEmail", email);
  logAdminAction("impersonation_start", `Started simulating user view for ${email}`);
  showToast(`Simulating user view for ${email}`);
  closeAllAdminModals();
  checkImpersonationStatus();
};

const stopImpersonationBtn = document.getElementById("stopImpersonationBtn");
if (stopImpersonationBtn) {
  stopImpersonationBtn.addEventListener("click", () => {
    const email = sessionStorage.getItem("impersonatedUserEmail");
    sessionStorage.removeItem("impersonatedUserId");
    sessionStorage.removeItem("impersonatedUserEmail");
    logAdminAction("impersonation_stop", `Ended simulating user view for ${email}`);
    showToast("Simulation ended.");
    checkImpersonationStatus();
  });
}

function setupAdminFormBindings() {
  const searchInput = document.getElementById("admin-user-search");
  if (searchInput) searchInput.addEventListener("input", filterUserRegistry);
  
  const roleFilter = document.getElementById("admin-role-filter");
  if (roleFilter) roleFilter.addEventListener("change", filterUserRegistry);

  const statusFilter = document.getElementById("admin-status-filter");
  if (statusFilter) statusFilter.addEventListener("change", filterUserRegistry);

  const addUserForm = document.getElementById("form-add-user");
  if (addUserForm) {
    addUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("add-user-email").value.trim().toLowerCase();
      const tempPass = document.getElementById("add-user-password").value;
      const dName = document.getElementById("add-user-name").value.trim();
      const role = document.getElementById("add-user-role").value;
      const alertCont = document.getElementById("alert-add-user");

      if (isFirebaseInitialized) {
        showToast("Creating user... Admin will be briefly logged out.", "info");
        const originalAdmin = UserSession.get();

        try {
          const credential = await firebase.auth().createUserWithEmailAndPassword(email, tempPass);
          const newUser = credential.user;

          await db.ref("users/" + newUser.uid).set({
            email: email,
            displayName: dName || email.split("@")[0],
            role: role,
            status: "active",
            createdAt: Date.now(),
            lastActive: Date.now()
          });

          const trailEntry = {
            timestamp: Date.now(),
            adminId: originalAdmin.uid,
            adminEmail: originalAdmin.email,
            action: "user_created",
            details: `Created user ${email} with role ${role}`
          };
          await db.ref("adminLogs").push(trailEntry);

          await auth.signOut();
          closeAllAdminModals();
          addUserForm.reset();
          showModal("Account created successfully. Please login again to restore your admin session.", { title: 'Account Created!', type: 'success', icon: '✅', confirmText: 'OK' });
          setTimeout(() => window.location.reload(), 1200);
        } catch (err) {
          showInlineAlert(alertCont, err.message, "danger");
        }
      }
    });
  }

  const addAdminForm = document.getElementById("form-add-admin");
  if (addAdminForm) {
    addAdminForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("add-admin-email").value.trim().toLowerCase();
      const notes = document.getElementById("add-admin-notes").value.trim();
      const alertCont = document.getElementById("alert-add-admin");

      const matchUser = allUsers.find(u => u.email === email);
      if (!matchUser) {
        showInlineAlert(alertCont, "Email not found in database.", "danger");
        return;
      }

      if (isFirebaseInitialized) {
        db.ref("users/" + matchUser.uid).update({ role: "admin" })
          .then(() => {
            return db.ref("adminUsers").push({
              email: email,
              addedBy: auth.currentUser.uid,
              addedByEmail: auth.currentUser.email,
              addedAt: Date.now(),
              notes: notes,
              active: true
            });
          })
          .then(() => {
            logAdminAction("admin_granted", `Granted administrative access to ${email}`);
            showToast(`Administrative privileges granted to ${email}`);
            closeAllAdminModals();
            addAdminForm.reset();
          })
          .catch(err => {
            showInlineAlert(alertCont, err.message, "danger");
          });
      }
    });
  }

  const editUserForm = document.getElementById("form-edit-user");
  if (editUserForm) {
    editUserForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const uid = document.getElementById("edit-user-id").value;
      const dName = document.getElementById("edit-user-name").value.trim();
      const role = document.getElementById("edit-user-role").value;
      const status = document.getElementById("edit-user-status").value;
      const alertCont = document.getElementById("alert-edit-user");

      if (isFirebaseInitialized) {
        db.ref("users/" + uid).update({
          displayName: dName,
          role: role,
          status: status
        })
        .then(() => {
          logAdminAction("user_updated", `Updated user attributes for ${dName || uid} (Role: ${role}, Status: ${status})`);
          showToast("User details saved.");
          closeAllAdminModals();
        })
        .catch(err => {
          showInlineAlert(alertCont, err.message, "danger");
        });
      }
    });
  }

  const annForm = document.getElementById("form-announcement");
  if (annForm) {
    annForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("announcement-title").value.trim();
      const msg = document.getElementById("announcement-message").value.trim();
      const alertCont = document.getElementById("alert-announcement");

      if (isFirebaseInitialized) {
        db.ref("announcements").push({
          title: title,
          message: msg,
          timestamp: Date.now()
        })
        .then(() => {
          logAdminAction("announcement_created", `Created bulletin: ${title}`);
          showToast("Bulletin broadcasted.");
          closeAllAdminModals();
          annForm.reset();
        })
        .catch(err => {
          showInlineAlert(alertCont, err.message, "danger");
        });
      }
    });
  }
}

window.closeAllAdminModals = function() {
  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.classList.remove("active");
  });
};

window.openAddUserModal = function() {
  const alertCont = document.getElementById("alert-add-user");
  if (alertCont) alertCont.innerHTML = "";
  document.getElementById("modal-add-user")?.classList.add("active");
};

window.openAddAdminModal = function() {
  const alertCont = document.getElementById("alert-add-admin");
  if (alertCont) alertCont.innerHTML = "";
  document.getElementById("modal-add-admin")?.classList.add("active");
};

window.openEditUserModal = function(uid) {
  const alertCont = document.getElementById("alert-edit-user");
  if (alertCont) alertCont.innerHTML = "";
  const user = allUsers.find(u => u.uid === uid);
  if (!user) return;

  document.getElementById("edit-user-id").value = uid;
  document.getElementById("edit-user-email").value = user.email;
  document.getElementById("edit-user-name").value = user.displayName || "";
  document.getElementById("edit-user-role").value = user.role || "user";
  document.getElementById("edit-user-status").value = user.status || "active";
  document.getElementById("modal-edit-user")?.classList.add("active");
};

window.openUserActionOptions = function(uid) {
  selectedUserId = uid;
  const user = allUsers.find(u => u.uid === uid);
  if (!user) return;

  document.getElementById("action-user-email").textContent = user.email;
  document.getElementById("action-user-name").textContent = user.displayName || "Not set";
  
  const statusBadge = document.getElementById("action-user-status");
  if (statusBadge) {
    statusBadge.textContent = user.status || "active";
    statusBadge.className = `badge ${user.status === 'disabled' ? 'badge-danger' : 'badge-success'}`;
  }

  document.getElementById("btn-action-impersonate").onclick = () => startImpersonatingUser(uid, user.email);
  document.getElementById("btn-action-reset-pass").onclick = () => triggerPasswordResetLink(user.email);
  document.getElementById("btn-action-toggle-status").onclick = () => triggerUserStatusToggle(uid, user.status || "active");
  document.getElementById("btn-action-view-data").onclick = () => triggerViewUserOrders(uid, user.email);
  document.getElementById("btn-action-delete-user").onclick = () => triggerDeleteUserAccount(uid, user.email);

  document.getElementById("modal-user-actions")?.classList.add("active");
};

window.openAnnouncementModal = function() {
  const alertCont = document.getElementById("alert-announcement");
  if (alertCont) alertCont.innerHTML = "";
  document.getElementById("modal-announcement")?.classList.add("active");
};

window.openMaintenanceModal = function() {
  const statusLabel = document.getElementById("maintenance-status-label");
  const toggleBtn = document.getElementById("maintenance-toggle-btn");
  
  if (isFirebaseInitialized) {
    db.ref("maintenanceMode").once("value").then(snapshot => {
      const active = snapshot.val();
      if (active) {
        statusLabel.textContent = "State: Active (Storefront locked)";
        toggleBtn.textContent = "Deactivate Maintenance";
      } else {
        statusLabel.textContent = "State: Inactive (Normal operations)";
        toggleBtn.textContent = "Activate Maintenance";
      }
    });
  }

  document.getElementById("modal-maintenance")?.classList.add("active");
};

window.triggerPasswordResetLink = function(email) {
  if (isFirebaseInitialized) {
    auth.sendPasswordResetEmail(email)
      .then(() => {
        logAdminAction("password_reset", `Dispatched password reset instructions to ${email}`);
        showToast(`Password reset link dispatched to ${email}`);
        closeAllAdminModals();
      })
      .catch(err => showModal(err.message, { title: 'Firebase Error', type: 'error' }));
  }
};

window.triggerUserStatusToggle = function(uid, currentStatus) {
  const newStatus = currentStatus === "disabled" ? "active" : "disabled";
  if (isFirebaseInitialized) {
    db.ref("users/" + uid).update({ status: newStatus })
      .then(() => {
        logAdminAction("user_status_changed", `Changed status of ${uid} to ${newStatus}`);
        showToast(`User status set to ${newStatus}`);
        closeAllAdminModals();
      })
      .catch(err => showModal(err.message, { title: 'Firebase Error', type: 'error' }));
  }
};

window.triggerDeleteUserAccount = function(uid, email) {
  showConfirm(`Are you absolutely sure you want to permanently erase the account for <strong>${email}</strong>? This action is irreversible.`, {
    title: 'Delete User Account',
    icon: '🗑️',
    confirmText: 'Yes, Delete',
    cancelText: 'Cancel',
    dangerous: true
  }).then(function(confirmed) {
    if (!confirmed) return;
    if (isFirebaseInitialized) {
      db.ref("users/" + uid).remove()
        .then(() => {
          logAdminAction("user_deleted", `Deleted database record for ${email}`);
          showToast(`Deleted registry entry for ${email}`);
          closeAllAdminModals();
        })
        .catch(err => showModal(err.message, { title: 'Delete Error', type: 'error' }));
    }
  });
};

window.triggerViewUserOrders = function(uid, email) {
  document.getElementById("user-orders-title-email").textContent = email;
  const tableRows = document.getElementById("user-orders-table-rows");
  
  document.getElementById("user-metric-total-amount").textContent = "₹0";
  document.getElementById("user-metric-total-orders").textContent = "0";

  let orders = OrderDb.get();
  let userOrders = orders.filter(o => o.customer === email);

  if (userOrders.length === 0) {
    tableRows.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-muted-gray);">No orders found for this customer.</td></tr>`;
  } else {
    let totalAmt = 0;
    tableRows.innerHTML = userOrders.map(o => {
      let itemsStr = "";
      let orderTotal = 0;
      if (o.items && Array.isArray(o.items)) {
        itemsStr = o.items.map(item => {
          const prodObj = PRODUCTS.find(p => p.id === item.id);
          const pName = prodObj ? prodObj.name : `Product #${item.id}`;
          const subtotal = (prodObj ? prodObj.price : 0) * item.qty;
          orderTotal += subtotal;
          return `${pName} (x${item.qty})`;
        }).join(", ");
      } else {
        orderTotal = 250;
        itemsStr = "Fragrances package";
      }
      totalAmt += orderTotal;

      return `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${new Date(o.date).toLocaleDateString("en-IN")}</td>
          <td>${itemsStr}</td>
          <td>₹${orderTotal}</td>
          <td><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></td>
        </tr>
      `;
    }).join("");

    document.getElementById("user-metric-total-amount").textContent = `₹${totalAmt}`;
    document.getElementById("user-metric-total-orders").textContent = userOrders.length.toString();
  }

  closeAllAdminModals();
  document.getElementById("modal-view-user-data")?.classList.add("active");
};

window.switchUserDataTab = function(tabId) {
  document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content-panel").forEach(p => p.classList.remove("active"));

  if (tabId === "user-orders") {
    document.querySelector("button[onclick=\"switchUserDataTab('user-orders')\"]").classList.add("active");
    document.getElementById("tab-user-orders").classList.add("active");
  } else {
    document.querySelector("button[onclick=\"switchUserDataTab('user-stats')\"]").classList.add("active");
    document.getElementById("tab-user-stats").classList.add("active");
  }
};

window.revokeAdminPrivileges = function(key, email) {
  showConfirm(`Revoke administrative access from ${email}?`, {
    title: 'Revoke Admin Access',
    icon: '🔐',
    confirmText: 'Yes, Revoke',
    cancelText: 'Cancel',
    dangerous: true
  }).then(function(confirmed) {
    if (!confirmed) return;
    if (isFirebaseInitialized) {
      db.ref("adminUsers/" + key).remove()
        .then(() => {
          const matchUser = allUsers.find(u => u.email === email);
          if (matchUser) {
            return db.ref("users/" + matchUser.uid).update({ role: "user" });
          }
        })
        .then(() => {
          logAdminAction("admin_revoked", `Revoked admin privileges from ${email}`);
          showToast(`Revoked privileges from ${email}`);
        })
        .catch(err => showModal(err.message, { title: 'Firebase Error', type: 'error' }));
    }
  });
};

window.handleDeleteBulletin = function(key) {
  showConfirm("Remove this announcement bulletin?", {
    title: 'Delete Bulletin',
    icon: '📢',
    confirmText: 'Yes, Remove',
    cancelText: 'Cancel',
    dangerous: true
  }).then(function(confirmed) {
    if (!confirmed) return;
    if (isFirebaseInitialized) {
      db.ref("announcements/" + key).remove()
        .then(() => {
          showToast("Bulletin removed.");
        });
    }
  });
};

window.toggleMaintenanceState = function() {
  if (isFirebaseInitialized) {
    db.ref("maintenanceMode").once("value").then(snapshot => {
      const active = !snapshot.val();
      db.ref("maintenanceMode").set(active).then(() => {
        logAdminAction("maintenance_toggled", `Maintenance state toggled to ${active}`);
        showToast(`Maintenance mode set to ${active}`);
        closeAllAdminModals();
      });
    });
  }
};

window.triggerBackupData = function() {
  const backup = {
    products: PRODUCTS,
    orders: OrderDb.get(),
    users: allUsers,
    timestamp: Date.now()
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signature_spell_backup_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  logAdminAction("backup_downloaded", "Generated full system JSON backup");
  showToast("Database backup download started.");
};

window.triggerExportUsers = function() {
  let csv = "UID,Email,DisplayName,Role,Status\n";
  allUsers.forEach(u => {
    csv += `"${u.uid}","${u.email}","${u.displayName || ''}","${u.role}","${u.status || 'active'}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signature_spell_users_registry_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  logAdminAction("users_exported", "Exported CSV list of user registries");
  showToast("CSV Registry export started.");
};

window.triggerClearAuditLogs = function() {
  showConfirm("Are you sure you want to clear all admin audit trail logs? This cannot be undone.", {
    title: 'Clear Audit Logs',
    icon: '🗂️',
    confirmText: 'Yes, Clear All',
    cancelText: 'Cancel',
    dangerous: true
  }).then(function(confirmed) {
    if (!confirmed) return;
    if (isFirebaseInitialized) {
      db.ref("adminLogs").remove().then(() => {
        showToast("Audit trails cleared.");
      });
    }
  });
};

window.handleAdminPageLogout = function() {
  if (isFirebaseInitialized) {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  }
};


