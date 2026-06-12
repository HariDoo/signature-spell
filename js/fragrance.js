/**
 * Signature Spell - Fragrance Variants & Admin Scent Management
 */
(function() {
  "use strict";

  window.allFragrances = {};

  // Clean global products array in-place to remove Firebase null/undefined values
  function cleanGlobalProducts() {
    if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS)) {
      for (let i = PRODUCTS.length - 1; i >= 0; i--) {
        const p = PRODUCTS[i];
        if (p === null || typeof p !== "object" || !p.id || !p.name) {
          PRODUCTS.splice(i, 1);
        }
      }
    }
  }

  // Clean on initial load
  cleanGlobalProducts();
  document.addEventListener("productsUpdated", cleanGlobalProducts);

  // Initialize Firebase sync and database if available
  document.addEventListener("DOMContentLoaded", () => {
    initializeFragranceDb();
    if (window.location.pathname.includes("product.html")) {
      setTimeout(injectDetailsPageDropdown, 500);
    }
  });

  function initializeFragranceDb() {
    if (typeof db !== "undefined" && typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
      // Setup Firebase real-time listeners for fragrances
      db.ref("fragrances").on("value", snapshot => {
        window.allFragrances = snapshot.val() || {};
        
        // Auto-initialize default fragrances if none exist in Firebase
        if (Object.keys(window.allFragrances).length === 0) {
          db.ref("fragrances/f1").set({ id: "f1", name: "Lavender Mist" });
          db.ref("fragrances/f2").set({ id: "f2", name: "Vanilla Wood" });
          return;
        }

        // Trigger updates in UI
        if (window.location.pathname.includes("admin.html")) {
          renderAdminFragranceList();
          updateFragranceCheckboxes();
        }
        
        document.dispatchEvent(new CustomEvent("fragrancesUpdated"));
        document.dispatchEvent(new CustomEvent("productsUpdated"));
      });

      // Auto-assign default fragrances to products that don't have fragrance assignments yet
      db.ref("products").once("value", snapshot => {
        const prods = snapshot.val();
        if (prods) {
          Object.keys(prods).forEach(key => {
            if (!prods[key].fragrances) {
              db.ref("products/" + key + "/fragrances").set({
                f1: true,
                f2: true
              });
            }
          });
        }
      });
    } else {
      // Local fallbacks if Firebase not available
      window.allFragrances = {
        "f1": { id: "f1", name: "Lavender Mist" },
        "f2": { id: "f2", name: "Vanilla Wood" }
      };
    }
  }

  // Hook into admin console initialization
  const checkAdminInterval = setInterval(() => {
    if (typeof window.initializeDashboard === "function" || typeof initializeDashboard === "function") {
      clearInterval(checkAdminInterval);
      const originalInitDash = window.initializeDashboard || initializeDashboard;
      
      const newInitDash = function() {
        originalInitDash();
        injectAdminFragranceCard();
        populateAssignProductDropdown();
      };
      
      if (typeof window.initializeDashboard === "function") {
        window.initializeDashboard = newInitDash;
      } else {
        // Override global
        window.initializeDashboard = newInitDash;
      }
    }
  }, 100);

  // Storefront overrides: intercept card rendering
  if (typeof window.createProductCardHTML === "function" || typeof createProductCardHTML === "function") {
    const originalCreateCardHTML = window.createProductCardHTML || createProductCardHTML;
    
    window.createProductCardHTML = function(product) {
      const originalHTML = originalCreateCardHTML(product);
      
      // Determine assigned fragrances
      const assignedIds = product.fragrances ? Object.keys(product.fragrances) : [];
      let optionsHTML = "";
      if (assignedIds.length > 0) {
        assignedIds.forEach(fid => {
          const name = window.allFragrances[fid] ? window.allFragrances[fid].name : fid;
          optionsHTML += `<option value="${name}">${name}</option>`;
        });
      } else {
        // Fallback options
        optionsHTML = `
          <option value="Lavender Mist">Lavender Mist</option>
          <option value="Vanilla Wood">Vanilla Wood</option>
        `;
      }

      const dropdownHTML = `
        <div class="product-fragrance-select-wrapper" style="text-align: left; padding: 0 4px;">
          <span class="product-fragrance-label" style="font-size: 0.7rem; font-weight: 700; color: var(--color-muted-gray, #71717a); display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-body), sans-serif;">Select your fragrance</span>
          <select class="product-fragrance-select" data-product-id="${product.id}" aria-label="Select Fragrance">
            ${optionsHTML}
          </select>
        </div>
      `;

      // Redirect Add to Cart button to support fragrance selection
      let modifiedHTML = originalHTML.replace(
        `onclick="handleCardAddToCart(${product.id})"`,
        `onclick="handleCardAddToCartWithFragrance(${product.id}, this)"`
      );

      // Inject selector above the add-to-cart button
      const btnIndex = modifiedHTML.indexOf("<button class=\"btn btn-primary btn-block product-card-cta\"");
      if (btnIndex !== -1) {
        modifiedHTML = modifiedHTML.slice(0, btnIndex) + dropdownHTML + modifiedHTML.slice(btnIndex);
      }
      return modifiedHTML;
    };
  }

  // Handle storefront card cart addition
  window.handleCardAddToCartWithFragrance = function(productId, btnElement) {
    const card = btnElement ? btnElement.closest(".product-card") : document.querySelector(`.product-card[data-id="${productId}"]`);
    const select = card ? card.querySelector(".product-fragrance-select") : null;
    const fragrance = select ? select.value : "Lavender Mist";

    CartStorage.add(productId, 1, fragrance);
    const product = PRODUCTS.find(p => p.id === productId);
    showToast(`${product ? product.name : "Candle"} (${fragrance}) added to cart!`);
  };

  // Product Details Page Dropdown Injection
  function injectDetailsPageDropdown() {
    const purchaseControls = document.querySelector(".purchase-controls");
    if (!purchaseControls) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get("id")) || 1;
    const product = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];
    if (!product) return;

    // Check if dropdown already exists
    if (document.querySelector(".product-detail-fragrance-wrapper")) return;

    const assignedIds = product.fragrances ? Object.keys(product.fragrances) : [];
    let optionsHTML = "";
    if (assignedIds.length > 0) {
      assignedIds.forEach(fid => {
        const name = window.allFragrances[fid] ? window.allFragrances[fid].name : fid;
        optionsHTML += `<option value="${name}">${name}</option>`;
      });
    } else {
      optionsHTML = `
        <option value="Lavender Mist">Lavender Mist</option>
        <option value="Vanilla Wood">Vanilla Wood</option>
      `;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "product-fragrance-select-wrapper product-detail-fragrance-wrapper";
    wrapper.style.marginBottom = "16px";
    wrapper.innerHTML = `
      <label style="font-size: 0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; display:block; color:var(--color-charcoal);">Choose Fragrance</label>
      <select class="product-fragrance-select" id="detail-fragrance-select" style="border-radius:12px;">
        ${optionsHTML}
      </select>
    `;

    purchaseControls.parentNode.insertBefore(wrapper, purchaseControls);

    // Override the add to cart button listener on product details page
    const addToCartBtn = document.getElementById("detail-add-to-cart-btn");
    if (addToCartBtn) {
      const newBtn = addToCartBtn.cloneNode(true);
      addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);

      newBtn.addEventListener("click", () => {
        const qtyInput = document.querySelector(".qty-input");
        const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
        const fragSelect = document.getElementById("detail-fragrance-select");
        const fragrance = fragSelect ? fragSelect.value : "Lavender Mist";

        CartStorage.add(product.id, qty, fragrance);
        showToast(`${qty} x ${product.name} (${fragrance}) added to cart!`);
      });
    }
  }

  // Override CartStorage to handle fragrance variants
  if (typeof CartStorage !== "undefined") {
    CartStorage.add = function(id, qty = 1, fragrance = "Lavender Mist") {
      const user = typeof UserSession !== "undefined" ? UserSession.get() : null;
      if (!user) {
        if (typeof showToast === "function") {
          showToast("Please Login or Signup to add items to your cart.");
        }
        if (typeof window.triggerLoginModal === "function") {
          window.triggerLoginModal();
        }
        return;
      }

      const cart = this.get();
      const existingItem = cart.find(item => item.id === id && (item.fragrance || "Lavender Mist") === fragrance);
      if (existingItem) {
        existingItem.qty += qty;
      } else {
        cart.push({ id: id, qty: qty, fragrance: fragrance });
      }
      this.save(cart);
    };

    CartStorage.updateQty = function(id, fragrance, qty) {
      const cart = this.get();
      const existingItem = cart.find(item => item.id === id && (item.fragrance || "Lavender Mist") === fragrance);
      if (existingItem) {
        existingItem.qty = Math.max(1, qty);
      }
      this.save(cart);
    };

    CartStorage.remove = function(id, fragrance) {
      let cart = this.get();
      cart = cart.filter(item => !(item.id === id && (item.fragrance || "Lavender Mist") === fragrance));
      this.save(cart);
    };
  }

  // Override Cart page rendering
  window.initCartPage = function() {
    const itemsContainer = document.querySelector(".cart-items-list");
    const summaryBlock = document.querySelector(".cart-summary-block");
    
    function renderCart() {
      const cart = CartStorage.get();
      
      if (cart.length === 0) {
        if (itemsContainer) {
          itemsContainer.innerHTML = `
            <div class="cart-empty-message">
              <h3>Your cart is empty</h3>
              <p style="margin-bottom: 24px;">Browse our collection of luxury hand-poured candle lines.</p>
              <a href="shop.html" class="btn btn-primary">Browse Scents</a>
            </div>
          `;
        }
        if (summaryBlock) summaryBlock.style.display = "none";
        return;
      }
      
      if (summaryBlock) summaryBlock.style.display = "block";
      
      let html = `
        <div class="cart-header-row">
          <div>Product</div>
          <div>Price</div>
          <div>Quantity</div>
          <div style="text-align: right;">Total</div>
        </div>
      `;
      
      let subtotal = 0;
      
      cart.forEach(item => {
        const p = PRODUCTS.find(prod => prod.id === item.id);
        if (!p) return;
        
        const itemTotal = p.price * item.qty;
        subtotal += itemTotal;
        const fragrance = item.fragrance || "Lavender Mist";
        
        html += `
          <div class="cart-item-row" data-id="${p.id}" data-fragrance="${fragrance}">
            <div class="cart-item-info">
              <div class="cart-item-img">
                <img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
              </div>
              <div class="cart-item-details">
                <h4><a href="product.html?id=${p.id}">${p.name}</a></h4>
                <span class="product-category">${p.category}</span>
                <div><span class="cart-item-fragrance-label">Scent: ${fragrance}</span></div>
              </div>
            </div>
            <div class="cart-item-price-unit">₹${p.price}</div>
            <div class="qty-selector-cell">
              <div class="quantity-selector" style="height: 40px; max-width: 120px;">
                <button class="qty-btn" onclick="updateCartItemQtyWithFragrance(${p.id}, '${fragrance}', ${item.qty - 1})">-</button>
                <input type="text" class="qty-input" value="${item.qty}" readonly>
                <button class="qty-btn" onclick="updateCartItemQtyWithFragrance(${p.id}, '${fragrance}', ${item.qty + 1})">+</button>
              </div>
            </div>
            <div class="subtotal-cell" style="font-family: var(--font-heading); font-weight: 700; text-align: right;">₹${itemTotal}</div>
            <div class="remove-cell" style="text-align: right;">
              <button class="cart-item-remove" onclick="handleRemoveCartItemWithFragrance(${p.id}, '${fragrance}')">✕</button>
            </div>
          </div>
        `;
      });
      
      if (itemsContainer) itemsContainer.innerHTML = html;
      
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
    
    window.updateCartItemQtyWithFragrance = function(productId, fragrance, newQty) {
      CartStorage.updateQty(productId, fragrance, newQty);
      renderCart();
    };
    
    window.handleRemoveCartItemWithFragrance = function(productId, fragrance) {
      CartStorage.remove(productId, fragrance);
      renderCart();
      showToast("Removed from cart.");
    };
    
    renderCart();
  };

  // Override Checkout page rendering to capture variants
  window.initCheckoutPage = function() {
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
        const p = PRODUCTS.find(prod => prod.id === item.id);
        if (!p) return;
        const rowTotal = p.price * item.qty;
        subtotal += rowTotal;
        const fragrance = item.fragrance || "Lavender Mist";
        
        html += `
          <div class="checkout-item">
            <div class="checkout-item-left">
              <div class="checkout-item-thumb">
                <img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
              </div>
              <div>
                <span class="checkout-item-title">${p.name}</span>
                <span class="checkout-item-qty">x${item.qty}</span>
                <div style="font-size:0.75rem; color:var(--color-muted-gray); margin-top:2px;">Scent: ${fragrance}</div>
              </div>
            </div>
            <span class="checkout-item-price">₹${rowTotal}</span>
          </div>
        `;
      });
      checkoutList.innerHTML = html;
    }
    
    const shipping = subtotal >= 500 ? 0 : 50;
    const tax = subtotal * 0.18;
    const total = subtotal + shipping + tax;
    
    const subtotalEl = document.getElementById("checkout-subtotal");
    const shippingEl = document.getElementById("checkout-shipping");
    const taxEl = document.getElementById("checkout-tax");
    const totalEl = document.getElementById("checkout-total");
    
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
    
    const emailInput = document.getElementById("shipping-email");
    if (emailInput) {
      let activeEmail = "";
      if (typeof firebase !== "undefined" && isFirebaseInitialized && auth && auth.currentUser) {
        activeEmail = auth.currentUser.email;
      } else {
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

    const checkoutForm = document.getElementById("checkout-form");
    if (checkoutForm) {
      const newForm = checkoutForm.cloneNode(true);
      checkoutForm.parentNode.replaceChild(newForm, checkoutForm);
      
      newForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        let email = "";
        if (typeof firebase !== "undefined" && isFirebaseInitialized && auth && auth.currentUser) {
          email = auth.currentUser.email;
        } else {
          const sessionUser = UserSession.get();
          if (sessionUser && sessionUser.email) email = sessionUser.email;
        }
        if (!email && emailInput) email = emailInput.value.trim();
        
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
          items: cart.map(i => ({
            id: i.id,
            name: `${PRODUCTS.find(p => p.id === i.id).name} (${i.fragrance || "Lavender Mist"})`,
            qty: i.qty
          })),
          status: "Confirmed"
        };
        
        if (isFirebaseInitialized) {
          db.ref("orders/" + orderId).set(newOrderObj)
            .then(() => {
              CartStorage.clear();
              window.location.href = `order-tracking.html?orderId=${orderId}`;
            })
            .catch(err => {
              console.error("Firebase save order error", err);
              const localOrders = JSON.parse(localStorage.getItem("signature_spell_orders") || "[]");
              localOrders.push(newOrderObj);
              localStorage.setItem("signature_spell_orders", JSON.stringify(localOrders));
              CartStorage.clear();
              window.location.href = `order-tracking.html?orderId=${orderId}`;
            });
        } else {
          const localOrders = JSON.parse(localStorage.getItem("signature_spell_orders") || "[]");
          localOrders.push(newOrderObj);
          localStorage.setItem("signature_spell_orders", JSON.stringify(localOrders));
          CartStorage.clear();
          window.location.href = `order-tracking.html?orderId=${orderId}`;
        }
      });
    }
  };

  // Admin Panel: Injection of Fragrance Scent control panel
  function injectAdminFragranceCard() {
    const catalogCard = document.querySelector("#admin-product-table-body") ? document.querySelector("#admin-product-table-body").closest(".admin-card") : null;
    if (!catalogCard) return;

    let fragCard = document.getElementById("admin-fragrance-management-card");
    if (!fragCard) {
      fragCard = document.createElement("div");
      fragCard.id = "admin-fragrance-management-card";
      fragCard.className = "admin-card";
      catalogCard.parentNode.insertBefore(fragCard, catalogCard.nextSibling);
    }

    fragCard.innerHTML = `
      <div class="admin-card-header">
        <h2>Manage Fragrances</h2>
      </div>
      
      <!-- Add Scent Option -->
      <form id="admin-add-fragrance-form" style="margin-bottom: 24px; border-bottom:1px solid var(--color-light-gray); padding-bottom:20px;">
        <h5 style="margin-bottom:12px; font-weight:700; font-family: var(--font-body); font-size: 0.9rem; text-transform: uppercase;">Create Fragrance</h5>
        <div class="admin-filters grid-2" style="margin-bottom: 10px;">
          <input type="text" id="add-fragrance-name" required placeholder="E.g., Honey Blossom">
          <button type="submit" class="btn btn-accent" style="padding:10px; font-size:0.8rem; border-radius:4px; height:42px;">Create</button>
        </div>
      </form>

      <!-- Fragrance List -->
      <h5 style="margin-bottom:12px; font-weight:700; font-family: var(--font-body); font-size: 0.9rem; text-transform: uppercase;">Active Fragrances</h5>
      <div class="fragrance-list-group" id="admin-global-fragrance-list">
        <!-- Populated dynamically -->
      </div>
    `;

    // Bind Add Fragrance Form submit
    document.getElementById("admin-add-fragrance-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("add-fragrance-name");
      const name = input.value.trim();
      if (!name) return;

      const fid = "f_" + Date.now();
      if (typeof db !== "undefined" && isFirebaseInitialized) {
        db.ref("fragrances/" + fid).set({ id: fid, name: name })
          .then(() => {
            input.value = "";
            showToast("Fragrance created successfully.");
          });
      } else {
        window.allFragrances[fid] = { id: fid, name: name };
        renderAdminFragranceList();
        input.value = "";
        showToast("Local Fragrance created.");
      }
    });

    renderAdminFragranceList();
    bindAdminProductActions();
  }

  // Safe handler to bind product addition/deletion on admin console
  function bindAdminProductActions() {
    const addProductForm = document.getElementById("admin-add-product-form");
    if (addProductForm) {
      const newAddProductForm = addProductForm.cloneNode(true);
      addProductForm.parentNode.replaceChild(newAddProductForm, addProductForm);

      newAddProductForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const name = document.getElementById("add-prod-name").value.trim();
        const price = parseFloat(document.getElementById("add-prod-price").value) || 0;
        const category = document.getElementById("add-prod-category").value;
        const image = document.getElementById("add-prod-image").value.trim();
        const notesInput = document.getElementById("add-prod-notes").value;
        
        let notes = { top: "Bergamot", heart: "Rose", base: "Vanilla" };
        if (notesInput) {
          const arr = notesInput.split(",");
          notes.top = arr[0] ? arr[0].trim() : "Bergamot";
          notes.heart = arr[1] ? arr[1].trim() : "Rose";
          notes.base = arr[2] ? arr[2].trim() : "Vanilla";
        }
        
        const newId = PRODUCTS.length > 0 ? Math.max(...PRODUCTS.map(p => p.id)) + 1 : 1;
        const newProduct = {
          id: newId,
          name: name,
          price: price,
          image: image,
          category: category,
          notes: notes,
          burnTime: "20 Hours",
          waxType: "Soy Blend",
          description: "Handcrafted boutique candle released by our Master Pourers. Designed to build warm spaces."
        };
        
        ProductDb.add(newProduct);
        if (typeof syncCatalogTable === "function") syncCatalogTable();
        newAddProductForm.reset();
        showToast("Candle added locally! Click 'Push Product Catalog to Firebase' to save changes.");
      });
    }

    // Override product deletion (make it local first)
    window.handleAdminDeleteProduct = function(productId) {
      if (confirm("Are you sure you want to delete this product locally?")) {
        ProductDb.remove(productId);
        if (typeof syncCatalogTable === "function") syncCatalogTable();
        showToast("Product removed locally! Click 'Push Product Catalog to Firebase' to save changes.");
      }
    };

    // Inject "Push Product Catalog to Firebase" button
    const catalogCard = document.querySelector("#admin-product-table-body") ? document.querySelector("#admin-product-table-body").closest(".admin-card") : null;
    if (catalogCard) {
      let pushBtn = document.getElementById("admin-push-products-btn");
      if (!pushBtn) {
        pushBtn = document.createElement("button");
        pushBtn.id = "admin-push-products-btn";
        pushBtn.className = "btn btn-primary btn-block";
        pushBtn.style.cssText = "margin-top: 16px; padding: 10px; font-size: 0.85rem; font-weight: 700; background-color: var(--color-gold); color: var(--color-charcoal); border: none; border-radius: 4px; width: 100%; cursor: pointer;";
        pushBtn.textContent = "Push Product Catalog to Firebase";
        catalogCard.appendChild(pushBtn);
      }
      
      const newPushBtn = pushBtn.cloneNode(true);
      pushBtn.parentNode.replaceChild(newPushBtn, pushBtn);
      
      newPushBtn.addEventListener("click", () => {
        if (typeof db !== "undefined" && isFirebaseInitialized) {
          const productsObj = {};
          PRODUCTS.forEach(p => {
            if (p && p.id && p.name) {
              productsObj[p.id] = p;
            }
          });
          db.ref("products").set(productsObj)
            .then(() => {
              showToast("Product catalog successfully updated in Firebase DB!");
            })
            .catch(err => {
              showToast("Error pushing catalog: " + err.message);
            });
        } else {
          showToast("Firebase not initialized. Changes saved locally.");
        }
      });
    }
  }

  function renderAdminFragranceList() {
    const container = document.getElementById("admin-global-fragrance-list");
    if (!container) return;

    let html = "";
    Object.keys(window.allFragrances).forEach(fid => {
      const frag = window.allFragrances[fid];
      html += `
        <div class="fragrance-list-item">
          <span><strong>${frag.name}</strong></span>
          <button class="btn btn-secondary btn-small" style="background-color:#ffebe9; color:#cf222e; border-color:#ffebe9; padding:4px 8px; cursor:pointer;" onclick="handleDeleteGlobalFragrance('${fid}')">Delete</button>
        </div>
      `;
    });

    if (!html) {
      html = "<p style='color:var(--color-muted-gray); font-size:0.9rem; text-align:center;'>No fragrances created yet.</p>";
    }
    container.innerHTML = html;
  }

  window.handleDeleteGlobalFragrance = function(fid) {
    if (!confirm("Are you sure you want to delete this fragrance? This will remove it from all products.")) return;
    
    if (typeof db !== "undefined" && isFirebaseInitialized) {
      db.ref("fragrances/" + fid).remove()
        .then(() => {
          PRODUCTS.forEach(p => {
            if (p.fragrances && p.fragrances[fid]) {
              db.ref("products/" + p.id + "/fragrances/" + fid).remove();
            }
          });
          showToast("Fragrance removed from database.");
        });
    } else {
      delete window.allFragrances[fid];
      PRODUCTS.forEach(p => {
        if (p.fragrances) delete p.fragrances[fid];
      });
      renderAdminFragranceList();
      showToast("Local Fragrance deleted.");
    }
  };
})();
