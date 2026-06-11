/* ==========================================================================
   SIGNATURE SPELL - CORE JAVASCRIPT LOGIC
   ========================================================================== */

"use strict";


// Firebase Configuration Block
// Paste your Firebase web app keys below to connect Auth and Realtime Database:
const firebaseConfig = {
  apiKey: "AIzaSyBnNw7nenPtv764fYXJijARPhgF7ZDkRVM",
  authDomain: "signature-spell.firebaseapp.com",
  databaseURL: "https://signature-spell-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "signature-spell",
  storageBucket: "signature-spell.firebasestorage.app",
  messagingSenderId: "91192206411",
  appId: "1:91192206411:web:74fb7da2b41d0790b399ce"
};

let db, auth, googleProvider;
let isFirebaseInitialized = false;

// Default products priced in Indian Rupees (₹)
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Regular T-Light Candle",
    price: 60,
    image: "assets/regular_tlight.png",
    category: "Tea Lights",
    notes: { top: "Warm Honey", heart: "Sweet Almond", base: "Creamy Vanilla" },
    burnTime: "4 Hours",
    waxType: "100% Organic Soy Wax",
    description: "Our signature regular tea lights fill any small room with a subtle, warm sweetness. Hand-poured with love into gold brass cups, they are the perfect companions for cozy evenings and self-care rituals."
  },
  {
    id: 2,
    name: "Star T-Light Candle",
    price: 70,
    image: "assets/star_tlight.png",
    category: "Tea Lights",
    notes: { top: "Cinnamon Bark", heart: "Spiced Clove", base: "Warm Sandalwood" },
    burnTime: "4 Hours",
    waxType: "100% Organic Soy Wax",
    description: "Cast a starry glow over your living space. Shaped like a classic star, this tea light features a spiced fragrance profile designed to energize the room and inspire high-minded creative thoughts."
  },
  {
    id: 3,
    name: "Flower T-Light Candle",
    price: 70,
    image: "assets/flower_tlight.png",
    category: "Tea Lights",
    notes: { top: "Fresh Rosewood", heart: "Dried Lavender", base: "White Patchouli" },
    burnTime: "4 Hours",
    waxType: "100% Organic Soy Wax",
    description: "Infused with genuine dried petals, the Flower T-Light Candle offers a delicate, soothing floral aroma. Excellent for evening baths, meditation sessions, or unwinding after a long work day."
  },
  {
    id: 4,
    name: "Heart T-Light Candle",
    price: 70,
    image: "assets/heart_tlight.png",
    category: "Tea Lights",
    notes: { top: "Sweet Raspberry", heart: "Jasmine Blossom", base: "Sensual Musk" },
    burnTime: "4 Hours",
    waxType: "100% Organic Soy Wax",
    description: "Set a romantic mood with these heart-shaped candle gems. Their aroma profile is a sweet and musky floral blend, bringing warmth, intimacy, and a pleasant aromatic depth to any table setting."
  },
  {
    id: 5,
    name: "Small Glass Candle",
    price: 80,
    image: "assets/small_glass.png",
    category: "Jars",
    notes: { top: "Rich Amber", heart: "Warm Oak", base: "Golden Patchouli" },
    burnTime: "25 Hours",
    waxType: "Natural Soy Blend",
    description: "Sleek and minimalist, the Small Glass Candle sits beautifully on any office desk or side table. The amber jar generates a beautiful ambient glow when lit, releasing a woodsy, grounding aroma."
  },
  {
    id: 6,
    name: "Medium Pet Bottle Candle",
    price: 150,
    image: "assets/medium_pet.png",
    category: "Jars",
    notes: { top: "Fresh Fig Leaf", heart: "Sandalwood", base: "Cedarwood & Musk" },
    burnTime: "45 Hours",
    waxType: "Natural Soy Blend",
    description: "An apothecary-style glass container inspired by vintage laboratory jars. Fitted with a crackling wooden wick and a gold screw lid, it radiates a rich sandalwood aroma that acts as a soothing room anchor."
  },
  {
    id: 7,
    name: "Coconut Shell Candle",
    price: 100,
    image: "assets/coconut_shell.png",
    category: "Shells",
    notes: { top: "Coconut Water", heart: "Vanilla Cream", base: "Warm Tonka Bean" },
    burnTime: "40 Hours",
    waxType: "Coconut Soy Blend",
    description: "Housed in a real, polished coconut shell, this sustainable candle features a crackling wooden wick. The warm vanilla and coconut fragrance carries you away to a tropical beach, bringing ultimate relaxation."
  },
  {
    id: 8,
    name: "Golden T-Light Candle",
    price: 70,
    image: "assets/golden_tlight.png",
    category: "Tea Lights",
    notes: { top: "Zesty Bergamot", heart: "Warm Amber", base: "Royal Oudh" },
    burnTime: "6 Hours",
    waxType: "Gilded Soy Wax",
    description: "Gilded in a rich metallic gold coating, these luxurious tea lights provide an elevated burn time and a regal, spicy aroma of rich amber and dark oudh. Perfect for special events and holidays."
  }
];

