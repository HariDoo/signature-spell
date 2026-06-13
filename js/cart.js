/* js/cart.js - Cart page logic and INR calculations with 18% GST */

document.addEventListener("DOMContentLoaded", () => {
  const itemsContainer = document.querySelector(".cart-items-list");
  const summaryBlock = document.querySelector(".cart-summary-block");
  
  if (!itemsContainer) return;

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
      const p = PRODUCTS.find(prod => prod.id === item.id);
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
              <button class="qty-btn" onclick="updateCartItemQty(${p.id}, ${item.qty - 1})">-</button>
              <input type="text" class="qty-input" value="${item.qty}" readonly>
              <button class="qty-btn" onclick="updateCartItemQty(${p.id}, ${item.qty + 1})">+</button>
            </div>
          </div>
          <div class="subtotal-cell" style="font-family: var(--font-heading); font-weight: 700; text-align: right;">₹${itemTotal}</div>
          <div class="remove-cell" style="text-align: right;">
            <button class="cart-item-remove" onclick="handleRemoveCartItem(${p.id})">✕</button>
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
