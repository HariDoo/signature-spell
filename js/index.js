/* js/index.js - Homepage specific scripts */

document.addEventListener("DOMContentLoaded", () => {
  const featuredGrid = document.querySelector(".featured-grid");
  
  function renderFeatured() {
    if (featuredGrid && typeof PRODUCTS !== "undefined") {
      // Pick the first 4 products dynamically to avoid missing items
      const featuredProducts = PRODUCTS.slice(0, 4);
      if (typeof createProductCardHTML === "function") {
        featuredGrid.innerHTML = featuredProducts.map(p => createProductCardHTML(p)).join("");
      }
    }
  }

  renderFeatured();

  document.addEventListener("productsUpdated", () => {
    renderFeatured();
  });
});