// Product Loading Utilities (fallback localStorage)
const ProductDb = {
  get: function() {
    let stored = localStorage.getItem("signature_spell_products");
    if (!stored) {
      localStorage.setItem("signature_spell_products", JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(stored);
  },
  save: function(list) {
    localStorage.setItem("signature_spell_products", JSON.stringify(list));
    document.dispatchEvent(new CustomEvent("productsUpdated"));
  },
  add: function(product) {
    const list = this.get();
    list.push(product);
    this.save(list);
  },
  remove: function(id) {
    let list = this.get();
    list = list.filter(p => p.id !== id);
    this.save(list);
  }
};

// Global Products Array Reference
let PRODUCTS = ProductDb.get();

// Helper: Cart Storage Utilities (localStorage)
const CartStorage = {
  get: function() {
    try {
      const cartStr = localStorage.getItem("signature_spell_cart");
      return cartStr ? JSON.parse(cartStr) : [];
    } catch (e) {
      console.error("Error reading cart", e);
      return [];
    }
  },
  save: function(cart) {
    try {
      localStorage.setItem("signature_spell_cart", JSON.stringify(cart));
      document.dispatchEvent(new CustomEvent("cartUpdated"));
    } catch (e) {
      console.error("Error saving cart", e);
    }
  },
  add: function(id, qty = 1) {
    const cart = this.get();
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
      existingItem.qty += qty;
    } else {
      cart.push({ id: id, qty: qty });
    }
    this.save(cart);
  },
  updateQty: function(id, qty) {
    let cart = this.get();
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
      existingItem.qty = Math.max(1, qty);
    }
    this.save(cart);
  },
  remove: function(id) {
    let cart = this.get();
    cart = cart.filter(item => item.id !== id);
    this.save(cart);
  },
  clear: function() {
    this.save([]);
  },
  count: function() {
    return this.get().reduce((sum, item) => sum + item.qty, 0);
  }
};

// Helper: Wishlist Storage Utilities
const WishlistStorage = {
  get: function() {
    try {
      const wishStr = localStorage.getItem("signature_spell_wishlist");
      return wishStr ? JSON.parse(wishStr) : [];
    } catch (e) {
      console.error("Error reading wishlist", e);
      return [];
    }
  },
  save: function(list) {
    try {
      localStorage.setItem("signature_spell_wishlist", JSON.stringify(list));
      document.dispatchEvent(new CustomEvent("wishlistUpdated"));
    } catch (e) {
      console.error("Error saving wishlist", e);
    }
  },
  toggle: function(id) {
    let list = this.get();
    const index = list.indexOf(id);
    if (index > -1) {
      list.splice(index, 1);
      this.save(list);
      return false; // Removed
    } else {
      list.push(id);
      this.save(list);
      return true; // Added
    }
  },
  has: function(id) {
    return this.get().includes(id);
  },
  count: function() {
    return this.get().length;
  }
};

// Helper: Orders Storage Utilities (local fallback order database)
const OrderDb = {
  get: function() {
    const stored = localStorage.getItem("signature_spell_orders");
    return stored ? JSON.parse(stored) : [];
  },
  save: function(list) {
    localStorage.setItem("signature_spell_orders", JSON.stringify(list));
  },
  add: function(order) {
    const list = this.get();
    list.push(order);
    this.save(list);
  },
  updateStatus: function(orderId, status) {
    const list = this.get();
    const order = list.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      this.save(list);
      document.dispatchEvent(new CustomEvent("ordersUpdated"));
    }
  }
};

// Active User Session Management
const UserSession = {
  get: function() {
    const user = sessionStorage.getItem("signature_spell_user");
    return user ? JSON.parse(user) : null;
  },
  set: function(user) {
    sessionStorage.setItem("signature_spell_user", JSON.stringify(user));
    document.dispatchEvent(new CustomEvent("authUpdated"));
  },
  clear: function() {
    sessionStorage.removeItem("signature_spell_user");
    document.dispatchEvent(new CustomEvent("authUpdated"));
  }
};

// Global DOM Content Loaded Init
document.addEventListener("DOMContentLoaded", () => {
  // Sync products in case admin updated list
  PRODUCTS = ProductDb.get();
  
  // Try loading Firebase SDK from page script imports
  tryInitFirebase();

  // Core visual overlays
  initNavigation();
  initAuthModal();
  initSearch();
  
  // Initial count bag renderings
  updateCartBadge();
  updateWishlistBadge();
  updateUserSessionUI();
  
  // Custom global event listeners
  document.addEventListener("cartUpdated", updateCartBadge);
  document.addEventListener("wishlistUpdated", updateWishlistBadge);
  document.addEventListener("authUpdated", () => {
    updateUserSessionUI();
    // Refresh page details if checkout or admin needs active states
    const pageName = getPageName();
    if (pageName === "admin.html") renderAdminDashboard();
  });
  
  document.addEventListener("productsUpdated", () => {
    PRODUCTS = ProductDb.get();
    const pageName = getPageName();
    if (pageName === "shop.html") initShopPage();
    if (pageName === "index.html") initHomepage();
  });

  // Page-specific controllers
  const pageName = getPageName();
  if (pageName === "index.html" || pageName === "") {
    initHomepage();
  } else if (pageName === "shop.html") {
    initShopPage();
  } else if (pageName === "product.html") {
    initProductPage();
  } else if (pageName === "cart.html") {
    initCartPage();
  } else if (pageName === "checkout.html") {
    initCheckoutPage();
  } else if (pageName === "order-tracking.html") {
    initOrderTrackingPage();
  } else if (pageName === "contact.html") {
    initContactPage();
  } else if (pageName === "admin.html") {
    initAdminPage();
  }
});

// Helper to scrape current clean filename from browser path
function getPageName() {
  const pagePath = window.location.pathname;
  return pagePath.substring(pagePath.lastIndexOf("/") + 1);
}

