/* js/product.js - Product details page initializers and handlers */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof PRODUCTS === "undefined") return;

  const urlParams = new URLSearchParams(window.location.search);
  let productId = parseInt(urlParams.get("id"));
  if (productId) {
    sessionStorage.setItem("selected_product_id", productId);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    productId = parseInt(sessionStorage.getItem("selected_product_id")) || 1;
  }

  function renderProduct() {
    if (typeof PRODUCTS === "undefined" || PRODUCTS.length === 0) return;
    
    const product = PRODUCTS.find(p => p.id == productId) || PRODUCTS[0];
    
    // Dynamic text fields
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

    // --- DYNAMIC SEO META UPDATES ---
    const pageTitle = `${product.name} | Signature Spell`;
    document.title = pageTitle;

    const pageUrl = `https://signaturespell.com/product.html?id=${product.id}`;
    const productImgUrl = product.image.startsWith('http') ? product.image : `https://signaturespell.com/${product.image}`;
    const seoDesc = `${product.description} Scent notes: Top: ${product.notes.top}, Heart: ${product.notes.heart}, Base: ${product.notes.base}. Burn time: ${product.burnTime}.`;

    // Dynamic Description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", seoDesc);

    // Dynamic Canonical
    const canonicalTag = document.getElementById("canonical-placeholder");
    if (canonicalTag) canonicalTag.setAttribute("href", pageUrl);

    // Dynamic OG tags
    const ogUrl = document.getElementById("og-url-placeholder");
    if (ogUrl) ogUrl.setAttribute("content", pageUrl);

    const ogTitle = document.getElementById("og-title-placeholder");
    if (ogTitle) ogTitle.setAttribute("content", pageTitle);

    const ogDesc = document.getElementById("og-desc-placeholder");
    if (ogDesc) ogDesc.setAttribute("content", product.description);

    const ogImg = document.getElementById("og-image-placeholder");
    if (ogImg) ogImg.setAttribute("content", productImgUrl);

    // Dynamic Twitter tags
    const twitterUrl = document.getElementById("twitter-url-placeholder");
    if (twitterUrl) twitterUrl.setAttribute("content", pageUrl);

    const twitterTitle = document.getElementById("twitter-title-placeholder");
    if (twitterTitle) twitterTitle.setAttribute("content", pageTitle);

    const twitterDesc = document.getElementById("twitter-desc-placeholder");
    if (twitterDesc) twitterDesc.setAttribute("content", product.description);

    const twitterImg = document.getElementById("twitter-image-placeholder");
    if (twitterImg) twitterImg.setAttribute("content", productImgUrl);

    // --- DYNAMIC JSON-LD PRODUCT SCHEMA ---
    let schemaScript = document.getElementById("dynamic-product-schema");
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.id = "dynamic-product-schema";
      schemaScript.type = "application/ld+json";
      document.head.appendChild(schemaScript);
    }
    const productSchema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": [productImgUrl],
      "description": product.description,
      "sku": `SS-CANDLE-${product.id}`,
      "mpn": `SS-${product.id}`,
      "brand": {
        "@type": "Brand",
        "name": "Signature Spell"
      },
      "offers": {
        "@type": "Offer",
        "url": pageUrl,
        "priceCurrency": "INR",
        "price": product.price,
        "priceValidUntil": "2027-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Signature Spell"
        }
      },
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Wax Type",
          "value": product.waxType
        },
        {
          "@type": "PropertyValue",
          "name": "Burn Time",
          "value": product.burnTime
        },
        {
          "@type": "PropertyValue",
          "name": "Scent Note - Top",
          "value": product.notes.top
        },
        {
          "@type": "PropertyValue",
          "name": "Scent Note - Heart",
          "value": product.notes.heart
        },
        {
          "@type": "PropertyValue",
          "name": "Scent Note - Base",
          "value": product.notes.base
        }
      ]
    };
    schemaScript.textContent = JSON.stringify(productSchema, null, 2);
    
    // Gallery image loads
    const mainImg = document.getElementById("main-product-img");
    const thumbStrip = document.querySelector(".thumbnail-strip");
    if (mainImg) mainImg.src = product.image;
    if (thumbStrip) {
      thumbStrip.innerHTML = `
        <div class="thumbnail active" onclick="swapMainImage('${product.image}', this)"><img src="${product.image}" alt="${product.name}"></div>
      `;
    }
    
    // Tab scent notes loading
    const noteTop = document.getElementById("note-top");
    const noteHeart = document.getElementById("note-heart");
    const noteBase = document.getElementById("note-base");
    if (noteTop) noteTop.textContent = product.notes.top;
    if (noteHeart) noteHeart.textContent = product.notes.heart;
    if (noteBase) noteBase.textContent = product.notes.base;
    
    // Tab spec burn details
    const specBurn = document.getElementById("spec-burn");
    const specWax = document.getElementById("spec-wax");
    if (specBurn) specBurn.textContent = product.burnTime;
    if (specWax) specWax.textContent = product.waxType;

    // Candle Size
    const sizeBadge = document.getElementById("detail-size-badge");
    const sizeRow = document.getElementById("spec-size-row");
    const sizeVal = document.getElementById("spec-size");
    if (product.size) {
      if (sizeBadge) {
        sizeBadge.textContent = product.size;
        sizeBadge.style.display = "inline-block";
      }
      if (sizeRow) sizeRow.style.display = "flex";
      if (sizeVal) sizeVal.textContent = product.size;
    } else {
      if (sizeBadge) sizeBadge.style.display = "none";
      if (sizeRow) sizeRow.style.display = "none";
    }

    // Selected Fragrance
    const fragRow = document.getElementById("spec-fragrance-row");
    const fragVal = document.getElementById("spec-fragrance");
    if (product.fragrance) {
      if (fragRow) fragRow.style.display = "flex";
      if (fragVal) fragVal.textContent = product.fragrance;
    } else {
      if (fragRow) fragRow.style.display = "none";
    }

    // Wishlist Action Toggle
    const detailWishlistBtn = document.getElementById("detail-wishlist-btn");
    if (detailWishlistBtn && typeof WishlistStorage !== "undefined") {
      const isWished = WishlistStorage.has(product.id);
      detailWishlistBtn.classList.toggle("active", isWished);
    }
    
    // Related Products Grid
    const relatedGrid = document.querySelector(".related-grid");
    if (relatedGrid && typeof createProductCardHTML === "function") {
      const related = PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
      relatedGrid.innerHTML = related.map(p => createProductCardHTML(p)).join("");
      
      // Initialize 3D cards tilt if function exists
      if (typeof init3dCards === "function") {
        init3dCards();
      }
    }
  }

  // Initial Render
  renderProduct();

  // Listen for real-time database updates
  document.addEventListener("productsUpdated", renderProduct);

  // Tab navigation triggers
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
  
  // Quantity Selector
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
  
  // Add to Cart Action
  const addToCartBtn = document.getElementById("detail-add-to-cart-btn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      if (typeof PRODUCTS === "undefined") return;
      const product = PRODUCTS.find(p => p.id == productId) || PRODUCTS[0];
      if (product && typeof CartStorage !== "undefined") {
        const qty = parseInt(qtyInput.value) || 1;
        CartStorage.add(product.id, qty);
        if (typeof showToast === "function") {
          showToast(`${qty} x ${product.name} added to cart!`);
        }
      }
    });
  }
  
  // Wishlist Action Toggle Setup
  const detailWishlistBtn = document.getElementById("detail-wishlist-btn");
  if (detailWishlistBtn && typeof WishlistStorage !== "undefined") {
    detailWishlistBtn.addEventListener("click", () => {
      if (typeof PRODUCTS === "undefined") return;
      const product = PRODUCTS.find(p => p.id == productId) || PRODUCTS[0];
      if (!product) return;
      const added = WishlistStorage.toggle(product.id);
      detailWishlistBtn.classList.toggle("active", added);
      if (typeof showToast === "function") {
        showToast(added ? "Added to wishlist!" : "Removed from wishlist.");
      }
    });
  }
});

