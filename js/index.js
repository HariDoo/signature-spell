/* js/index.js - Homepage specific scripts */

document.addEventListener("DOMContentLoaded", () => {
  const featuredGrid = document.querySelector(".featured-grid");
  
  function renderFeatured() {
    if (featuredGrid && typeof PRODUCTS !== "undefined") {
      const featuredIds = [1, 5, 7, 8];
      const featuredProducts = PRODUCTS.filter(p => featuredIds.includes(Number(p.id)));
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