// Dynamic Firebase Loader
function tryInitFirebase() {
  if (typeof firebase !== "undefined" && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
      firebase.initializeApp(firebaseConfig);
      db = firebase.database(); // Initializing Realtime Database
      auth = firebase.auth();
      googleProvider = new firebase.auth.GoogleAuthProvider();
      isFirebaseInitialized = true;
      console.log("Firebase Realtime Database connection established successfully.");
      
      // Auto listen to Auth changes
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          let isAdmin = user.email === "admin@signaturespell.com" || user.email === "nandheswara21@gmail.com" || user.email.startsWith("admin");
          UserSession.set({
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
            photo: user.photoURL,
            uid: user.uid,
            isAdmin: isAdmin
          });
          
          try {
            const roleSnap = await db.ref("users/" + user.uid + "/role").once("value");
            if (roleSnap.exists()) {
              const role = roleSnap.val();
              UserSession.set({
                name: user.displayName || user.email.split("@")[0],
                email: user.email,
                photo: user.photoURL,
                uid: user.uid,
                isAdmin: role === "admin" || isAdmin
              });
            }
          } catch(e) {}
        } else {
          UserSession.clear();
        }
      });

      // Synchronize Products dynamically from Realtime DB
      db.ref("products").on("value", (snapshot) => {
        const val = snapshot.val();
        if (val) {
          // Convert object list to array
          const arr = Object.values(val);
          ProductDb.save(arr);
        }
      });

      // Synchronize Orders dynamically from Realtime DB to LocalStorage
      db.ref("orders").on("value", (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const arr = Object.values(val);
          localStorage.setItem("signature_spell_orders", JSON.stringify(arr));
          document.dispatchEvent(new CustomEvent("ordersUpdated"));
        }
      });
      
    } catch (e) {
      console.error("Firebase startup error. Local fallbacks will be used.", e);
    }
  }
}

// 1. Navigation Menu & Hamburger
function initNavigation() {
  const hamburger = document.querySelector(".hamburger");
  const mobileNav = document.querySelector(".mobile-nav");
  const overlay = document.querySelector(".mobile-nav-overlay");
  const closeBtn = document.querySelector(".mobile-nav-close");
  
  if (hamburger && mobileNav && overlay) {
    const toggleMenu = () => {
      mobileNav.classList.toggle("active");
      overlay.classList.toggle("active");
    };
    
    hamburger.addEventListener("click", toggleMenu);
    overlay.addEventListener("click", toggleMenu);
    if (closeBtn) closeBtn.addEventListener("click", toggleMenu);

    // Dynamically insert mobile search bar inside hamburger menu drawer
    if (!document.getElementById("mobile-search-form")) {
      const mobileSearchContainer = document.createElement("div");
      mobileSearchContainer.style.padding = "0 0 20px 0";
      mobileSearchContainer.innerHTML = `
        <form class="mobile-search-form" id="mobile-search-form">
          <div style="position: relative; display: flex; align-items: center; background-color: var(--color-cream-dark); border: var(--border-neutral-light); border-radius: 4px; width: 100%;">
            <input type="text" id="mobile-search-input" placeholder="Search scents..." required style="width: 100%; padding: 10px 40px 10px 12px; border: none; background: transparent; font-family: var(--font-body); font-size: 0.9rem; outline: none; color: var(--color-charcoal);">
            <button type="submit" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: var(--color-charcoal);">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </form>
      `;
      const navLinks = mobileNav.querySelector(".mobile-nav-links");
      if (navLinks) {
        mobileNav.insertBefore(mobileSearchContainer, navLinks);
      } else {
        mobileNav.appendChild(mobileSearchContainer);
      }

      const mobileSearchForm = document.getElementById("mobile-search-form");
      const mobileSearchInput = document.getElementById("mobile-search-input");
      if (mobileSearchForm && mobileSearchInput) {
        mobileSearchForm.addEventListener("submit", (e) => {
          e.preventDefault();
          const query = mobileSearchInput.value.trim();
          if (query) {
            window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
          }
        });
      }
    }
  }
}

function updateCartBadge() {
  const badge = document.getElementById("cart-badge-count");
  if (badge) {
    const count = CartStorage.count();
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  }
  updateFloatingCartBar();
}

function updateFloatingCartBar() {
  const page = getPageName();
  if (page === "cart.html" || page === "checkout.html") {
    const bar = document.getElementById("floating-cart-bar");
    if (bar) bar.style.display = "none";
    return;
  }

  let bar = document.getElementById("floating-cart-bar");
  const cart = CartStorage.get();
  const count = CartStorage.count();

  if (count === 0) {
    if (bar) bar.style.display = "none";
    return;
  }

  let subtotal = 0;
  cart.forEach(item => {
    const p = PRODUCTS.find(prod => prod.id === item.id);
    if (p) subtotal += p.price * item.qty;
  });

  if (!bar) {
    bar = document.createElement("div");
    bar.id = "floating-cart-bar";
    document.body.appendChild(bar);
  }

  bar.style.display = "flex";
  bar.innerHTML = `
    <div class="floating-cart-info">
      <span class="floating-cart-count">${count} ${count === 1 ? 'item' : 'items'}</span>
      <span class="floating-cart-divider">|</span>
      <span class="floating-cart-total">₹${subtotal}</span>
    </div>
    <a href="cart.html" class="floating-cart-btn">Checkout &rarr;</a>
  `;
}

function updateWishlistBadge() {
  const badge = document.getElementById("wishlist-badge-count");
  if (badge) {
    const count = WishlistStorage.count();
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  }
}

