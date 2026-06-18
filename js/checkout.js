/* js/checkout.js - Checkout logic and order placement integrations */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof CartStorage === "undefined" || typeof PRODUCTS === "undefined") return;

  const cart = CartStorage.get();
  const checkoutList = document.querySelector(".checkout-item-list");
  
  if (cart.length === 0 && window.location.pathname.includes("checkout.html")) {
    window.location.href = "cart.html";
    return;
  }
  
  let subtotal = 0;
  
  if (checkoutList) {
    let html = "";
    cart.forEach(item => {
      const p = PRODUCTS.find(prod => prod.id == item.id);
      if (!p) return;
      const rowTotal = p.price * item.qty;
      subtotal += rowTotal;
      
      html += `
        <div class="checkout-item">
          <div class="checkout-item-left">
            <div class="checkout-item-thumb">
              <img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div>
              <span class="checkout-item-title">${p.name}</span>
              <span class="checkout-item-qty">x${item.qty}</span>
            </div>
          </div>
          <span class="checkout-item-price">₹${rowTotal}</span>
        </div>
      `;
    });
    checkoutList.innerHTML = html;
  }
  
  const shipping = subtotal >= 500 ? 0 : 50;
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + shipping + tax;
  
  const subtotalEl = document.getElementById("checkout-subtotal");
  const shippingEl = document.getElementById("checkout-shipping");
  const taxEl = document.getElementById("checkout-tax");
  const totalEl = document.getElementById("checkout-total");
  
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
  
  // Auto-populate & lock email address if logged in
  const emailInput = document.getElementById("shipping-email");
  
  const lockEmailField = (email) => {
    if (emailInput && email) {
      emailInput.value = email;
      emailInput.readOnly = true;
      emailInput.style.backgroundColor = "var(--color-cream-dark)";
      emailInput.style.color = "var(--color-muted-gray)";
    }
  };

  if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && auth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        lockEmailField(user.email);
        initCheckoutAddressBook(user);
      }
    });
  } else if (typeof UserSession !== "undefined") {
    const sessionUser = UserSession.get();
    if (sessionUser && sessionUser.email) {
      lockEmailField(sessionUser.email);
    }
  }

  // Checkout address book functions
  async function initCheckoutAddressBook(user) {
    const container = document.getElementById("checkout-address-selector-container");
    const select = document.getElementById("checkout-address-select");
    if (!container || !select) return;
    
    try {
      const snapshot = await db.ref("users/" + user.uid + "/addresses").once("value");
      const data = snapshot.val();
      
      if (!data) {
        container.style.display = "none";
        return;
      }
      
      const addresses = Object.values(data);
      if (addresses.length === 0) {
        container.style.display = "none";
        return;
      }
      
      // Store addresses locally so we can access them when dropdown changes
      window.checkoutAddresses = addresses;
      
      // Create options: first option is empty/prompt
      let html = '<option value="">-- Select a saved address --</option>';
      
      // Sort addresses so default is always first
      addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

      addresses.forEach(addr => {
        const defaultText = addr.isDefault ? " [Default]" : "";
        html += `<option value="${addr.id}">${addr.firstName} ${addr.lastName}: ${addr.address}, ${addr.city} (${addr.zip})${defaultText}</option>`;
      });
      html += '<option value="new">-- Enter a new address --</option>';
      
      select.innerHTML = html;
      container.style.display = "block";
      
      // If there's a default address, select it and fill the form automatically!
      const defaultAddr = addresses.find(a => a.isDefault);
      if (defaultAddr) {
        select.value = defaultAddr.id;
        fillShippingForm(defaultAddr);
      }

      // Initialize or refresh custom select styling
      if (typeof window.initCustomSelect === "function") {
        window.initCustomSelect(select);
        if (select.parentNode && select.parentNode.refresh) {
          select.parentNode.refresh();
        }
      }
      
      // Bind selection change
      select.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "" || val === "new") {
          clearShippingForm();
        } else {
          const matched = window.checkoutAddresses.find(a => a.id === val);
          if (matched) {
            fillShippingForm(matched);
          }
        }
      });
      
    } catch (err) {
      console.error("Error loading checkout address book:", err);
    }
  }

  function fillShippingForm(addr) {
    const fields = {
      "shipping-first-name": addr.firstName,
      "shipping-last-name": addr.lastName,
      "shipping-address": addr.address,
      "shipping-city": addr.city,
      "shipping-zip": addr.zip,
      "shipping-phone": addr.phone
    };
    
    for (const [id, val] of Object.entries(fields)) {
      const input = document.getElementById(id);
      if (input) {
        input.value = val || "";
      }
    }
  }

  function clearShippingForm() {
    const ids = [
      "shipping-first-name",
      "shipping-last-name",
      "shipping-address",
      "shipping-city",
      "shipping-zip",
      "shipping-phone"
    ];
    
    ids.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.value = "";
      }
    });
  }

  // CONFIGURATION: Replace with your deployed Google Apps Script Web App URL
  const GOOGLE_SHEET_FORM_URL = "https://script.google.com/macros/s/AKfycbwu1xvxnI50q_Thhmtt75wUiIjnZX0z2Czf2Ei2PYv2-gQN1SrSk1oEmuLC9vF5yP6m/exec";

  // Form checkout submits
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Determine capture email (always prioritize logged-in user email over input value)
      let email = document.getElementById("shipping-email").value.trim();
      if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && auth && auth.currentUser) {
        email = auth.currentUser.email;
      } else if (typeof UserSession !== "undefined") {
        const sessionUser = UserSession.get();
        if (sessionUser && sessionUser.email) {
          email = sessionUser.email;
        }
      }
      
      const first = document.getElementById("shipping-first-name").value.trim();
      const last = document.getElementById("shipping-last-name").value.trim();
      const address = document.getElementById("shipping-address").value.trim();
      const city = document.getElementById("shipping-city").value.trim();
      const zip = document.getElementById("shipping-zip").value.trim();
      const phone = document.getElementById("shipping-phone").value.trim();
      
      const orderId = "SS-" + Math.floor(100000 + Math.random() * 900000);
      
      const newOrderObj = {
        id: orderId,
        date: new Date().toISOString(),
        customer: `${first} ${last}`,
        email: email,
        phone: phone,
        address: `${address}, ${city}, Pin - ${zip}`,
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        total: total,
        items: cart.map(i => ({ id: i.id, name: PRODUCTS.find(p => p.id == i.id).name, qty: i.qty })),
        status: "Confirmed"
      };

      // Disable submit button & show processing text
      const submitBtn = checkoutForm.querySelector('button[type="submit"]');
      let originalBtnText = "";
      if (submitBtn) {
        originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Processing Order...";
      }

      const proceedToReceipt = () => {
        CartStorage.clear();
        sessionStorage.setItem("selected_order_id", orderId);
        window.location.href = "order-tracking.html";
      };

      const sendWebsiteOrderNotification = () => {
        if (!window.UserNotificationsApi || typeof window.UserNotificationsApi.createForCurrentUser !== "function") {
          return Promise.resolve();
        }

        return window.UserNotificationsApi.createForCurrentUser({
          type: "order",
          title: "Order confirmed",
          message: `Your order ${orderId} has been placed successfully.`,
          link: `order-tracking.html?orderId=${encodeURIComponent(orderId)}`,
          orderId: orderId,
          status: "Confirmed"
        }).catch(() => {});
      };

      const sendOrderNotification = () => {
        const emailPayload = {
          ...newOrderObj,
          "Form Name": "Order Placement",
          "Submitted At": new Date().toLocaleString()
        };
        return fetch(GOOGLE_SHEET_FORM_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(emailPayload)
        })
        .catch(err => {
          console.error("Google Apps Script order notification failed:", err);
        });
      };
      
      if (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
        db.ref("orders/" + orderId).set(newOrderObj)
          .then(() => sendOrderNotification())
          .then(() => sendWebsiteOrderNotification())
          .then(proceedToReceipt)
          .catch(err => {
            console.error("Firebase order save failed", err);
            if (typeof OrderDb !== "undefined") OrderDb.add(newOrderObj);
            sendOrderNotification().then(() => sendWebsiteOrderNotification()).then(proceedToReceipt);
          });
      } else {
        if (typeof OrderDb !== "undefined") OrderDb.add(newOrderObj);
        sendOrderNotification().then(() => sendWebsiteOrderNotification()).then(proceedToReceipt);
      }
    });
  }
});
