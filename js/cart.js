/* js/cart.js - Cart page logic and INR calculations with 18% GST */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.initCartPage === "function") {
    window.initCartPage();
    return;
  }

  const itemsContainer = document.querySelector(".cart-items-list");
  const summaryBlock = document.querySelector(".cart-summary-block");
  const ABANDONED_MARK_KEY = "ss_abandoned_cart_last_sent";
  const ABANDONED_COOLDOWN_MS = 12 * 60 * 60 * 1000;
  
  if (!itemsContainer) return;

  const checkoutCta = document.getElementById("proceed-checkout-cta");
  if (checkoutCta) {
    checkoutCta.addEventListener("click", () => {
      sessionStorage.setItem("ss_skip_abandoned_cart_once", "1");
    });
  }

  function getLoggedInEmail() {
    if (typeof auth !== "undefined" && auth.currentUser && auth.currentUser.email) {
      return auth.currentUser.email;
    }
    if (typeof UserSession !== "undefined" && typeof UserSession.get === "function") {
      const user = UserSession.get();
      return user && user.email ? user.email : "";
    }
    return "";
  }

  function buildCartPayload(cart) {
    let subtotal = 0;
    const items = cart.map(item => {
      const product = (typeof PRODUCTS !== "undefined") ? PRODUCTS.find(prod => String(prod.id) === String(item.id)) : null;
      const unitPrice = product ? Number(product.price || 0) : 0;
      const qty = Number(item.qty || 0);
      subtotal += unitPrice * qty;
      return {
        id: item.id,
        name: product ? product.name : "Candle",
        qty: qty,
        price: unitPrice
      };
    });

    return {
      email: getLoggedInEmail(),
      customer: "",
      items: items,
      subtotal: Number(subtotal.toFixed(2)),
      cartUrl: "https://signature-spell.com/cart.html"
    };
  }

  function maybeQueueAbandonedCartReminder(useBeacon) {
    if (!window.EmailNotificationService || typeof window.EmailNotificationService.queueAbandonedCartReminder !== "function") {
      return;
    }

    if (sessionStorage.getItem("ss_skip_abandoned_cart_once") === "1") {
      sessionStorage.removeItem("ss_skip_abandoned_cart_once");
      return;
    }

    if (typeof CartStorage === "undefined") return;
    const cart = CartStorage.get();
    if (!cart || cart.length === 0) return;

    const email = getLoggedInEmail();
    if (!email) return;

    const lastSent = Number(localStorage.getItem(ABANDONED_MARK_KEY) || "0");
    if (Date.now() - lastSent < ABANDONED_COOLDOWN_MS) return;

    const payload = buildCartPayload(cart);
    if (!payload.items.length) return;

    localStorage.setItem(ABANDONED_MARK_KEY, String(Date.now()));
    window.EmailNotificationService.queueAbandonedCartReminder(payload, !!useBeacon);
  }

  window.addEventListener("pagehide", () => {
    maybeQueueAbandonedCartReminder(true);
  });

  function renderCart() {
    if (typeof CartStorage === "undefined" || typeof PRODUCTS === "undefined") return;
    const cart = CartStorage.get();
    
    if (cart.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty-message">
          <h3>Your cart is empty</h3>
          <p style="margin-bottom: 24px;">Browse our collection of luxury hand-poured candle lines.</p>
          <a href="shop.html" class="btn btn-primary">Browse Scents</a>
        </div>
      `;
      if (summaryBlock) summaryBlock.style.display = "none";
      return;
    }
    
    if (summaryBlock) summaryBlock.style.display = "block";
    
    let html = `
      <div class="cart-header-row">
        <div>Product</div>
        <div style="text-align: center;">Price</div>
        <div style="text-align: center;">Quantity</div>
        <div style="text-align: right;">Total</div>
        <div></div>
      </div>
    `;
    
    let subtotal = 0;
    
    cart.forEach(item => {
      const p = PRODUCTS.find(prod => prod.id == item.id);
      if (!p) return;
      
      const itemTotal = p.price * item.qty;
      subtotal += itemTotal;
      
      html += `
        <div class="cart-item-row" data-id="${p.id}">
          <div class="cart-item-info">
            <div class="cart-item-img">
              <img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="cart-item-details">
              <h4><a href="product.html?id=${p.id}">${p.name}</a></h4>
              <span class="product-category">${p.category}</span>
            </div>
          </div>
          <div class="cart-item-price-unit">₹${p.price}</div>
          <div class="qty-selector-cell">
            <div class="quantity-selector" style="height: 40px; max-width: 120px;">
              <button class="qty-btn" onclick="updateCartItemQty('${p.id}', ${item.qty - 1})">-</button>
              <input type="text" class="qty-input" value="${item.qty}" readonly>
              <button class="qty-btn" onclick="updateCartItemQty('${p.id}', ${item.qty + 1})">+</button>
            </div>
          </div>
          <div class="subtotal-cell" style="font-family: var(--font-heading); font-weight: 700; text-align: right;">₹${itemTotal}</div>
          <div class="remove-cell" style="text-align: right;">
            <button class="cart-item-remove" onclick="handleRemoveCartItem('${p.id}')">✕</button>
          </div>
        </div>
      `;
    });
    
    itemsContainer.innerHTML = html;
    
    // Math logic adjustments for INR (₹500 threshold, 18% GST)
    const shipping = subtotal >= 500 ? 0 : 50;
    const gstRate = 0.18;
    const estimatedTax = subtotal * gstRate;
    const grandTotal = subtotal;
    
    const subtotalEl = document.getElementById("cart-subtotal");
    const shippingEl = document.getElementById("cart-shipping");
    const taxEl = document.getElementById("cart-tax");
    const totalEl = document.getElementById("cart-total");
    const shipBanner = document.getElementById("free-ship-banner-container");
    
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₹${estimatedTax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${grandTotal.toFixed(2)}`;
    
    if (shipBanner) {
      if (subtotal >= 500) {
        shipBanner.innerHTML = `
          <div class="free-ship-banner">
            ✨ Your order qualifies for <strong>FREE Delivery</strong> across India!
          </div>
        `;
      } else {
        const remaining = 500 - subtotal;
        shipBanner.innerHTML = `
          <div class="free-ship-banner" style="border-left-color: var(--color-muted-gray); background-color: var(--color-cream-dark);">
            Add <strong>₹${remaining.toFixed(2)}</strong> more to unlock <strong>FREE Delivery</strong>.
          </div>
        `;
      }
    }
  }
  
  window.updateCartItemQty = function(productId, newQty) {
    if (typeof CartStorage !== "undefined") {
      CartStorage.updateQty(productId, newQty);
      renderCart();
    }
  };
  
  window.handleRemoveCartItem = function(productId) {
    if (typeof CartStorage !== "undefined") {
      CartStorage.remove(productId);
      renderCart();
      if (typeof showToast === "function") {
        showToast("Removed from cart.");
      }
    }
  };
  
  renderCart();
});