// 2. Auth Login Modal controller
function initAuthModal() {
  const userBtn = document.getElementById("user-btn");
  const overlay = document.getElementById("auth-modal-overlay");
  const closeBtn = document.getElementById("auth-modal-close");

  const getAlertContainer = () => {
    let alertContainer = document.getElementById("auth-alert-container");
    if (!alertContainer && overlay) {
      const modal = overlay.querySelector(".auth-modal");
      if (modal) {
        alertContainer = document.createElement("div");
        alertContainer.id = "auth-alert-container";
        const form = document.getElementById("auth-email-form");
        if (form) {
          modal.insertBefore(alertContainer, form);
        } else {
          modal.appendChild(alertContainer);
        }
      }
    }
    return alertContainer;
  };

  const showAuthError = (message) => {
    let friendlyMessage = message;
    if (message && (
      message.includes("invalid-credential") || 
      message.includes("wrong-password") || 
      message.includes("user-not-found") ||
      message.includes("invalid-email")
    )) {
      friendlyMessage = "Given username / password wrong try once again";
    }
    const container = getAlertContainer();
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" style="margin-top: 10px; margin-bottom: 15px;">
          ${friendlyMessage}
        </div>
      `;
    }
  };

  const clearAuthError = () => {
    const container = document.getElementById("auth-alert-container");
    if (container) {
      container.innerHTML = "";
    }
  };
  
  if (userBtn && overlay) {
    userBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const user = UserSession.get();
      if (user) {
        // Route admins to admin dashboard, standard users to profile settings
        if (getPageName() !== "profile.html") {
          window.location.href = "profile.html";
        } else {
          if (confirm(`Logged in as ${user.name}. Would you like to log out?`)) {
            if (isFirebaseInitialized) {
              auth.signOut();
            } else {
              UserSession.clear();
            }
            showToast("Logged out successfully.");
          }
        }
      } else {
        window.triggerLoginModal();
      }
    });
  }
  
  if (closeBtn && overlay) {
    closeBtn.addEventListener("click", () => {
      overlay.classList.remove("active");
      clearAuthError();
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        clearAuthError();
      }
    });
  }

  window.triggerLoginModal = () => {
    clearAuthError();
    if (overlay) overlay.classList.add("active");
  };
  
  // Tab/Forms toggle inside modal
  const tabToggle = document.getElementById("auth-switch-link");
  const formTitle = document.getElementById("auth-form-title");
  const submitBtn = document.getElementById("auth-submit-btn");
  const switchDesc = document.getElementById("auth-switch-desc");
  
  let isLoginState = true;
  
  if (tabToggle && formTitle && submitBtn) {
    tabToggle.addEventListener("click", (e) => {
      e.preventDefault();
      clearAuthError();
      isLoginState = !isLoginState;
      if (isLoginState) {
        formTitle.textContent = "Welcome Back";
        submitBtn.textContent = "Sign In";
        switchDesc.innerHTML = `Don't have an account? <a href="#" id="auth-switch-link">Sign Up</a>`;
      } else {
        formTitle.textContent = "Create Account";
        submitBtn.textContent = "Sign Up";
        switchDesc.innerHTML = `Already have an account? <a href="#" id="auth-switch-link">Sign In</a>`;
      }
      // Re-bind click event to the newly generated link
      initAuthModalToggleLink();
    });
  }
  
  function initAuthModalToggleLink() {
    const newLink = document.getElementById("auth-switch-link");
    if (newLink) {
      newLink.addEventListener("click", (e) => {
        e.preventDefault();
        tabToggle.click();
      });
    }
  }

  // Handle Auth submission
  const authForm = document.getElementById("auth-email-form");
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      clearAuthError();
      const email = document.getElementById("auth-email-input").value.trim();
      const pass = document.getElementById("auth-pass-input").value;
      
      if (isFirebaseInitialized) {
        if (isLoginState) {
          auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
              overlay.classList.remove("active");
              showToast("Welcome back!");
            })
            .catch(err => showAuthError(err.message));
        } else {
          auth.createUserWithEmailAndPassword(email, pass)
            .then(() => {
              overlay.classList.remove("active");
              showToast("Account created!");
            })
            .catch(err => showAuthError(err.message));
        }
      } else {
        showAuthError("Firebase is not initialized. Please connect your credentials.");
      }
      authForm.reset();
    });
  }

  // Google SSO Handler
  const googleBtn = document.getElementById("google-sso-btn");
  if (googleBtn) {
    googleBtn.addEventListener("click", () => {
      clearAuthError();
      if (isFirebaseInitialized) {
        auth.signInWithPopup(googleProvider)
          .then(() => {
            overlay.classList.remove("active");
            showToast("Welcome!");
          })
          .catch(err => showAuthError(err.message));
      } else {
        showAuthError("Firebase is not initialized. Please connect your credentials.");
      }
    });
  }
}

// Update User Nav Icon states
function updateUserSessionUI() {
  const userBtn = document.getElementById("user-btn");
  if (!userBtn) return;
  const user = UserSession.get();
  
  if (user) {
    userBtn.style.color = "var(--color-gold)";
    // If admin, append visual tag
    if (user.isAdmin) {
      userBtn.setAttribute("title", "Admin Portal (Click to go)");
    } else {
      userBtn.setAttribute("title", `Logged in as ${user.name}`);
    }
  } else {
    userBtn.style.color = "var(--color-charcoal)";
    userBtn.setAttribute("title", "Account Login");
  }
}

