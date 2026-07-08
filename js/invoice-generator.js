/**
 * Signature Spell - Invoice PDF Generator Utility
 * 
 * Dynamically loads html2pdf.js from CDN and exports order information
 * as a standard, beautifully styled GST Tax Invoice.
 */

"use strict";

(function() {
  // Helper to load html2pdf.js dynamically if not already loaded
  function loadHtml2Pdf() {
    return new Promise((resolve, reject) => {
      if (typeof html2pdf !== "undefined") {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load html2pdf.js library."));
      document.head.appendChild(script);
    });
  }

  // Formatting date helper
  function formatDate(dateStr) {
    if (!dateStr) return new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' });
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Core generation function
  async function downloadOrderInvoice(order) {
    if (!order) {
      console.error("No order provided to invoice generator.");
      return;
    }

    try {
      // Ensure local or session toast/modal systems are available to update the user
      if (typeof showToast === "function") {
        showToast("Generating PDF invoice...", "info");
      }

      await loadHtml2Pdf();

      // Determine place of supply and GST breakdown based on state (Karnataka)
      const isKarnataka = order.address && order.address.toLowerCase().includes("karnataka");
      const gstRate = 18;
      
      // Values extraction & fallback calculations
      const subtotal = Number(order.subtotal || 0);
      const tax = Number(order.tax || (subtotal * 0.18));
      const shipping = Number(order.shipping || 0);
      const total = Number(order.total || (subtotal + tax + shipping));

      // Calculate discount if it was applied at checkout
      const expectedTotal = subtotal + tax + shipping;
      const discount = expectedTotal - total;
      const hasDiscount = discount > 0.05;

      // Map line items and calculate itemized unit prices
      const itemsList = order.items || [];
      let itemRows = "";
      
      itemsList.forEach((item, index) => {
        // Try finding matching product in global PRODUCTS registry
        const catalogProducts = (typeof PRODUCTS !== "undefined") ? PRODUCTS : (window.PRODUCTS || (typeof DEFAULT_PRODUCTS !== "undefined" ? DEFAULT_PRODUCTS : []));
        const matchedProduct = catalogProducts.find(p => 
          (item.id && String(p.id) === String(item.id)) || 
          (item.productId && String(p.id) === String(item.productId)) || 
          p.name === item.name || 
          (item.name && item.name.includes(p.name))
        );
        
        let unitPrice = 0;
        if (matchedProduct) {
          unitPrice = Number(matchedProduct.price);
        } else if (item.price) {
          unitPrice = Number(item.price);
        } else {
          // Estimate from subtotal divided by quantity
          const totalQty = itemsList.reduce((acc, it) => acc + (Number(it.qty) || 1), 0) || 1;
          unitPrice = Math.round(subtotal / totalQty);
        }
        
        const itemQty = Number(item.qty || 1);
        const itemTotal = unitPrice * itemQty;
        const slNo = index + 1;
        
        itemRows += `
          <tr style="border-bottom: 1px solid #e7e5e4;">
            <td style="padding: 10px; text-align: center;">${slNo}</td>
            <td style="padding: 10px; font-weight: 500; color: #1c1917;">
              ${item.name}
              ${item.fragrance ? `<br><span style="font-size: 11px; color: #78716c; font-style: italic;">Fragrance: ${item.fragrance}</span>` : ""}
            </td>
            <td style="padding: 10px; text-align: center;">${itemQty}</td>
            <td style="padding: 10px; text-align: right;">₹${unitPrice.toFixed(2)}</td>
            <td style="padding: 10px; text-align: right;">₹${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      });

      // Construct GST details display
      let gstTotalsHTML = "";
      if (isKarnataka) {
        const halfTax = tax / 2;
        gstTotalsHTML = `
          <tr>
            <td style="padding: 4px 0; color: #78716c; text-align: left;">CGST (9%):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">₹${halfTax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #78716c; text-align: left;">SGST (9%):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">₹${halfTax.toFixed(2)}</td>
          </tr>
        `;
      } else {
        gstTotalsHTML = `
          <tr>
            <td style="padding: 4px 0; color: #78716c; text-align: left;">IGST (18%):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">₹${tax.toFixed(2)}</td>
          </tr>
        `;
      }

      // Add carrier & tracking info if available
      const carrierSection = order.carrier ? `
        <div style="margin-top: 15px; border-top: 1px dashed #e7e5e4; padding-top: 10px; font-size: 12px; color: #57534e;">
          <strong>Shipment Carrier:</strong> ${order.carrier}
          ${order.trackingId ? ` &nbsp;|&nbsp; <strong>Tracking ID:</strong> ${order.trackingId}` : ''}
        </div>
      ` : '';

      // Construct HTML structure to parse
      const invoiceHTML = `
        <div style="max-width: 700px; margin: 0 auto; padding: 25px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 20px; color: #444; background-color: #fff;">
          
          <!-- Header (Brand & Title) -->
          <table style="width: 100%; border-bottom: 2px solid #1c1917; padding-bottom: 20px; margin-bottom: 25px;">
            <tr>
              <td style="vertical-align: top;">
                <span style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #1c1917; letter-spacing: 1px;">
                  Signature <span style="color: #d97706;">Spell</span>
                </span>
                <div style="font-size: 10px; color: #78716c; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 5px;">
                  Luxury Hand-Poured Soy Candles
                </div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <span style="font-size: 20px; font-weight: bold; color: #1c1917; text-transform: uppercase; letter-spacing: 1px;">
                  Tax Invoice
                </span>
                <div style="font-size: 11px; color: #78716c; margin-top: 5px;">
                  Original for Recipient
                </div>
              </td>
            </tr>
          </table>

          <!-- Addresses (Seller & Buyer Info) -->
          <table style="width: 100%; margin-bottom: 30px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 20px; font-size: 12px; line-height: 18px; color: #57534e;">
                <strong style="font-size: 13px; color: #1c1917; display: block; margin-bottom: 5px;">Sold By:</strong>
                <strong>Signature Spell Private Limited</strong><br>
                42 Golden Leaf Road, Indiranagar,<br>
                Bangalore, Karnataka, 560038, India<br>
                <strong>CIN:</strong> U74999KA2023PTC178122<br>
                <strong>GSTIN:</strong> 29AAXCS8108G1ZN<br>
                <strong>Email:</strong> hello@signaturespell.com
              </td>
              <td style="width: 50%; vertical-align: top; text-align: right; font-size: 12px; line-height: 18px; color: #57534e;">
                <strong style="font-size: 13px; color: #1c1917; display: block; margin-bottom: 5px;">Invoice Details:</strong>
                <strong>Invoice / Order ID:</strong> ${order.id}<br>
                <strong>Invoice Date:</strong> ${formatDate(order.date)}
              </td>
            </tr>
          </table>

          <!-- Bill / Ship To -->
          <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
            <strong style="font-size: 13px; color: #1c1917; display: block; margin-bottom: 5px;">Billed & Shipped To:</strong>
            <span style="font-weight: bold; color: #1c1917; font-size: 14px;">${order.customer}</span><br>
            <span style="font-size: 12px; color: #444; display: block; margin: 3px 0 6px 0;">${order.address}</span>
            <strong>Phone:</strong> ${order.phone || "N/A"} &nbsp;|&nbsp; <strong>Email:</strong> ${order.email || "N/A"}
            ${carrierSection}
          </div>

          <!-- Product Listing Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #1c1917; color: #fff; font-weight: bold;">
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; width: 8%; text-align: center;">Sl No.</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; width: 47%; text-align: left;">Item & Description</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; width: 10%; text-align: center;">Qty</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; width: 15%; text-align: right;">Unit Price</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; width: 20%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Totals Breakdown & Jurisdictions -->
          <table style="width: 100%; margin-top: 10px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 30px; font-size: 11px; color: #78716c; line-height: 16px;">
                <strong style="color: #1c1917; display: block; margin-bottom: 5px;">Terms & Conditions:</strong>
                1. All products are hand-poured soy wax candles (HSN 3406).<br>
                2. Goods once sold will not be accepted back or exchanged.<br>
                3. Tax is calculated under reverse charge rules: No.<br>
                4. All disputes are subject to Bangalore jurisdiction.<br>
                <span style="display: block; margin-top: 10px; font-style: italic;">This is a computer-generated document. No physical signature is required.</span>
              </td>
              <td style="width: 50%; vertical-align: top;">
                <table style="width: 100%; font-size: 13px; line-height: 22px;">
                  <tr>
                    <td style="padding: 4px 0; color: #78716c; text-align: left;">Subtotal (Taxable Value):</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600;">₹${subtotal.toFixed(2)}</td>
                  </tr>
                  ${gstTotalsHTML}
                  <tr>
                    <td style="padding: 4px 0; color: #78716c; text-align: left;">Shipping & Delivery:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600;">${shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}</td>
                  </tr>
                  ${hasDiscount ? `
                    <tr style="color: #cf222e;">
                      <td style="padding: 4px 0; text-align: left;">Discount Applied:</td>
                      <td style="padding: 4px 0; text-align: right; font-weight: 600;">-₹${discount.toFixed(2)}</td>
                    </tr>
                  ` : ""}
                  <tr style="font-size: 16px; font-weight: bold; border-top: 1px solid #1c1917;">
                    <td style="padding: 12px 0 0 0; color: #1c1917; text-align: left;">Grand Total:</td>
                    <td style="padding: 12px 0 0 0; text-align: right; color: #d97706;">₹${total.toFixed(2)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Footer Signature Spell note -->
          <div style="margin-top: 60px; border-top: 1px solid #e7e5e4; padding-top: 20px; text-align: center; font-family: Georgia, serif; font-style: italic; color: #78716c; font-size: 14px;">
            Thank you for welcoming Signature Spell into your home!
          </div>

        </div>
      `;

      // Create a temporary outer container for absolute positioning shielding
      const tempOuter = document.createElement("div");
      tempOuter.style.position = "absolute";
      tempOuter.style.top = "0";
      tempOuter.style.left = "0";
      tempOuter.style.width = "100%";
      tempOuter.style.zIndex = "999999";
      tempOuter.style.backgroundColor = "#ffffff";
      tempOuter.style.margin = "0";
      tempOuter.style.padding = "0";
      tempOuter.style.display = "block";

      // Create inner statically-positioned container for clean html2canvas rendering
      const tempInner = document.createElement("div");
      tempInner.style.width = "700px";
      tempInner.style.margin = "0 auto";
      tempInner.style.padding = "0";
      tempInner.style.display = "block";
      tempInner.style.backgroundColor = "#ffffff";
      
      tempInner.innerHTML = invoiceHTML;
      tempOuter.appendChild(tempInner);
      document.body.appendChild(tempOuter);

      // html2pdf configurations
      const options = {
        margin: 10,
        filename: `${order.id}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };

      // Generate and save, targeting the statically positioned inner container, then clean up
      await html2pdf().from(tempInner).set(options).save();
      document.body.removeChild(tempOuter);

      if (typeof showToast === "function") {
        showToast("Invoice downloaded successfully!", "success");
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      if (typeof showModal === "function") {
        showModal(err.message || "An error occurred during invoice download.", { title: "Invoice Download Error", type: "error" });
      } else {
        alert("Failed to download PDF invoice. Please check logs.");
      }
    }
  }

  // Export to global window scope
  window.downloadOrderInvoice = downloadOrderInvoice;
})();
