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
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p !== null && typeof p === "object" && p.id && p.name);
      }
      return parsed || [];
    } catch (e) {
      return DEFAULT_PRODUCTS;
    }
  },
  save: function(list) {
    PRODUCTS = list;
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
      let cart = cartStr ? JSON.parse(cartStr) : [];
      if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) && PRODUCTS.length > 0) {
        const validCart = cart.filter(item => PRODUCTS.some(p => p.id == item.id));
        if (validCart.length !== cart.length) {
          localStorage.setItem("signature_spell_cart", JSON.stringify(validCart));
          cart = validCart;
        }
      }
      return cart;
    } catch (e) {
      console.error("Error reading cart", e);
      return [];
    }
  },
  save: function(cart) {
    try {
      localStorage.setItem("signature_spell_cart", JSON.stringify(cart));
      document.dispatchEvent(new CustomEvent("cartUpdated"));
      
      // Sync to Firebase if logged in
      if (typeof firebase !== "undefined" && isFirebaseInitialized && auth && auth.currentUser) {
        db.ref("users/" + auth.currentUser.uid + "/cart").set(cart);
      }
    } catch (e) {
      console.error("Error saving cart", e);
    }
  },
  add: function(id, qty = 1, fragrance = "Lavender Mist") {
    const cart = this.get();
    const existingItem = cart.find(item => item.id == id && (item.fragrance || "Lavender Mist") === fragrance);
    if (existingItem) {
      existingItem.qty += qty;
    } else {
      cart.push({ id: id, qty: qty, fragrance: fragrance });
    }
    this.save(cart);
  },
  updateQty: function(id, fragrance, qty) {
    let actualFragrance = fragrance;
    let actualQty = qty;
    let hasFragrance = true;

    // If second arg is a number or undefined and third is undefined, it's (id, qty)
    if ((typeof fragrance === "number" || typeof fragrance === "undefined") && typeof qty === "undefined") {
      actualQty = fragrance;
      actualFragrance = undefined;
      hasFragrance = false;
    }

    console.log("[CartStorage.updateQty] Called with:", { id, fragrance, qty, actualFragrance, actualQty, hasFragrance });

    let cart = this.get();
    console.log("[CartStorage.updateQty] Current cart before update:", JSON.stringify(cart));

    const existingItem = cart.find(item => {
      if (hasFragrance) {
        return item.id == id && (item.fragrance || "Lavender Mist") === actualFragrance;
      } else {
        return item.id == id;
      }
    });

    console.log("[CartStorage.updateQty] Found matching item:", existingItem);

    if (existingItem) {
      existingItem.qty = Math.max(1, actualQty);
      console.log("[CartStorage.updateQty] Updated item qty to:", existingItem.qty);
    }
    
    this.save(cart);
    console.log("[CartStorage.updateQty] Cart saved:", JSON.stringify(this.get()));
  },
  remove: function(id, fragrance) {
    let cart = this.get();
    if (typeof fragrance === "undefined") {
      cart = cart.filter(item => item.id != id);
    } else {
      cart = cart.filter(item => !(item.id == id && (item.fragrance || "Lavender Mist") === fragrance));
    }
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
      const list = wishStr ? JSON.parse(wishStr) : [];
      if (!Array.isArray(list)) return [];
      const cleanList = list.map(Number).filter(id => !isNaN(id) && id > 0);
      if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) && PRODUCTS.length > 0) {
        return cleanList.filter(id => PRODUCTS.some(p => p.id == id));
      }
      return cleanList;
    } catch (e) {
      console.error("Error reading wishlist", e);
      return [];
    }
  },
  save: function(list) {
    try {
      const cleanList = Array.isArray(list) ? list.map(Number).filter(id => !isNaN(id) && id > 0) : [];
      localStorage.setItem("signature_spell_wishlist", JSON.stringify(cleanList));
      document.dispatchEvent(new CustomEvent("wishlistUpdated"));

      // Sync to Firebase if logged in
      if (typeof firebase !== "undefined" && isFirebaseInitialized && auth && auth.currentUser) {
        db.ref("users/" + auth.currentUser.uid + "/wishlist").set(cleanList);
      }
    } catch (e) {
      console.error("Error saving wishlist", e);
    }
  },
  toggle: function(id) {
    const numId = Number(id);
    if (isNaN(numId)) return false;
    let list = this.get();
    const index = list.indexOf(numId);
    if (index > -1) {
      list.splice(index, 1);
      this.save(list);
      return false; // Removed
    } else {
      list.push(numId);
      this.save(list);
      return true; // Added
    }
  },
  has: function(id) {
    return this.get().includes(Number(id));
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

const UserNotificationsApi = {
  getLocalKey: function(user) {
    if (user && user.uid) return "signature_spell_notifications_" + user.uid;
    return "signature_spell_notifications_guest";
  },

  getLocal: function(user) {
    try {
      const raw = localStorage.getItem(this.getLocalKey(user));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  saveLocal: function(list, user) {
    const safeList = Array.isArray(list) ? list.slice(0, 50) : [];
    localStorage.setItem(this.getLocalKey(user), JSON.stringify(safeList));
    document.dispatchEvent(new CustomEvent("notificationsUpdated"));
  },

  buildPayload: function(data) {
    return {
      type: data.type || "general",
      title: data.title || "New update",
      message: data.message || "You have a new notification.",
      link: data.link || "",
      orderId: data.orderId || "",
      status: data.status || "",
      createdAt: data.createdAt || Date.now(),
      read: !!data.read
    };
  },

  createForCurrentUser: async function(data) {
    const payload = this.buildPayload(data || {});
    const user = UserSession.get();

    if (typeof firebase !== "undefined" && isFirebaseInitialized && auth && auth.currentUser) {
      try {
        await db.ref("users/" + auth.currentUser.uid + "/notifications").push(payload);
        return { ok: true, remote: true };
      } catch (e) {
        console.error("Failed to write notification to Firebase:", e);
      }
    }

    const local = this.getLocal(user);
    local.unshift({ id: "local-" + Date.now(), ...payload });
    this.saveLocal(local, user);
    return { ok: true, remote: false };
  },

  createForUserByEmail: async function(email, data) {
    if (!email) return { ok: false, reason: "Missing email" };
    const payload = this.buildPayload(data || {});

    if (!(typeof firebase !== "undefined" && isFirebaseInitialized && db)) {
      return { ok: false, reason: "Firebase not initialized" };
    }

    try {
      const snap = await db.ref("users").orderByChild("email").equalTo(String(email).toLowerCase()).once("value");
      if (!snap.exists()) return { ok: false, reason: "User not found" };

      const writes = [];
      snap.forEach(child => {
        writes.push(db.ref("users/" + child.key + "/notifications").push(payload));
      });

      await Promise.all(writes);
      return { ok: true, recipients: writes.length };
    } catch (e) {
      console.error("Failed createForUserByEmail:", e);
      return { ok: false, reason: e.message };
    }
  },

  createForAllUsers: async function(data) {
    const payload = this.buildPayload(data || {});

    if (!(typeof firebase !== "undefined" && isFirebaseInitialized && db)) {
      return { ok: false, reason: "Firebase not initialized" };
    }

    try {
      const snap = await db.ref("users").once("value");
      if (!snap.exists()) return { ok: false, reason: "No users found" };

      const writes = [];
      snap.forEach(child => {
        writes.push(db.ref("users/" + child.key + "/notifications").push(payload));
      });

      await Promise.all(writes);
      return { ok: true, recipients: writes.length };
    } catch (e) {
      console.error("Failed createForAllUsers:", e);
      return { ok: false, reason: e.message };
    }
  }
};

window.UserNotificationsApi = UserNotificationsApi;

// Global DOM Content Loaded Init
document.addEventListener("DOMContentLoaded", () => {
  // Clear order tracking id if we are on any page other than order-tracking.html
  if (getPageName() !== "order-tracking.html") {
    sessionStorage.removeItem("selected_order_id");
  }

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
  });
  
  document.addEventListener("productsUpdated", () => {
    PRODUCTS = ProductDb.get();
  });
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
          let isAdmin = user.email ? (user.email === "admin@signaturespell.com" || user.email === "nandheswara21@gmail.com" || user.email.startsWith("admin")) : false;
          let safeEmail = user.email || "No Email";
          let safeName = user.displayName || (user.email ? user.email.split("@")[0] : "User");
          UserSession.set({
            name: safeName,
            email: safeEmail,
            photo: user.photoURL,
            uid: user.uid,
            isAdmin: isAdmin
          });
          
          try {
            const roleSnap = await db.ref("users/" + user.uid + "/role").once("value");
            if (roleSnap.exists()) {
              const role = roleSnap.val();
              UserSession.set({
                name: safeName,
                email: safeEmail,
                photo: user.photoURL,
                uid: user.uid,
                isAdmin: role === "admin" || isAdmin
              });
            }
          } catch(e) {}

          // Synchronize and Merge User-specific Cart from Firebase Realtime Database
          try {
            const cartSnap = await db.ref("users/" + user.uid + "/cart").once("value");
            const localCartStr = localStorage.getItem("signature_spell_cart");
            let localCart = [];
            try {
              if (localCartStr) localCart = JSON.parse(localCartStr);
            } catch(je) {}
            if (!Array.isArray(localCart)) localCart = [];

            const justLoggedIn = sessionStorage.getItem("just_logged_in") === "true";
            sessionStorage.removeItem("just_logged_in"); // Clear flag immediately

            if (cartSnap.exists()) {
              const dbCart = cartSnap.val() || [];
              if (justLoggedIn) {
                dbCart.forEach(dbItem => {
                  const existing = localCart.find(i => i.id == dbItem.id && (i.fragrance || "Lavender Mist") === (dbItem.fragrance || "Lavender Mist"));
                  if (existing) {
                    existing.qty += dbItem.qty;
                  } else {
                    localCart.push(dbItem);
                  }
                });
                localStorage.setItem("signature_spell_cart", JSON.stringify(localCart));
                await db.ref("users/" + user.uid + "/cart").set(localCart);
              } else {
                // Overwrite local cart with DB cart (DB is source of truth on fresh page loads)
                localCart = dbCart;
                localStorage.setItem("signature_spell_cart", JSON.stringify(localCart));
              }
            } else {
              if (localCart.length > 0) {
                await db.ref("users/" + user.uid + "/cart").set(localCart);
              }
            }
            document.dispatchEvent(new CustomEvent("cartUpdated"));
          } catch (e) {
            console.error("Error syncing cart from DB:", e);
          }

          // Synchronize and Merge User-specific Wishlist from Firebase Realtime Database
          try {
            const wishSnap = await db.ref("users/" + user.uid + "/wishlist").once("value");
            const localWishStr = localStorage.getItem("signature_spell_wishlist");
            let localWish = [];
            try {
              if (localWishStr) localWish = JSON.parse(localWishStr);
            } catch(je) {}
            if (!Array.isArray(localWish)) localWish = [];

            if (wishSnap.exists()) {
              const dbWish = wishSnap.val() || [];
              dbWish.forEach(dbItem => {
                const numId = Number(dbItem);
                if (!isNaN(numId) && numId > 0 && !localWish.map(Number).includes(numId)) {
                  localWish.push(numId);
                }
              });
              // Filter localWish to remove any legacy invalid values (like 0, null, etc.)
              localWish = localWish.map(Number).filter(id => !isNaN(id) && id > 0);
              localStorage.setItem("signature_spell_wishlist", JSON.stringify(localWish));
              await db.ref("users/" + user.uid + "/wishlist").set(localWish);
            } else {
              if (localWish.length > 0) {
                await db.ref("users/" + user.uid + "/wishlist").set(localWish);
              }
            }
            document.dispatchEvent(new CustomEvent("wishlistUpdated"));
          } catch (e) {
            console.error("Error syncing wishlist from DB:", e);
          }

        } else {
          UserSession.clear();
          document.dispatchEvent(new CustomEvent("cartUpdated"));
          document.dispatchEvent(new CustomEvent("wishlistUpdated"));
        }
      });

      // Synchronize Products dynamically from Realtime DB
      db.ref("products").on("value", (snapshot) => {
        const val = snapshot.val();
        if (val) {
          // Convert object list to array and filter out nulls/invalid objects
          const arr = Object.values(val).filter(p => p !== null && typeof p === "object" && p.id && p.name);
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
  }
  const wishlistBtn = document.getElementById("wishlist-btn");
  if (wishlistBtn) {
    wishlistBtn.setAttribute("href", "shop.html?filter=wishlist");
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
  if (page === "cart.html" || page === "checkout.html" || page === "admin.html" || page === "store-manager.html") {
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
    const p = PRODUCTS.find(prod => prod.id == item.id);
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
    <a href="cart.html" class="floating-cart-btn">
      <span>Checkout</span>
      <svg class="btn-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12,5 19,12 12,19"></polyline>
      </svg>
    </a>
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
    } else if (!navigator.onLine || (message && (
      message.includes("network-request-failed") ||
      message.includes("network error") ||
      message.includes("timeout") ||
      message.includes("unreachable host")
    ))) {
      friendlyMessage = "Check your Internet and try again.";
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
        if (getPageName() !== "orders.html") {
          window.location.href = "orders.html";
        } else {
          showConfirm(`Logged in as ${user.name}. Would you like to log out?`, {
            title: 'Log Out',
            icon: '👋',
            confirmText: 'Yes, Log Out',
            cancelText: 'Stay Logged In'
          }).then(function(confirmed) {
            if (confirmed) {
              if (isFirebaseInitialized) {
                auth.signOut();
              } else {
                UserSession.clear();
              }
              showToast("Logged out successfully.");
            }
          });
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
    authFormState = "login";
    updateModalUI();
    if (overlay) overlay.classList.add("active");
  };
  
  // Tab/Forms toggle inside modal
  const formTitle = document.getElementById("auth-form-title");
  const submitBtn = document.getElementById("auth-submit-btn");
  const switchDesc = document.getElementById("auth-switch-desc");
  
  let authFormState = "login"; // "login" | "signup" | "forgot"
  
  function initAuthModalToggleLink() {
    const link = document.getElementById("auth-switch-link");
    if (link) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        clearAuthError();
        if (authFormState === "login") {
          authFormState = "signup";
        } else {
          authFormState = "login";
        }
        updateModalUI();
      });
    }
  }

  const setButtonLoading = (btn, isLoading) => {
    if (btn) {
      if (isLoading) {
        btn.classList.add("btn-loading");
        btn.disabled = true;
      } else {
        btn.classList.remove("btn-loading");
        btn.disabled = false;
      }
    }
  };

  function updateModalUI() {
    clearAuthError();
    const passInput = document.getElementById("auth-pass-input");
    const passGroup = passInput ? passInput.closest(".form-group") : null;
    const emailInput = document.getElementById("auth-email-input");
    const emailGroup = emailInput ? emailInput.closest(".form-group") : null;
    const ssoDivider = overlay ? overlay.querySelector(".sso-divider") : null;
    const googleBtn = document.getElementById("google-sso-btn");

    if (authFormState === "login") {
      if (formTitle) formTitle.textContent = "Welcome Back";
      if (submitBtn) submitBtn.textContent = "Sign In";
      if (emailGroup) emailGroup.style.display = "block";
      if (emailInput) emailInput.required = true;
      if (passGroup) passGroup.style.display = "block";
      if (passInput) passInput.required = true;
      if (ssoDivider) ssoDivider.style.display = "block";
      if (googleBtn) googleBtn.style.display = "flex";
      if (switchDesc) switchDesc.innerHTML = `Don't have an account? <a href="#" id="auth-switch-link">Sign Up</a>`;
    } else if (authFormState === "signup") {
      if (formTitle) formTitle.textContent = "Create Account";
      if (submitBtn) submitBtn.textContent = "Sign Up";
      if (emailGroup) emailGroup.style.display = "block";
      if (emailInput) emailInput.required = true;
      if (passGroup) passGroup.style.display = "block";
      if (passInput) passInput.required = true;
      if (ssoDivider) ssoDivider.style.display = "block";
      if (googleBtn) googleBtn.style.display = "flex";
      if (switchDesc) switchDesc.innerHTML = `Already have an account? <a href="#" id="auth-switch-link">Sign In</a>`;
    } else if (authFormState === "forgot") {
      if (formTitle) formTitle.textContent = "Reset Password";
      if (submitBtn) submitBtn.textContent = "Send Reset Link";
      if (emailGroup) emailGroup.style.display = "block";
      if (emailInput) emailInput.required = true;
      if (passGroup) passGroup.style.display = "none";
      if (passInput) passInput.required = false;
      if (ssoDivider) ssoDivider.style.display = "none";
      if (googleBtn) googleBtn.style.display = "none";
      if (switchDesc) switchDesc.innerHTML = `Remembered your password? <a href="#" id="auth-switch-link">Sign In</a>`;
    }

    // Trigger smooth fade transition
    const modalWrapper = overlay ? overlay.querySelector(".auth-modal") : null;
    if (modalWrapper) {
      modalWrapper.classList.remove("auth-modal-content-fade");
      void modalWrapper.offsetWidth; // Force reflow
      modalWrapper.classList.add("auth-modal-content-fade");
    }

    initAuthModalToggleLink();
  }



  // Initialize toggle links
  initAuthModalToggleLink();

  // Inject "Forgot Password?" link dynamically above the password input
  const passInputElCheck = document.getElementById("auth-pass-input");
  if (passInputElCheck) {
    const passGroup = passInputElCheck.closest(".form-group");
    if (passGroup) {
      if (!document.getElementById("auth-forgot-link")) {
        const label = passGroup.querySelector("label");
        if (label) {
          const container = document.createElement("div");
          container.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
          label.parentNode.insertBefore(container, label);
          container.appendChild(label);
          label.style.margin = "0";

          const forgotLink = document.createElement("a");
          forgotLink.id = "auth-forgot-link";
          forgotLink.href = "#";
          forgotLink.textContent = "Forgot Password?";
          forgotLink.style.cssText = "font-size: 0.8rem; color: var(--color-gold); text-decoration: none;";
          forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            authFormState = "forgot";
            updateModalUI();
          });
          container.appendChild(forgotLink);
        }
      }
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
      
      if (!navigator.onLine) {
        showAuthError("Check your Internet and try again.");
      } else if (isFirebaseInitialized) {
        if (authFormState === "login") {
          setButtonLoading(submitBtn, true);
          sessionStorage.setItem("just_logged_in", "true");
          auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
              setButtonLoading(submitBtn, false);
              overlay.classList.remove("active");
              showToast("Welcome back!");
            })
            .catch(err => {
              setButtonLoading(submitBtn, false);
              sessionStorage.removeItem("just_logged_in");
              showAuthError(err.message);
            });
        } else if (authFormState === "signup") {
          setButtonLoading(submitBtn, true);
          sessionStorage.setItem("just_logged_in", "true");
          auth.createUserWithEmailAndPassword(email, pass)
            .then(() => {
              setButtonLoading(submitBtn, false);
              overlay.classList.remove("active");
              showToast("Account created!");
            })
            .catch(err => {
              setButtonLoading(submitBtn, false);
              sessionStorage.removeItem("just_logged_in");
              showAuthError(err.message);
            });
        } else if (authFormState === "forgot") {
          setButtonLoading(submitBtn, true);
          auth.sendPasswordResetEmail(email)
            .then(() => {
              setButtonLoading(submitBtn, false);
              if (overlay) overlay.classList.remove("active");
              authFormState = "login";
              updateModalUI();
              
              if (typeof window.showModal === "function") {
                window.showModal("A password reset link has been dispatched to your email address. Please check your inbox and spam folder to reset your password.", {
                  title: "Reset Link Sent",
                  type: "success",
                  icon: "✉️",
                  confirmText: "Got it"
                });
              } else {
                showToast("Password reset email sent!");
              }
            })
            .catch(err => {
              setButtonLoading(submitBtn, false);
              showAuthError(err.message);
            });
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
      if (!navigator.onLine) {
        showAuthError("Check your Internet and try again.");
      } else if (isFirebaseInitialized) {
        setButtonLoading(googleBtn, true);
        sessionStorage.setItem("just_logged_in", "true");
        auth.signInWithPopup(googleProvider)
          .then(() => {
            setButtonLoading(googleBtn, false);
            overlay.classList.remove("active");
            showToast("Welcome!");
          })
          .catch(err => {
            setButtonLoading(googleBtn, false);
            sessionStorage.removeItem("just_logged_in");
            if (err && err.code === "auth/account-exists-with-different-credential") {
              showAuthError("An account with this email address already exists under another login method. Please sign in with your email/password first, then link your Google account in your Profile settings.");
            } else {
              showAuthError(err.message);
            }
          });
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
      <button class="wishlist-heart-btn ${isWished ? 'active' : ''}" onclick="handleCardWishlistToggle('${product.id}', this)" aria-label="Add to wishlist">
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
        <button class="btn btn-primary btn-block product-card-cta" onclick="handleCardAddToCart('${product.id}')">Add to Cart</button>
      </div>
    </article>
  `;
}

// Global Wishlist actions
window.handleCardWishlistToggle = function(productId, element) {
  if (typeof WishlistStorage === "undefined") return;

  const added = WishlistStorage.toggle(productId);
  if (element) {
    element.classList.toggle("active", added);
  }
  showToast(added ? "Added to wishlist!" : "Removed from wishlist.");
};

window.handleCardAddToCart = function(productId) {
  CartStorage.add(productId, 1);
  const p = PRODUCTS.find(p => p.id == productId);
  showToast(`${p ? p.name : "Candle"} added to cart!`);
};

// Generic Toast feedback
function showToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
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

// Pre-navigation URL Parameter Hiding Interceptor
document.addEventListener("click", function(e) {
  const anchor = e.target.closest("a");
  if (!anchor) return;
  
  const href = anchor.getAttribute("href");
  if (!href) return;
  
  // Intercept product.html?id=...
  const productMatch = href.match(/product\.html\?id=(\d+)/);
  if (productMatch) {
    e.preventDefault();
    sessionStorage.setItem("selected_product_id", productMatch[1]);
    window.location.href = "product.html";
    return;
  }
  
  // Intercept order-tracking.html?orderId=...
  const trackingMatch = href.match(/order-tracking\.html\?orderId=([^&]+)/);
  if (trackingMatch) {
    e.preventDefault();
    sessionStorage.setItem("selected_order_id", trackingMatch[1]);
    window.location.href = "order-tracking.html";
    return;
  }

  // Intercept shop.html?filter=...
  const shopFilterMatch = href.match(/shop\.html\?filter=([^&]+)/);
  if (shopFilterMatch) {
    e.preventDefault();
    sessionStorage.setItem("selected_shop_filter", shopFilterMatch[1]);
    window.location.href = "shop.html";
    return;
  }

  // If clicking on shop.html with no parameters, clear the shop filter
  if (href === "shop.html" || href.endsWith("/shop.html")) {
    sessionStorage.removeItem("selected_shop_filter");
  }

  // If clicking on order-tracking.html with no parameters, clear the selected order id
  if (href === "order-tracking.html" || href.endsWith("/order-tracking.html")) {
    sessionStorage.removeItem("selected_order_id");
  }
}, true);
