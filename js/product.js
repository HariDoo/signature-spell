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
        <div class="thumbnail" onclick="swapMainImage('assets/large-jar-jasmine.png', this)"><img src="assets/large-jar-jasmine.png" alt="Mood Candle Ambient"></div>
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
