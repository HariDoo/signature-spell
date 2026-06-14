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
  if (emailInput) {
    let activeEmail = "";
    if (typeof firebase !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized && auth && auth.currentUser) {
      activeEmail = auth.currentUser.email;
    } else if (typeof UserSession !== "undefined") {
      const sessionUser = UserSession.get();
      if (sessionUser && sessionUser.email) activeEmail = sessionUser.email;
    }
    if (activeEmail) {
      emailInput.value = activeEmail;
      emailInput.readOnly = true;
      emailInput.style.backgroundColor = "var(--color-cream-dark)";
      emailInput.style.color = "var(--color-muted-gray)";
    }
  }

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
      
      if (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
        db.ref("orders/" + orderId).set(newOrderObj)
          .then(() => {
            CartStorage.clear();
            sessionStorage.setItem("selected_order_id", orderId);
            window.location.href = "order-tracking.html";
          })
          .catch(err => {
            console.error("Firebase order save failed", err);
            if (typeof OrderDb !== "undefined") OrderDb.add(newOrderObj);
            CartStorage.clear();
            sessionStorage.setItem("selected_order_id", orderId);
            window.location.href = "order-tracking.html";
          });
      } else {
        if (typeof OrderDb !== "undefined") OrderDb.add(newOrderObj);
        CartStorage.clear();
        sessionStorage.setItem("selected_order_id", orderId);
        window.location.href = "order-tracking.html";
      }
    });
  }
});