// Image Gallery Swap function
window.swapMainImage = function(src, thumbElement) {
  const mainImg = document.getElementById("main-product-img");
  if (mainImg) {
    mainImg.src = src;
    const thumbs = document.querySelectorAll(".thumbnail");
    thumbs.forEach(t => t.classList.remove("active"));
    thumbElement.classList.add("active");
  }
};

// Customer Reviews Logic
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id") || 1;
  const reviewsList = document.getElementById("reviews-list");
  const reviewForm = document.getElementById("submit-review-form");
  const reviewMsg = document.getElementById("review-msg");

  function renderReviews(reviewsObj) {
    if (!reviewsList) return;
    reviewsList.innerHTML = "";
    if (!reviewsObj || Object.keys(reviewsObj).length === 0) {
      reviewsList.innerHTML = "<p>No reviews yet. Be the first to review this candle!</p>";
      return;
    }

    const reviews = Object.values(reviewsObj).sort((a, b) => b.timestamp - a.timestamp);
    
    reviewsList.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-header">
          <span class="review-author">${r.name}</span>
          <span class="review-date">${new Date(r.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="review-stars">
          ${Array(5).fill(0).map((_, i) => `<i class="bi bi-star${i < r.rating ? '-fill' : ''}"></i>`).join('')}
        </div>
        <div class="review-text">${r.text}</div>
      </div>
    `).join("");
  }

  function loadReviews() {
    if (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
      db.ref("product_reviews/" + productId).on("value", snap => {
        renderReviews(snap.val());
      });
    } else {
      const mock = JSON.parse(localStorage.getItem("ss_mock_reviews") || "{}");
      renderReviews(mock[productId]);
    }
  }

  // Load reviews on Firebase initialization
  const fbCheck = setInterval(() => {
    if (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
      clearInterval(fbCheck);
      loadReviews();
    }
  }, 100);

  // Fallback clear
  setTimeout(() => { clearInterval(fbCheck); loadReviews(); }, 3000);

  if (reviewForm) {
    reviewForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("review-name").value.trim();
      const rating = parseInt(document.getElementById("review-rating").value);
      const text = document.getElementById("review-text").value.trim();
      
      if (!name || !rating || !text) {
        reviewMsg.textContent = "Please fill in all fields.";
        reviewMsg.style.color = "var(--color-danger)";
        return;
      }

      const reviewData = {
        name,
        rating,
        text,
        timestamp: Date.now()
      };

      reviewMsg.textContent = "Submitting review...";
      reviewMsg.style.color = "var(--color-muted-gray)";

      if (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized) {
        db.ref("product_reviews/" + productId).push(reviewData).then(() => {
          reviewForm.reset();
          reviewMsg.textContent = "Thank you for your review!";
          reviewMsg.style.color = "var(--color-success)";
          setTimeout(() => reviewMsg.textContent = "", 3000);
        }).catch(() => {
          reviewMsg.textContent = "Failed to submit review. Try again.";
          reviewMsg.style.color = "var(--color-danger)";
        });
      } else {
        const mock = JSON.parse(localStorage.getItem("ss_mock_reviews") || "{}");
        if (!mock[productId]) mock[productId] = {};
        mock[productId]["mock_" + Date.now()] = reviewData;
        localStorage.setItem("ss_mock_reviews", JSON.stringify(mock));
        reviewForm.reset();
        reviewMsg.textContent = "Thank you for your review!";
        reviewMsg.style.color = "var(--color-success)";
        setTimeout(() => reviewMsg.textContent = "", 3000);
        loadReviews();
      }
    });
  }
});
