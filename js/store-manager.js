"use strict";

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initStoreManagerConsole();
  }, 300);
});

function initStoreManagerConsole() {
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
          const userFullname = document.getElementById("admin-user-fullname");
          if (userFullname) {
            userFullname.textContent = user.displayName || user.email.split("@")[0];
          }
          if (typeof window.initializeStoreManager === "function") {
            window.initializeStoreManager();
          } else {
            initializeStoreManager();
          }
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
    document.getElementById("access-denied-desc").textContent = !navigator.onLine ? "Check your Internet and try again." : "Firebase is not initialized. Please verify configuration.";
    if (deniedOverlay) deniedOverlay.style.display = "flex";
  }

  setupStoreManagerFormBindings();
  
  document.addEventListener("ordersUpdated", () => {
    syncOrdersTable();
  });
  document.addEventListener("productsUpdated", () => {
    PRODUCTS = ProductDb.get();
    syncCatalogTable();
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

function initializeStoreManager() {
  loadStats();
  syncCatalogTable();
  syncOrdersTable();
}

function loadStats() {
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

window.syncCatalogTable = function() {
  const productTable = document.getElementById("admin-product-table-body");
  if (productTable) {
    productTable.innerHTML = PRODUCTS.map(p => `
      <tr>
        <td><img src="${p.image}" alt=""></td>
        <td><strong>${p.name}</strong><br><span style="color:var(--color-muted-gray); font-size:0.7rem;">${p.category}</span></td>
        <td>${p.size || 'Medium'}</td>
        <td>${p.fragrance || p.notes?.top || '-'}</td>
        <td>₹${p.price}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="btn btn-primary btn-small" style="padding:4px 8px; font-size:0.75rem; margin-right:5px; height:auto; width:auto; display:inline-block;" onclick="openEditProductModal('${p.id}')">Edit</button>
          <button class="btn-danger-sm" onclick="handleAdminDeleteProduct('${p.id}')">Remove</button>
        </td>
      </tr>
    `).join("");
  }
}

window.openAddProductModal = function() {
  const alertCont = document.getElementById("alert-product-modal");
  if (alertCont) alertCont.innerHTML = "";
  
  document.getElementById("product-modal-title").textContent = "Add New Candle";
  document.getElementById("product-modal-submit-btn").textContent = "Add Candle";
  document.getElementById("edit-prod-id").value = "";
  
  const form = document.getElementById("admin-add-product-form");
  if (form) form.reset();

  const imgSelect = document.getElementById("add-prod-image");
  if (imgSelect) {
    // Clean up any dynamic custom options from previous edits
    Array.from(imgSelect.querySelectorAll(".custom-option")).forEach(opt => opt.remove());
  }
  
  const categorySelect = document.getElementById("add-prod-category");
  if (categorySelect) {
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const sizeSelect = document.getElementById("add-prod-size");
  if (sizeSelect) {
    sizeSelect.value = "Medium";
    sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (typeof window.populateActiveFragrancesDropdown === "function") {
    window.populateActiveFragrancesDropdown();
  }
  const fragSelect = document.getElementById("add-prod-fragrance");
  if (fragSelect) {
    fragSelect.value = fragSelect.options[0]?.value || "";
    fragSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  
  document.getElementById("modal-add-product")?.classList.add("active");
};

window.openEditProductModal = function(productId) {
  const alertCont = document.getElementById("alert-product-modal");
  if (alertCont) alertCont.innerHTML = "";
  
  const product = PRODUCTS.find(p => p.id == productId);
  if (!product) return;

  document.getElementById("product-modal-title").textContent = "Edit Candle Details";
  document.getElementById("product-modal-submit-btn").textContent = "Save Changes";
  document.getElementById("edit-prod-id").value = product.id;
  
  document.getElementById("add-prod-name").value = product.name || "";
  document.getElementById("add-prod-price").value = product.price || 0;
  
  const categorySelect = document.getElementById("add-prod-category");
  if (categorySelect) {
    categorySelect.value = product.category || "Tea Lights";
    categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const sizeSelect = document.getElementById("add-prod-size");
  if (sizeSelect) {
    sizeSelect.value = product.size || "Medium";
    sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (typeof window.populateActiveFragrancesDropdown === "function") {
    window.populateActiveFragrancesDropdown();
  }
  const fragSelect = document.getElementById("add-prod-fragrance");
  if (fragSelect) {
    fragSelect.value = product.fragrance || product.notes?.top || (fragSelect.options[0]?.value || "");
    fragSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  
  const imgSelect = document.getElementById("add-prod-image");
  if (imgSelect) {
    // Clean up any dynamic custom options first
    Array.from(imgSelect.querySelectorAll(".custom-option")).forEach(opt => opt.remove());
    
    const val = product.image || "";
    let exists = false;
    for (let i = 0; i < imgSelect.options.length; i++) {
      if (imgSelect.options[i].value === val) {
        exists = true;
        break;
      }
    }
    
    // Dynamically append custom option if not present in the pre-defined list
    if (!exists && val) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.className = "custom-option";
      opt.textContent = `${val} (Custom Path)`;
      imgSelect.appendChild(opt);
    }
    imgSelect.value = val;
  }

  document.getElementById("add-prod-desc").value = product.description || "";

  document.getElementById("modal-add-product")?.classList.add("active");
};

window.syncOrdersTable = function() {
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
  if (status === "Shipped") {
    openCarrierDetailsModal(orderId);
    return;
  }

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

function setupStoreManagerFormBindings() {
  const carrierForm = document.getElementById("form-carrier-details");
  if (carrierForm) {
    carrierForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const orderId = document.getElementById("carrier-order-id").value;
      const carrier = document.getElementById("carrier-name-input").value.trim();
      const trackingId = document.getElementById("carrier-tracking-input").value.trim();
      const alertCont = document.getElementById("alert-carrier-details");

      if (isFirebaseInitialized) {
        db.ref("orders/" + orderId).update({
          status: "Shipped",
          carrier: carrier,
          trackingId: trackingId
        })
        .then(() => {
          logAdminAction("order_status_updated", `Updated order ${orderId} status to Shipped (Carrier: ${carrier}, Tracking ID: ${trackingId})`);
          showToast(`Order ${orderId} marked as Shipped`);
          closeAllAdminModals();
          syncOrdersTable();
        })
        .catch(err => {
          if (typeof showInlineAlert === "function") {
            showInlineAlert(alertCont, err.message, "danger");
          } else {
            alert(err.message);
          }
        });
      } else {
        const list = OrderDb.get();
        const order = list.find(o => o.id === orderId);
        if (order) {
          order.status = "Shipped";
          order.carrier = carrier;
          order.trackingId = trackingId;
          OrderDb.save(list);
          document.dispatchEvent(new CustomEvent("ordersUpdated"));
        }
        showToast(`Order ${orderId} status updated locally to Shipped`);
        closeAllAdminModals();
      }
    });
  }
}

window.openCarrierDetailsModal = function(orderId) {
  const alertCont = document.getElementById("alert-carrier-details");
  if (alertCont) alertCont.innerHTML = "";
  
  const orderIdInput = document.getElementById("carrier-order-id");
  if (orderIdInput) orderIdInput.value = orderId;
  
  const nameInput = document.getElementById("carrier-name-input");
  if (nameInput) nameInput.value = "";
  
  const trackingInput = document.getElementById("carrier-tracking-input");
  if (trackingInput) trackingInput.value = "";
  
  if (isFirebaseInitialized) {
    db.ref("orders/" + orderId).once("value").then(snapshot => {
      const order = snapshot.val();
      if (order) {
        if (nameInput && order.carrier) nameInput.value = order.carrier;
        if (trackingInput && order.trackingId) trackingInput.value = order.trackingId;
      }
    });
  } else {
    const localOrder = OrderDb.get().find(o => o.id === orderId);
    if (localOrder) {
      if (nameInput && localOrder.carrier) nameInput.value = localOrder.carrier;
      if (trackingInput && localOrder.trackingId) trackingInput.value = localOrder.trackingId;
    }
  }

  document.getElementById("modal-carrier-details")?.classList.add("active");
};

window.closeAllAdminModals = function() {
  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.classList.remove("active");
  });
  syncOrdersTable();
};

window.populateActiveFragrancesDropdown = function() {
  const fragSelect = document.getElementById("add-prod-fragrance");
  if (!fragSelect) return;
  
  // Clear existing options
  fragSelect.innerHTML = "";
  
  const fragrancesList = Object.values(window.allFragrances || {});
  if (fragrancesList.length > 0) {
    fragrancesList.forEach(frag => {
      const opt = document.createElement("option");
      opt.value = frag.name;
      opt.textContent = frag.name;
      fragSelect.appendChild(opt);
    });
  } else {
    const fallbackFragrances = ["Lavender Mist", "Vanilla Wood"];
    fallbackFragrances.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      fragSelect.appendChild(opt);
    });
  }
};