// 3. Global Header Search System
function initSearch() {
  const searchForm = document.getElementById("header-search-form");
  const searchInput = document.getElementById("header-search-input");
  const nav = document.querySelector("header.header nav");
  const navIcons = document.querySelector(".nav-icons");
  
  if (searchForm && nav && navIcons) {
    // Move the search bar after the nav links and before the nav icons on desktop view
    nav.parentNode.insertBefore(searchForm, navIcons);
  }
  
  if (searchForm && searchInput) {
    searchInput.placeholder = "Search scents...";
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
      }
    });
  }
}

// Render product card item in grids (Rupees ₹ currency)
function createProductCardHTML(product) {
  const isWished = WishlistStorage.has(product.id);
  return `
    <article class="product-card" data-id="${product.id}">
      <button class="wishlist-heart-btn ${isWished ? 'active' : ''}" onclick="handleCardWishlistToggle(${product.id}, this)" aria-label="Add to wishlist">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </button>
      <a href="product.html?id=${product.id}">
        <div class="product-img-wrap">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          ${product.id === 8 ? '<span class="product-label">Luxe</span>' : ''}
          ${product.id === 1 ? '<span class="product-label">Popular</span>' : ''}
        </div>
      </a>
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h4 class="product-name"><a href="product.html?id=${product.id}">${product.name}</a></h4>
        <div class="product-price">₹${product.price}</div>
        <button class="btn btn-primary btn-block product-card-cta" onclick="handleCardAddToCart(${product.id})">Add to Cart</button>
      </div>
    </article>
  `;
}

// Global Wishlist actions
window.handleCardWishlistToggle = function(productId, element) {
  const added = WishlistStorage.toggle(productId);
  if (element) {
    element.classList.toggle("active", added);
  }
  showToast(added ? "Added to wishlist!" : "Removed from wishlist.");
};

window.handleCardAddToCart = function(productId) {
  CartStorage.add(productId, 1);
  showToast(`${PRODUCTS.find(p => p.id === productId).name} added to cart!`);
};

// Generic Toast feedback
function showToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }
  
  const toast = document.createElement("div");
  toast.style.cssText = `
    background-color: #121212;
    color: #FFFFFF;
    border-left: 4px solid #D4AF37;
    padding: 16px 24px;
    font-size: 0.9rem;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  `;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 10);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// 4. Homepage Loader
function initHomepage() {
  const featuredGrid = document.querySelector(".featured-grid");
  if (featuredGrid) {
    const featuredIds = [1, 5, 7, 8];
    const featuredProducts = PRODUCTS.filter(p => featuredIds.includes(p.id));
    featuredGrid.innerHTML = featuredProducts.map(p => createProductCardHTML(p)).join("");
  }
}

