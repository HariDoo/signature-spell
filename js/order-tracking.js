/* js/order-tracking.js - Order tracking state queries and steppers rendering */

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  let orderId = urlParams.get("orderId");
  if (orderId) {
    sessionStorage.setItem("selected_order_id", orderId);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    orderId = sessionStorage.getItem("selected_order_id");
  }
  
  const trackingForm = document.getElementById("order-tracking-form");
  const searchSection = document.querySelector(".tracker-search-section");
  const displaySection = document.getElementById("tracking-display-section");
  const trackingIdEl = document.getElementById("tracking-order-id");
  const trackingDateEl = document.getElementById("tracking-order-date");
  const progressFill = document.querySelector(".tracker-progress-fill");
  
  const trackCustomerName = document.getElementById("track-cust-name");
  const trackAddress = document.getElementById("track-cust-address");
  const trackDetailsSection = document.getElementById("track-recap-items");
  const trackCarrier = document.getElementById("track-carrier");
  
  function fetchAndShowOrder(id) {
    if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
      db.ref("orders/" + id).once("value")
        .then(snapshot => {
          const val = snapshot.val();
          if (val) {
            renderOrderTrackingUI(val);
          } else {
            // Check local fallback
            const localOrder = (typeof OrderDb !== "undefined") ? OrderDb.get().find(o => o.id == id) : null;
            if (localOrder) {
              renderOrderTrackingUI(localOrder);
            } else {
              showModal("We couldn't find an order with that ID. Please double-check your Order ID and try again.", {
                title: "Order Not Found",
                type: "error",
                icon: "🔍",
                confirmText: "Try Again"
              });
            }
          }
        })
        .catch(err => {
          console.error("Firebase track error", err);
          const localOrder = (typeof OrderDb !== "undefined") ? OrderDb.get().find(o => o.id == id) : null;
          if (localOrder) renderOrderTrackingUI(localOrder);
        });
    } else {
      const localOrder = (typeof OrderDb !== "undefined") ? OrderDb.get().find(o => o.id == id) : null;
      if (localOrder) {
        renderOrderTrackingUI(localOrder);
      } else {
        // Render mock tracking if user wants to play around with random IDs
        const mockOrder = {
          id: id,
          customer: "Valued Scent Customer",
          address: "42 Golden Leaf Road, Bangalore, Karnataka, 560001",
          date: new Date().toISOString(),
          status: "Shipped",
          items: [{ name: "Golden T-Light Candle", qty: 2 }]
        };
        renderOrderTrackingUI(mockOrder);
      }
    }
  }
  
  function renderOrderTrackingUI(order) {
    if (searchSection) searchSection.style.display = "none";
    if (displaySection) displaySection.style.display = "block";
    if (trackingIdEl) trackingIdEl.textContent = order.id;

    const downloadBtn = document.getElementById("download-tracking-invoice-btn");
    if (downloadBtn) {
      downloadBtn.style.display = "flex";
      downloadBtn.onclick = () => {
        if (typeof window.downloadOrderInvoice === "function") {
          window.downloadOrderInvoice(order);
        } else {
          if (typeof showToast === "function") {
            showToast("Invoice generator is not ready.", "error");
          } else {
            alert("Invoice generator script not loaded yet.");
          }
        }
      };
    }
    
    // Order date formatting
    const d = new Date(order.date);
    if (trackingDateEl) {
      trackingDateEl.textContent = "Ordered on " + d.toLocaleDateString("en-IN", { month: 'long', day: 'numeric', year: 'numeric' });
    }
    
    if (trackCustomerName) trackCustomerName.textContent = order.customer;
    if (trackAddress) trackAddress.textContent = order.address;
    
    // Items recap list
    if (trackDetailsSection && order.items) {
      trackDetailsSection.innerHTML = order.items.map(item => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--color-light-gray); font-size:0.9rem;">
          <span>${item.name} <strong>x${item.qty}</strong></span>
        </div>
      `).join("");
    }
    
    const statusBadge = document.getElementById("tracking-status-badge");
    if (statusBadge) {
      if (order.status === "Cancelled") {
        statusBadge.textContent = "Cancelled";
        statusBadge.style.backgroundColor = "#cf222e";
        statusBadge.style.borderColor = "#cf222e";
        statusBadge.style.color = "#ffffff";
      } else {
        statusBadge.textContent = "Active Tracking";
        statusBadge.style.backgroundColor = "";
        statusBadge.style.borderColor = "";
        statusBadge.style.color = "";
      }
    }

    const carrierWrapper = document.getElementById("track-carrier-wrapper");
    if (carrierWrapper) {
      const status = order.status ? order.status.toLowerCase() : "confirmed";
      if (status === "shipped" || status === "delivered") {
        if (order.carrier) {
          carrierWrapper.style.display = "block";
          carrierWrapper.innerHTML = `Carrier: <strong>${order.carrier}</strong>${order.trackingId ? ` &nbsp;|&nbsp; Tracking ID: <strong>${order.trackingId}</strong>` : ''}`;
        } else {
          carrierWrapper.style.display = "block";
          carrierWrapper.innerHTML = `Carrier: <strong>In Transit via India Post BlueDart</strong>`;
        }
      } else if (status === "cancelled") {
        carrierWrapper.style.display = "block";
        carrierWrapper.innerHTML = `Carrier: <strong>Shipment Cancelled</strong>`;
      } else {
        carrierWrapper.style.display = "none";
      }
    }
    
    // Set Steps Activation based on status
    // Status can be: Confirmed -> Processing -> Shipped -> Delivered
    setTimeout(() => {
      const steps = document.querySelectorAll(".tracker-step");
      if (steps.length === 0) return;
      steps.forEach(s => s.classList.remove("completed", "active"));
      
      const banner = document.getElementById("tracking-status-banner");
      const stepsContainer = document.querySelector(".tracker-steps-container");
      
      let fillPercent = 0;
      const status = order.status ? order.status.toLowerCase() : "confirmed";
      
      if (status === "cancelled") {
        if (banner) {
          banner.innerHTML = `
            <div class="alert alert-danger" style="margin-bottom: 0; display: flex; align-items: center; gap: 12px; font-weight: 500;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              This order has been cancelled by the administrator. If you have any questions, please contact our support team.
            </div>
          `;
          banner.style.display = "block";
        }
        if (stepsContainer) stepsContainer.style.display = "none";
      } else {
        if (banner) banner.style.display = "none";
        if (stepsContainer) stepsContainer.style.display = "flex";

        if (status === "confirmed") {
          steps[0].classList.add("active");
          fillPercent = 0;
        } else if (status === "processing") {
          steps[0].classList.add("completed");
          steps[1].classList.add("active");
          fillPercent = 33;
        } else if (status === "shipped") {
          steps[0].classList.add("completed");
          steps[1].classList.add("completed");
          steps[2].classList.add("active");
          fillPercent = 66;
        } else if (status === "delivered") {
          steps[0].classList.add("completed");
          steps[1].classList.add("completed");
          steps[2].classList.add("completed");
          steps[3].classList.add("completed");
          fillPercent = 100;
        }
      }
      
      const isMobile = window.innerWidth <= 768;
      if (progressFill) {
        if (isMobile) {
          progressFill.style.height = `${fillPercent}%`;
          progressFill.style.width = "100%";
        } else {
          progressFill.style.width = `${fillPercent}%`;
        }
      }
    }, 200);
  }
  
  if (orderId) {
    fetchAndShowOrder(orderId);
  } else {
    if (searchSection) searchSection.style.display = "block";
    if (displaySection) displaySection.style.display = "none";
  }
  
  if (trackingForm) {
    trackingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const idInput = document.getElementById("tracking-id-input").value.trim();
      if (idInput) {
        sessionStorage.setItem("selected_order_id", idInput);
        fetchAndShowOrder(idInput);
      }
    });
  }
});
