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
      if (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
        // If firebase is active, only run once fragrances are loaded from the database
        document.addEventListener("fragrancesUpdated", () => {
          const existing = document.querySelector(".product-detail-fragrance-wrapper");
          if (existing) existing.remove();
          injectDetailsPageDropdown();
        });
      } else {
        // Fallback for local database
        injectDetailsPageDropdown();
      }
    }

    // No grid fragrance dropdown observers needed
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
        if (window.location.pathname.includes("admin.html") || window.location.pathname.includes("store-manager.html")) {
          renderAdminFragranceList();
          if (typeof updateFragranceCheckboxes === "function") {
            updateFragranceCheckboxes();
          }
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

  // Hook into admin/store manager console initialization
  const checkAdminInterval = setInterval(() => {
    const isDashboard = typeof window.initializeDashboard === "function" || typeof initializeDashboard === "function";
    const isStoreManager = typeof window.initializeStoreManager === "function" || typeof initializeStoreManager === "function";
    
    if (isDashboard || isStoreManager) {
      clearInterval(checkAdminInterval);
      
      if (isDashboard) {
        const originalInitDash = window.initializeDashboard || initializeDashboard;
        const newInitDash = function() {
          originalInitDash();
          injectAdminFragranceCard();
          if (typeof populateAssignProductDropdown === "function") {
            populateAssignProductDropdown();
          }
        };
        window.initializeDashboard = newInitDash;
      }
      
      if (isStoreManager) {
        const originalInitSM = window.initializeStoreManager || initializeStoreManager;
        const newInitSM = function() {
          originalInitSM();
          injectAdminFragranceCard();
          if (typeof populateAssignProductDropdown === "function") {
            populateAssignProductDropdown();
          }
        };
        window.initializeStoreManager = newInitSM;
      }
    }
  }, 100);

  // Storefront overrides: card rendering is left unchanged (no dropdown in card)

  // Product Details Page Dropdown Injection
  function injectDetailsPageDropdown() {
    const purchaseControls = document.querySelector(".purchase-controls");
    if (!purchaseControls) return;

    const urlParams = new URLSearchParams(window.location.search);
    let productId = parseInt(urlParams.get("id"));
    if (!productId) {
      productId = parseInt(sessionStorage.getItem("selected_product_id")) || 1;
    }
    const product = PRODUCTS.find(p => p.id == productId) || PRODUCTS[0];
    if (!product) return;

    // Check if dropdown already exists
    if (document.querySelector(".product-detail-fragrance-wrapper")) return;

    const fragrancesList = Object.values(window.allFragrances);
    let optionsHTML = "";
    if (fragrancesList.length > 0) {
      fragrancesList.forEach(frag => {
        optionsHTML += `<option value="${frag.name}">${frag.name}</option>`;
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

    // Upgrade to custom styled dropdown
    const nativeSelect = wrapper.querySelector("select");
    if (nativeSelect && typeof window.initCustomSelect === "function") {
      window.initCustomSelect(nativeSelect, { size: "normal", placeholder: "Choose your fragrance..." });
    }

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
      const cart = this.get();
      const existingItem = cart.find(item => item.id == id && (item.fragrance || "Lavender Mist") === fragrance);
      if (existingItem) {
        existingItem.qty += qty;
      } else {
        cart.push({ id: id, qty: qty, fragrance: fragrance });
      }
      this.save(cart);
    };

    CartStorage.updateQty = function(id, fragrance, qty) {
      let actualFragrance = fragrance;
      let actualQty = qty;
      let hasFragrance = true;

      // If second arg is a number or undefined and third is undefined, it's (id, qty)
      if ((typeof fragrance === "number" || typeof fragrance === "undefined") && typeof qty === "undefined") {
        actualQty = fragrance;
        actualFragrance = undefined;
        hasFragrance = false;
      }

      console.log("[fragrance.js override: CartStorage.updateQty] Called with:", { id, fragrance, qty, actualFragrance, actualQty, hasFragrance });

      let cart = this.get();
      console.log("[fragrance.js override: CartStorage.updateQty] Current cart before update:", JSON.stringify(cart));

      const existingItem = cart.find(item => {
        if (hasFragrance) {
          return item.id == id && (item.fragrance || "Lavender Mist") === actualFragrance;
        } else {
          return item.id == id;
        }
      });

      console.log("[fragrance.js override: CartStorage.updateQty] Found matching item:", existingItem);

      if (existingItem) {
        existingItem.qty = Math.max(1, actualQty);
        console.log("[fragrance.js override: CartStorage.updateQty] Updated item qty to:", existingItem.qty);
      }
      
      this.save(cart);
      console.log("[fragrance.js override: CartStorage.updateQty] Cart saved:", JSON.stringify(this.get()));
    };

    CartStorage.remove = function(id, fragrance) {
      let cart = this.get();
      if (typeof fragrance === "undefined") {
        cart = cart.filter(item => item.id != id);
      } else {
        cart = cart.filter(item => !(item.id == id && (item.fragrance || "Lavender Mist") === fragrance));
      }
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
                <button class="qty-btn" onclick="updateCartItemQtyWithFragrance('${p.id}', '${fragrance}', ${item.qty - 1})">-</button>
                <input type="text" class="qty-input" value="${item.qty}" readonly>
                <button class="qty-btn" onclick="updateCartItemQtyWithFragrance('${p.id}', '${fragrance}', ${item.qty + 1})">+</button>
              </div>
            </div>
            <div class="subtotal-cell" style="font-family: var(--font-heading); font-weight: 700; text-align: right;">₹${itemTotal}</div>
            <div class="remove-cell" style="text-align: right;">
              <button class="cart-item-remove" onclick="handleRemoveCartItemWithFragrance('${p.id}', '${fragrance}')">✕</button>
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
        const p = PRODUCTS.find(prod => prod.id == item.id);
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
            name: `${PRODUCTS.find(p => p.id == i.id).name} (${i.fragrance || "Lavender Mist"})`,
            qty: i.qty
          })),
          status: "Confirmed"
        };
        
        if (isFirebaseInitialized) {
          db.ref("orders/" + orderId).set(newOrderObj)
            .then(() => {
              CartStorage.clear();
              sessionStorage.setItem("selected_order_id", orderId);
              window.location.href = "order-tracking.html";
            })
            .catch(err => {
              console.error("Firebase save order error", err);
              const localOrders = JSON.parse(localStorage.getItem("signature_spell_orders") || "[]");
              localOrders.push(newOrderObj);
              localStorage.setItem("signature_spell_orders", JSON.stringify(localOrders));
              CartStorage.clear();
              sessionStorage.setItem("selected_order_id", orderId);
              window.location.href = "order-tracking.html";
            });
        } else {
          const localOrders = JSON.parse(localStorage.getItem("signature_spell_orders") || "[]");
          localOrders.push(newOrderObj);
          localStorage.setItem("signature_spell_orders", JSON.stringify(localOrders));
          CartStorage.clear();
          sessionStorage.setItem("selected_order_id", orderId);
          window.location.href = "order-tracking.html";
        }
      });
    }
  };

  // Admin Panel: Injection of Fragrance Scent control panel
  function injectAdminFragranceCard() {
    let fragCard = document.getElementById("admin-fragrance-management-card");
    if (!fragCard) {
      const catalogCard = document.querySelector("#admin-product-table-body") ? document.querySelector("#admin-product-table-body").closest(".admin-card") : null;
      if (!catalogCard) return;
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
    if (addProductForm && !addProductForm._ssListenerBound) {
      addProductForm._ssListenerBound = true;

      addProductForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const editIdVal = document.getElementById("edit-prod-id").value;
        const isEditing = !!editIdVal;
        const editId = isEditing ? parseInt(editIdVal) : null;

        const name = document.getElementById("add-prod-name").value.trim();
        const price = parseFloat(document.getElementById("add-prod-price").value) || 0;
        const category = document.getElementById("add-prod-category").value;
        const image = document.getElementById("add-prod-image").value.trim();
        const notesInput = document.getElementById("add-prod-notes").value;
        const description = document.getElementById("add-prod-desc").value.trim();
        
        let notes = { top: "Bergamot", heart: "Rose", base: "Vanilla" };
        if (notesInput) {
          const arr = notesInput.split(",");
          notes.top = arr[0] ? arr[0].trim() : "Bergamot";
          notes.heart = arr[1] ? arr[1].trim() : "Rose";
          notes.base = arr[2] ? arr[2].trim() : "Vanilla";
        }
        
        const existingProduct = isEditing ? PRODUCTS.find(p => p.id == editId) : null;
        const productDesc = description || (existingProduct ? existingProduct.description : "Handcrafted boutique candle released by our Master Pourers. Designed to build warm spaces.");
        const burnTime = existingProduct ? existingProduct.burnTime : "20 Hours";
        const waxType = existingProduct ? existingProduct.waxType : "Soy Blend";
        const fragrances = existingProduct ? existingProduct.fragrances : { f1: true, f2: true };

        const productData = {
          id: isEditing ? editId : (PRODUCTS.length > 0 ? Math.max(...PRODUCTS.map(p => p.id)) + 1 : 1),
          name: name,
          price: price,
          image: image,
          category: category,
          notes: notes,
          burnTime: burnTime,
          waxType: waxType,
          description: productDesc,
          fragrances: fragrances
        };
        
        if (typeof db !== "undefined" && isFirebaseInitialized) {
          db.ref("products/" + productData.id).set(productData)
            .then(() => {
              if (typeof closeAllAdminModals === "function") closeAllAdminModals();
              showToast(isEditing ? "Candle updated and synced to Firebase!" : "Candle added and synced to Firebase!");
            })
            .catch(err => {
              showToast("Firebase sync failed: " + err.message);
            });
        } else {
          if (isEditing) {
            let list = ProductDb.get();
            list = list.map(p => p.id == editId ? productData : p);
            ProductDb.save(list);
          } else {
            ProductDb.add(productData);
          }
          if (typeof syncCatalogTable === "function") syncCatalogTable();
          if (typeof closeAllAdminModals === "function") closeAllAdminModals();
          showToast(isEditing ? "Candle updated locally." : "Candle added locally.");
        }
      });
    }

    // Override product deletion (instant sync with Firebase if active)
    window.handleAdminDeleteProduct = function(productId) {
      showConfirm("Are you sure you want to permanently delete this product?", {
        title: 'Delete Product',
        icon: '🗑️',
        confirmText: 'Yes, Delete',
        cancelText: 'Cancel',
        dangerous: true
      }).then(function(confirmed) {
        if (!confirmed) return;
        if (typeof db !== "undefined" && isFirebaseInitialized) {
          db.ref("products/" + productId).remove()
            .then(() => {
              showToast("Product deleted and synced to Firebase!");
            })
            .catch(err => showToast("Firebase delete failed: " + err.message));
        } else {
          ProductDb.remove(Number(productId));
          if (typeof syncCatalogTable === "function") syncCatalogTable();
          showToast("Product removed locally.");
        }
      });
    };
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
    showConfirm("Are you sure you want to delete this fragrance? This will remove it from all products.", {
      title: 'Delete Fragrance',
      icon: '🌸',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      dangerous: true
    }).then(function(confirmed) {
      if (!confirmed) return;
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
    });
  };
})();