// 5. Shop Page Filters (includes Search string routing)
function initShopPage() {
  const shopGrid = document.querySelector(".shop-grid");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const sortSelect = document.querySelector(".sort-select");
  const pageBreadcrumb = document.querySelector(".breadcrumbs span");
  
  if (!shopGrid) return;
  
  const urlParams = new URLSearchParams(window.location.search);
  let activeSearch = urlParams.get("search") || "";
  let activeFilter = "All";
  let activeSort = "default";
  
  if (activeSearch) {
    if (pageBreadcrumb) {
      pageBreadcrumb.textContent = `Search results for: "${activeSearch}"`;
    }
  }

  function renderShop() {
    let filtered = PRODUCTS;
    
    // 1. Search Query Match
    if (activeSearch) {
      filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(activeSearch.toLowerCase()) || p.description.toLowerCase().includes(activeSearch.toLowerCase()));
    }
    
    // 2. Category Filter
    if (activeFilter !== "All") {
      filtered = filtered.filter(p => p.category.toLowerCase().includes(activeFilter.toLowerCase().replace("s", "")));
    }
    
    // 3. Price Sorting
    if (activeSort === "price-low") {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (activeSort === "price-high") {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    }
    
    // 4. Render Layout
    if (filtered.length === 0) {
      shopGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
          <h3 style="font-family: var(--font-heading); font-size: 1.8rem; margin-bottom: 12px; font-weight: 400;">No fragrances match your search</h3>
          <p style="color: var(--color-muted-gray); margin-bottom: 24px;">Try searching for elements like 'T-Light', 'Glass', 'Coconut', or 'Oudh'.</p>
          <a href="shop.html" class="btn btn-primary">View All Scents</a>
        </div>
      `;
    } else {
      shopGrid.innerHTML = filtered.map(p => createProductCardHTML(p)).join("");
    }
  }
  
  // Filter Event Listeners
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      // Reset search breadcrumb if they filter explicitly
      activeSearch = "";
      if (pageBreadcrumb) pageBreadcrumb.textContent = "Shop All";
      renderShop();
    });
  });
  
  // Sort dropdown Event Listener
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      activeSort = e.target.value;
      renderShop();
    });
  }
  
  renderShop();
}

// 6. Product Detail Page
function initProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  let productId = parseInt(urlParams.get("id")) || 1;
  const product = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];
  
  // Dynamic fields
  const title = document.querySelector(".product-name");
  const price = document.querySelector(".product-price");
  const desc = document.querySelector(".product-desc");
  const categoryLink = document.getElementById("detail-category-link");
  const productBreadcrumb = document.getElementById("detail-breadcrumb-name");
  
  if (title) title.textContent = product.name;
  if (price) price.textContent = `₹${product.price}`;
  if (desc) desc.textContent = product.description;
  if (categoryLink) {
    categoryLink.textContent = product.category;
    categoryLink.href = `shop.html`;
  }
  if (productBreadcrumb) productBreadcrumb.textContent = product.name;
  
  // Gallery
  const mainImg = document.getElementById("main-product-img");
  const thumbStrip = document.querySelector(".thumbnail-strip");
  if (mainImg) mainImg.src = product.image;
  if (thumbStrip) {
    thumbStrip.innerHTML = `
      <div class="thumbnail active" onclick="swapMainImage('${product.image}', this)"><img src="${product.image}" alt="${product.name}"></div>
      <div class="thumbnail" onclick="swapMainImage('assets/hero_candle.png', this)"><img src="assets/hero_candle.png" alt="Mood Candle Ambient"></div>
    `;
  }
  
  // Tab scent notes
  const noteTop = document.getElementById("note-top");
  const noteHeart = document.getElementById("note-heart");
  const noteBase = document.getElementById("note-base");
  if (noteTop) noteTop.textContent = product.notes.top;
  if (noteHeart) noteHeart.textContent = product.notes.heart;
  if (noteBase) noteBase.textContent = product.notes.base;
  
  // Tab specs
  const specBurn = document.getElementById("spec-burn");
  const specWax = document.getElementById("spec-wax");
  if (specBurn) specBurn.textContent = product.burnTime;
  if (specWax) specWax.textContent = product.waxType;
  
  // Tabs selectors
  const tabHeaders = document.querySelectorAll(".tab-header");
  const tabContents = document.querySelectorAll(".tab-content");
  tabHeaders.forEach(tab => {
    tab.addEventListener("click", () => {
      tabHeaders.forEach(t => t.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      const activeContent = document.getElementById(tab.dataset.tab);
      if (activeContent) activeContent.classList.add("active");
    });
  });
  
  // Qty Incrementers
  const qtyInput = document.querySelector(".qty-input");
  const btnMinus = document.querySelector(".qty-minus");
  const btnPlus = document.querySelector(".qty-plus");
  if (qtyInput && btnMinus && btnPlus) {
    btnMinus.addEventListener("click", () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });
    btnPlus.addEventListener("click", () => {
      let val = parseInt(qtyInput.value) || 1;
      qtyInput.value = val + 1;
    });
  }
  
  // Add to Cart
  const addToCartBtn = document.getElementById("detail-add-to-cart-btn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      const qty = parseInt(qtyInput.value) || 1;
      CartStorage.add(product.id, qty);
      showToast(`${qty} x ${product.name} added to cart!`);
    });
  }
  
  // Wishlist toggle on product detail
  const detailWishlistBtn = document.getElementById("detail-wishlist-btn");
  if (detailWishlistBtn) {
    const isWished = WishlistStorage.has(product.id);
    detailWishlistBtn.classList.toggle("active", isWished);
    detailWishlistBtn.addEventListener("click", () => {
      const added = WishlistStorage.toggle(product.id);
      detailWishlistBtn.classList.toggle("active", added);
      showToast(added ? "Added to wishlist!" : "Removed from wishlist.");
    });
  }
  
  // Related Grid rendering
  const relatedGrid = document.querySelector(".related-grid");
  if (relatedGrid) {
    const related = PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
    relatedGrid.innerHTML = related.map(p => createProductCardHTML(p)).join("");
  }
}

window.swapMainImage = function(src, thumbElement) {
  const mainImg = document.getElementById("main-product-img");
  if (mainImg) {
    mainImg.src = src;
    const thumbs = document.querySelectorAll(".thumbnail");
    thumbs.forEach(t => t.classList.remove("active"));
    thumbElement.classList.add("active");
  }
};

// 7. Shopping Cart Page (Indian Currency & 18% GST Calculations)
function initCartPage() {
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
    
    if (itemsContainer) itemsContainer.innerHTML = html;
    
    // Math logic adjustments for INR (₹500 threshold, 18% GST)
    const shipping = subtotal >= 500 ? 0 : 50;
    const gstRate = 0.18;
    const estimatedTax = subtotal * gstRate;
    const grandTotal = subtotal + shipping + estimatedTax;
    
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
    CartStorage.updateQty(productId, newQty);
    renderCart();
  };
  
  window.handleRemoveCartItem = function(productId) {
    CartStorage.remove(productId);
    renderCart();
    showToast("Removed from cart.");
  };
  
  renderCart();
}

// 8. Checkout Page (₹ pricing & 18% GST)
function initCheckoutPage() {
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
  
  // Form checkout submits
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const email = document.getElementById("shipping-email").value.trim();
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
        items: cart.map(i => ({ id: i.id, name: PRODUCTS.find(p => p.id === i.id).name, qty: i.qty })),
        status: "Confirmed"
      };
      
      if (isFirebaseInitialized) {
        db.ref("orders/" + orderId).set(newOrderObj)
          .then(() => {
            CartStorage.clear();
            window.location.href = `order-tracking.html?orderId=${orderId}`;
          })
          .catch(err => {
            console.error("Firebase order save failed", err);
            // Save local anyway
            OrderDb.add(newOrderObj);
            CartStorage.clear();
            window.location.href = `order-tracking.html?orderId=${orderId}`;
          });
      } else {
        OrderDb.add(newOrderObj);
        CartStorage.clear();
        window.location.href = `order-tracking.html?orderId=${orderId}`;
      }
    });
  }
}

// 9. Order Tracking (Connected to admin db updates)
function initOrderTrackingPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orderId");
  
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
    if (isFirebaseInitialized) {
      db.ref("orders/" + id).once("value")
        .then(snapshot => {
          const val = snapshot.val();
          if (val) {
            renderOrderTrackingUI(val);
          } else {
            // Check local fallback
            const localOrder = OrderDb.get().find(o => o.id === id);
            if (localOrder) {
              renderOrderTrackingUI(localOrder);
            } else {
              alert("Order ID not found in database.");
            }
          }
        })
        .catch(err => {
          console.error("Firebase track error", err);
          const localOrder = OrderDb.get().find(o => o.id === id);
          if (localOrder) renderOrderTrackingUI(localOrder);
        });
    } else {
      const localOrder = OrderDb.get().find(o => o.id === id);
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
    
    if (trackCarrier) {
      trackCarrier.textContent = order.status === "Delivered" ? "Delivered at Doorstep" : "In Transit via India Post BlueDart";
    }
    
    // Set Steps Activation based on status
    // Status can be: Confirmed -> Processing -> Shipped -> Delivered
    setTimeout(() => {
      const steps = document.querySelectorAll(".tracker-step");
      steps.forEach(s => s.classList.remove("completed", "active"));
      
      let fillPercent = 0;
      const status = order.status ? order.status.toLowerCase() : "confirmed";
      
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
        fetchAndShowOrder(idInput);
      }
    });
  }
}

// 10. Contact Page
function initContactPage() {
  const tabs = document.querySelectorAll(".contact-tab");
  const panes = document.querySelectorAll(".contact-form-pane");
  
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));
      
      tab.classList.add("active");
      const activePane = document.getElementById(tab.dataset.tab);
      if (activePane) activePane.classList.add("active");
    });
  });
  
  // If ?tab=bulk is requested, simulate click on bulk tab
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("tab") === "bulk") {
    const bulkTab = document.getElementById("tab-bulk");
    if (bulkTab) bulkTab.click();
  }

  const contactForm = document.getElementById("general-contact-form");
  const bulkForm = document.getElementById("bulk-order-form");
  
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Thank you! Your message has been received. Our team in Portland/India will respond within 24 hours.");
      contactForm.reset();
    });
  }
  
  if (bulkForm) {
    bulkForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Corporate bulk enquiry submitted successfully! A wholesale manager will send you a quotation invoice in ₹ shortly.");
      bulkForm.reset();
    });
  }
}

// 11. Admin Page Implementation
function initAdminPage() {
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const container = document.getElementById("admin-page-workspace");
  if (!container) return;
  
  const user = UserSession.get();
  
  // If not logged in as Admin, show login card
  if (!user || !user.isAdmin) {
    container.innerHTML = `
      <div class="admin-login-container">
        <h2 class="auth-title">Admin Scentportal</h2>
        <p style="color:var(--color-muted-gray); text-align:center; margin-bottom:24px;">Please login with administrative credentials to manage candles and client orders.</p>
        
        <form id="admin-login-form">
          <div class="form-group">
            <label for="admin-email">Admin Email</label>
            <input type="email" id="admin-email" required placeholder="E.g., admin@signaturespell.com">
          </div>
          <div class="form-group">
            <label for="admin-password">Password</label>
            <input type="password" id="admin-password" required placeholder="E.g., admin123">
          </div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-bottom:16px;">Secure Login</button>
        </form>
        
        <div class="sso-divider">Or SSO</div>
        <button class="btn btn-google-sso" id="admin-google-sso-btn">
          <svg viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 1.84 14.96 1 12 1 7.35 1 3.37 3.68 1.41 7.59l3.79 2.94C6.11 7.25 8.84 5.04 12 5.04z"/><path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.03 3.67-5.02 3.67-8.64z"/><path fill="#FBBC05" d="M5.2 14.75c-.24-.72-.38-1.49-.38-2.3c0-.81.14-1.59.38-2.3L1.41 7.21C.51 9.02 0 11.01 0 13.1c0 2.09.51 4.08 1.41 5.89l3.79-3.24z"/><path fill="#34A853" d="M12 23c3.24 0 5.97-1.09 7.96-2.96l-3.76-2.91c-1.11.75-2.53 1.21-4.2 1.21-3.16 0-5.89-2.21-6.84-5.49L1.36 16.1C3.32 20.02 7.3 23 12 23z"/></svg>
          Google SSO Login
        </button>
      </div>
    `;
    
    // Bind mock/Firebase Auth triggers
    const loginForm = document.getElementById("admin-login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("admin-email").value.trim();
        const pass = document.getElementById("admin-password").value;
        
        if (isFirebaseInitialized) {
          auth.signInWithEmailAndPassword(email, pass)
            .then(() => showToast("Admin logged in successfully."))
            .catch(err => alert("Auth Failed: " + err.message));
        } else {
          // Mock Bypass: email must start with "admin"
          if (email.startsWith("admin")) {
            UserSession.set({ name: "Aria Vance (Admin)", email: email, isAdmin: true });
            showToast("Admin session unlocked.");
          } else {
            alert("Invalid admin credentials. Use any email starting with 'admin'.");
          }
        }
      });
    }
    
    const adminGoogleBtn = document.getElementById("admin-google-sso-btn");
    if (adminGoogleBtn) {
      adminGoogleBtn.addEventListener("click", () => {
        if (isFirebaseInitialized) {
          auth.signInWithPopup(googleProvider)
            .then(() => showToast("SSO Complete."))
            .catch(err => alert(err.message));
        } else {
          UserSession.set({ name: "Google Administrator", email: "admin@signaturespell.com", isAdmin: true });
          showToast("Admin SSO simulation unlocked.");
        }
      });
    }
    return;
  }
  
  // Admin is Logged In - Render full CRUD panels
  container.innerHTML = `
    <div class="admin-dashboard">
      <!-- Admin Header Block -->
      <div class="admin-header">
        <div>
          <h2>Admin Control Center</h2>
          <span style="font-size:0.8rem; color:var(--color-muted-gray); text-transform:uppercase; letter-spacing:0.05em;">Signature Spell | Management Portal</span>
        </div>
        <div class="admin-user-info">
          <span>Hello, <strong>${user.name}</strong></span>
          <button class="btn btn-secondary" onclick="handleAdminLogout()" style="padding:6px 12px; font-size:0.75rem;">Log Out</button>
        </div>
      </div>
      
      <!-- Split CRUD Workspace -->
      <div class="admin-grid">
        
        <!-- Left: Product ADD / REMOVE -->
        <div class="admin-panel-card">
          <h3>Manage Fragrances</h3>
          
          <!-- Add Form -->
          <form id="admin-add-product-form" style="margin-bottom: 24px; border-bottom:1px solid var(--color-light-gray); padding-bottom:20px;">
            <h5 style="margin-bottom:12px; font-weight:700;">Add New Candle</h5>
            <div class="form-group-row">
              <div class="form-group" style="margin-bottom:10px;">
                <label>Candle Name</label>
                <input type="text" id="add-prod-name" required placeholder="E.g., Vanilla Wood Candle">
              </div>
              <div class="form-group" style="margin-bottom:10px;">
                <label>Price (₹)</label>
                <input type="number" id="add-prod-price" required placeholder="INR Price">
              </div>
            </div>
            <div class="form-group-row">
              <div class="form-group" style="margin-bottom:10px;">
                <label>Category</label>
                <select id="add-prod-category" required>
                  <option value="Tea Lights">Tea Lights</option>
                  <option value="Jars">Glass Jars</option>
                  <option value="Shells">Coconut Shells</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:10px;">
                <label>Image URL</label>
                <input type="text" id="add-prod-image" value="assets/regular_tlight.png" required>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:15px;">
              <label>Scent Teaser Notes (Top, Heart, Base)</label>
              <input type="text" id="add-prod-notes" placeholder="Top, Middle, Base notes separated by commas">
            </div>
            <button type="submit" class="btn btn-accent btn-block" style="padding:10px;">Add Scent to Shop</button>
          </form>
          
          <!-- List Products with Remove buttons -->
          <h5 style="margin-bottom:10px; font-weight:700;">Active Product Catalog</h5>
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Vessel</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody id="admin-product-table-body">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Right: Order Tracking Management -->
        <div class="admin-panel-card">
          <h3>Customer Orders & Tracking</h3>
          <p style="font-size:0.8rem; color:var(--color-muted-gray); margin-bottom:16px;">Update shipping progress. Changes immediately affect what customers see when checking their Order IDs on the order-tracking page.</p>
          
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody id="admin-orders-table-body">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  `;
  
  // Populate Product Management Table rows
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
  
  // Populate Orders management rows
  const ordersTable = document.getElementById("admin-orders-table-body");
  if (ordersTable) {
    const orders = OrderDb.get();
    if (orders.length === 0) {
      ordersTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-muted-gray);">No orders placed yet. Place an order on checkout.html!</td></tr>`;
    } else {
      ordersTable.innerHTML = orders.map(o => {
        const d = new Date(o.date);
        return `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>${d.toLocaleDateString("en-IN", {month:'short', day:'numeric'})}</td>
            <td>${o.customer}</td>
            <td><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></td>
            <td>
              <select class="admin-status-select" onchange="handleAdminUpdateOrderStatus('${o.id}', this.value)">
                <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              </select>
            </td>
          </tr>
        `;
      }).join("");
    }
  }
  
  // Bind Product Add form submit
  const addForm = document.getElementById("admin-add-product-form");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
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
      
      if (isFirebaseInitialized) {
        db.ref("products/" + newId).set(newProduct)
          .then(() => {
            ProductDb.add(newProduct);
            showToast("New candle saved!");
          })
          .catch(err => {
            console.error("Firebase save error", err);
            ProductDb.add(newProduct);
          });
      } else {
        ProductDb.add(newProduct);
        showToast("Candle added locally!");
      }
      addForm.reset();
    });
  }
}

