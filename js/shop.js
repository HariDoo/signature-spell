/* js/shop.js - Shop catalog filtering, searching, and sorting */

document.addEventListener("DOMContentLoaded", () => {
  const shopGrid = document.querySelector(".shop-grid");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const sortSelect = document.querySelector(".sort-select");
  const pageBreadcrumb = document.querySelector(".breadcrumbs span");
  
  if (!shopGrid) return;
  
  const urlParams = new URLSearchParams(window.location.search);
  let activeSearch = urlParams.get("search") || "";
  
  // Read filter from sessionStorage or URL query parameter fallback
  const sessionFilter = sessionStorage.getItem("selected_shop_filter");
  let activeFilter = (urlParams.get("filter") === "wishlist" || sessionFilter === "wishlist") ? "Wishlist" : "All";
  let activeSort = "default";
  
  if (activeSearch) {
    if (pageBreadcrumb) {
      pageBreadcrumb.textContent = `Search results for: "${activeSearch}"`;
    }
  } else if (activeFilter === "Wishlist") {
    if (pageBreadcrumb) {
      pageBreadcrumb.textContent = "My Wishlist";
    }
    const wishFilterBtn = Array.from(filterBtns).find(btn => btn.dataset.filter === "Wishlist");
    if (wishFilterBtn) {
      filterBtns.forEach(b => b.classList.remove("active"));
      wishFilterBtn.classList.add("active");
    }
  }

  function renderShop() {
    if (typeof PRODUCTS === "undefined") return;
    let filtered = PRODUCTS;
    
    // 1. Search Query Match
    if (activeSearch) {
      filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(activeSearch.toLowerCase()) || p.description.toLowerCase().includes(activeSearch.toLowerCase()));
    }
    
    // 2. Category/Wishlist Filter
    if (activeFilter === "Wishlist") {
      if (typeof WishlistStorage !== "undefined") {
        const wishes = WishlistStorage.get();
        filtered = filtered.filter(p => wishes.includes(p.id));
      }
    } else if (activeFilter !== "All") {
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
      if (activeFilter === "Wishlist") {
        shopGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
            <h3 style="font-family: var(--font-heading); font-size: 1.8rem; margin-bottom: 12px; font-weight: 400;">Your wishlist is empty</h3>
            <p style="color: var(--color-muted-gray); margin-bottom: 24px;">Explore our catalog of premium hand-poured scents and add your favorites!</p>
            <a href="shop.html" class="btn btn-primary">Browse Scents</a>
          </div>
        `;
      } else {
        shopGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
            <h3 style="font-family: var(--font-heading); font-size: 1.8rem; margin-bottom: 12px; font-weight: 400;">No fragrances match your search</h3>
            <p style="color: var(--color-muted-gray); margin-bottom: 24px;">Try searching for elements like 'T-Light', 'Glass', 'Coconut', or 'Oudh'.</p>
            <a href="shop.html" class="btn btn-primary">View All Scents</a>
          </div>
        `;
      }
    } else if (typeof createProductCardHTML === "function") {
      shopGrid.innerHTML = filtered.map(p => createProductCardHTML(p)).join("");
    }
  }
  
  // Filter Event Listeners
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      activeSearch = "";
      // Clear session filter when manually clicking tabs
      sessionStorage.removeItem("selected_shop_filter");
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

  // Listen to product database updates
  document.addEventListener("productsUpdated", () => {
    renderShop();
  });
});