// Global actions from admin dashboard clicks
window.handleAdminLogout = function() {
  if (isFirebaseInitialized) {
    auth.signOut();
  } else {
    UserSession.clear();
  }
  showToast("Logged out from admin panel.");
};

window.handleAdminDeleteProduct = function(productId) {
  if (confirm("Are you sure you want to remove this fragrance from the shop?")) {
    if (isFirebaseInitialized) {
      db.ref("products/" + productId).remove()
        .then(() => {
          ProductDb.remove(productId);
          showToast("Product deleted from Realtime Database.");
        })
        .catch(err => {
          console.error("Firebase deletion failed", err);
          ProductDb.remove(productId);
        });
    } else {
      ProductDb.remove(productId);
      showToast("Product deleted locally.");
    }
  }
};

window.handleAdminUpdateOrderStatus = function(orderId, newStatus) {
  if (isFirebaseInitialized) {
    db.ref("orders/" + orderId).update({ status: newStatus })
      .then(() => {
        OrderDb.updateStatus(orderId, newStatus);
        showToast(`Order ${orderId} updated to ${newStatus}`);
      })
      .catch(err => {
        console.error("Firebase status update failed", err);
        OrderDb.updateStatus(orderId, newStatus);
      });
  } else {
    OrderDb.updateStatus(orderId, newStatus);
    showToast(`Order status set to ${newStatus}`);
  }
};

window.showInlineAlert = function(container, message, type = "danger") {
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}">
      ${message}
    </div>
  `;
};

