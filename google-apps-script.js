/**
 * SIGNATURE SPELL - Google Apps Script
 * Handles contact form submissions:
 *   1. Saves data to the connected Google Sheet
 *   2. Sends email notification to admin addresses
 *   3. Sends confirmation email to the submitter
 *
 * HOW TO DEPLOY:
 *   1. Go to https://script.google.com and open your project
 *   2. Replace ALL existing code with this file's content
 *   3. Click "Deploy" → "Manage Deployments" → Edit the existing deployment
 *   4. Set "Who has access" to "Anyone" (not "Anyone with Google Account")
 *   5. Click "Deploy" and copy the new Web App URL
 *   6. Update GOOGLE_SHEET_FORM_URL in js/contact.js with the new URL
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

/** Admin email addresses that will receive every form submission notification */
const ADMIN_EMAILS = ["harido2580@gmail.com", "nandheswara21@gmail.com"];

/** Name that appears in the "From" field of notification emails */
const BRAND_NAME = "Signature Spell";

/** Reply-to address shown in notification emails */
const BRAND_EMAIL = "hello@signaturespell.com";

// ─── MAIN HANDLERS ────────────────────────────────────────────────────────────

/**
 * doPost — triggered when the frontend submits a form via fetch() POST
 * Accepts JSON body with all form field key-value pairs.
 */
function doPost(e) {
  try {
    // Parse the incoming JSON body
    const payload = JSON.parse(e.postData.contents);

    // Extract common fields
    const formName    = payload["Form Name"]    || "Unknown Form";
    const submittedAt = payload["Submitted At"] || new Date().toLocaleString();

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (formName === "Order Placement") {
      // ── ORDER PLACEMENT FLOW ─────────────────────────────────────────────────
      const orderId     = payload["id"]       || "N/A";
      const customerName = payload["customer"] || "N/A";
      const customerEmail = payload["email"]    || "";
      const customerPhone = payload["phone"]    || "N/A";
      const address     = payload["address"]  || "N/A";
      const subtotal    = payload["subtotal"] || 0;
      const tax         = payload["tax"]      || 0;
      const shipping    = payload["shipping"] || 0;
      const total       = payload["total"]    || 0;
      const status      = payload["status"]   || "Confirmed";

      // Format items list for a single sheet cell (e.g. "Candle A (x2), Candle B (x1)")
      const itemsList = (payload["items"] || [])
        .map(item => `${item.name} (x${item.qty})`)
        .join(", ");

      // Get or create "Orders" sheet
      let sheet = ss.getSheetByName("Orders");
      if (!sheet) {
        sheet = ss.insertSheet("Orders");
      }

      // Auto-create header row if the sheet is empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "Order ID", "Timestamp", "Customer Name", "Email", "Phone",
          "Shipping Address", "Items", "Subtotal (₹)", "Tax (₹)", "Shipping (₹)", "Total (₹)", "Status"
        ]);
        sheet.getRange(1, 1, 1, 12).setFontWeight("bold");
      }

      // Append order data row
      sheet.appendRow([
        orderId,
        submittedAt,
        customerName,
        customerEmail,
        customerPhone,
        address,
        itemsList,
        subtotal,
        tax,
        shipping,
        total,
        status
      ]);

      // Send Admin Notification Email
      const adminSubject = `[${BRAND_NAME}] New Order ${orderId} placed by ${customerName}`;
      const adminBody    = buildOrderAdminEmailBody(payload, submittedAt);

      ADMIN_EMAILS.forEach(adminEmail => {
        MailApp.sendEmail({
          to:       adminEmail,
          subject:  adminSubject,
          htmlBody: adminBody,
          replyTo:  customerEmail || BRAND_EMAIL
        });
      });

      // Send Confirmation Email to Customer
      if (customerEmail) {
        const confirmSubject = `Your Order Receipt ${orderId} — ${BRAND_NAME}`;
        const confirmBody    = buildOrderCustomerEmailBody(payload, submittedAt);

        MailApp.sendEmail({
          to:       customerEmail,
          subject:  confirmSubject,
          htmlBody: confirmBody,
          replyTo:  BRAND_EMAIL,
          name:     BRAND_NAME
        });
      }

    } else {
      // ── STANDARD CONTACT FORM FLOW ───────────────────────────────────────────
      const senderName  = payload["name"]         || payload["contactPerson"] || "N/A";
      const senderEmail = payload["email"]        || "";

      // Get or create "Contact Submissions" sheet
      let sheet = ss.getSheetByName("Contact Submissions");
      if (!sheet) {
        // Fallback to active sheet if it's the default and empty, otherwise create new tab
        const activeSheet = ss.getActiveSheet();
        if (activeSheet.getLastRow() === 0 && activeSheet.getName() === "Sheet1") {
          sheet = activeSheet;
          sheet.setName("Contact Submissions");
        } else {
          sheet = ss.insertSheet("Contact Submissions");
        }
      }

      // Auto-create header row if the sheet is empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          "Timestamp", "Form", "Name", "Email", "Phone",
          "Company", "Product Interest", "Quantity", "Message"
        ]);
        sheet.getRange(1, 1, 1, 9).setFontWeight("bold");
      }

      // Append data row
      sheet.appendRow([
        submittedAt,
        formName,
        senderName,
        senderEmail,
        payload["phone"]     || "",
        payload["company"]   || "",
        payload["product"]   || "",
        payload["quantity"]  || "",
        payload["message"]   || ""
      ]);

      // Send Admin Notification Email
      const adminSubject = `[${BRAND_NAME}] New ${formName} from ${senderName}`;
      const adminBody    = buildAdminEmailBody(payload, formName, submittedAt);

      ADMIN_EMAILS.forEach(adminEmail => {
        MailApp.sendEmail({
          to:       adminEmail,
          subject:  adminSubject,
          htmlBody: adminBody,
          replyTo:  senderEmail || BRAND_EMAIL
        });
      });

      // Send Confirmation Email to Submitter
      if (senderEmail) {
        const confirmSubject = `We received your message — ${BRAND_NAME}`;
        const confirmBody    = buildConfirmationEmailBody(senderName, formName);

        MailApp.sendEmail({
          to:       senderEmail,
          subject:  confirmSubject,
          htmlBody: confirmBody,
          replyTo:  BRAND_EMAIL,
          name:     BRAND_NAME
        });
      }
    }

    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return error details for debugging
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doGet — simple health check endpoint (also prevents "doGet not found" errors)
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", service: "Signature Spell Form Handler" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── EMAIL TEMPLATE BUILDERS ──────────────────────────────────────────────────

/**
 * Builds the HTML email body sent to admins for new orders.
 */
function buildOrderAdminEmailBody(payload, submittedAt) {
  let itemRows = "";
  (payload.items || []).forEach(item => {
    itemRows += `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #e7e5e4; color:#1c1917; font-size:14px;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 0; border-bottom:1px solid #e7e5e4; color:#78716c; font-size:14px; text-align:center;">x${item.qty}</td>
      </tr>`;
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f5f4;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;max-width:600px;">
            <tr>
              <td style="background:#1c1917;padding:24px 32px;text-align:center;">
                <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                  Signature <span style="color:#d97706;">Spell</span>
                </span>
                <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">New Order Received</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <h3 style="margin:0 0 16px;font-family:Georgia,serif;font-size:18px;color:#1c1917;font-weight:normal;">Order Details - ID: ${escapeHtml(payload.id)}</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px; font-size:14px; color:#292524;">
                  <tr><td style="padding:4px 0;font-weight:600;width:120px;">Customer:</td><td style="padding:4px 0;">${escapeHtml(payload.customer)}</td></tr>
                  <tr><td style="padding:4px 0;font-weight:600;">Email:</td><td style="padding:4px 0;">${escapeHtml(payload.email)}</td></tr>
                  <tr><td style="padding:4px 0;font-weight:600;">Phone:</td><td style="padding:4px 0;">${escapeHtml(payload.phone)}</td></tr>
                  <tr><td style="padding:4px 0;font-weight:600;">Address:</td><td style="padding:4px 0;">${escapeHtml(payload.address)}</td></tr>
                  <tr><td style="padding:4px 0;font-weight:600;">Date:</td><td style="padding:4px 0;">${escapeHtml(submittedAt)}</td></tr>
                </table>

                <h4 style="margin:20px 0 8px;font-family:Georgia,serif;font-size:15px;color:#1c1917;border-bottom:2px solid #1c1917;padding-bottom:6px;">Items Purchased</h4>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                  <thead>
                    <tr>
                      <th align="left" style="padding-bottom:8px; font-size:12px; text-transform:uppercase; color:#78716c; border-bottom:1px solid #e7e5e4;">Product</th>
                      <th align="center" style="padding-bottom:8px; font-size:12px; text-transform:uppercase; color:#78716c; border-bottom:1px solid #e7e5e4; width:60px;">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#1c1917; margin-top:20px;">
                  <tr><td style="padding:4px 0;text-align:right;">Subtotal:</td><td style="padding:4px 0 4px 20px;text-align:right;width:100px;">₹${Number(payload.subtotal).toFixed(2)}</td></tr>
                  <tr><td style="padding:4px 0;text-align:right;">Tax (18% GST):</td><td style="padding:4px 0 4px 20px;text-align:right;">₹${Number(payload.tax).toFixed(2)}</td></tr>
                  <tr><td style="padding:4px 0;text-align:right;">Shipping:</td><td style="padding:4px 0 4px 20px;text-align:right;">₹${Number(payload.shipping).toFixed(2)}</td></tr>
                  <tr style="font-weight:700;font-size:16px;"><td style="padding:10px 0 0;text-align:right;border-top:1px solid #e7e5e4;">Total:</td><td style="padding:10px 0 0 20px;text-align:right;border-top:1px solid #e7e5e4;color:#d97706;">₹${Number(payload.total).toFixed(2)}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#fafaf9;padding:16px 32px;border-top:1px solid #e7e5e4;text-align:center;">
                <p style="margin:0;font-size:11px;color:#78716c;">Automated Order Alert from Signature Spell E-Commerce Store.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;
}

/**
 * Builds the HTML receipt confirmation email sent to the customer.
 */
function buildOrderCustomerEmailBody(payload, submittedAt) {
  let itemRows = "";
  (payload.items || []).forEach(item => {
    itemRows += `
      <tr>
        <td style="padding:12px 0; border-bottom:1px solid #e7e5e4; color:#1c1917; font-size:14px;">
          <span style="font-weight:600;display:block;">${escapeHtml(item.name)}</span>
        </td>
        <td style="padding:12px 0; border-bottom:1px solid #e7e5e4; color:#78716c; font-size:14px; text-align:center;">x${item.qty}</td>
      </tr>`;
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f5f4;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;max-width:600px;">
            <tr>
              <td style="background:#1c1917;padding:32px;text-align:center;">
                <span style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                  Signature <span style="color:#d97706;">Spell</span>
                </span>
                <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Luxury Hand-Poured Soy Candles</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 24px;text-align:center;">
                <div style="font-size:40px;margin-bottom:16px;">🕯️</div>
                <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1c1917;">Thank You for Your Order!</h2>
                <p style="margin:0;font-size:15px;color:#78716c;line-height:1.6;max-width:440px;margin:0 auto;">
                  We have received order <strong>${escapeHtml(payload.id)}</strong> and are preparing it with love.
                </p>
              </td>
            </tr>
            <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e7e5e4;margin:0;"></td></tr>
            <tr>
              <td style="padding:24px 40px;">
                <h3 style="margin:0 0 12px;font-family:Georgia,serif;font-size:16px;color:#1c1917;">Shipping Summary</h3>
                <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.6;">
                  <strong>Deliver To:</strong> ${escapeHtml(payload.customer)}<br>
                  <strong>Address:</strong> ${escapeHtml(payload.address)}<br>
                  <strong>Contact:</strong> ${escapeHtml(payload.phone)}
                </p>

                <h3 style="margin:20px 0 8px;font-family:Georgia,serif;font-size:16px;color:#1c1917;">Order Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                  <thead>
                    <tr>
                      <th align="left" style="padding-bottom:8px; font-size:12px; text-transform:uppercase; color:#78716c; border-bottom:1px solid #e7e5e4;">Product</th>
                      <th align="center" style="padding-bottom:8px; font-size:12px; text-transform:uppercase; color:#78716c; border-bottom:1px solid #e7e5e4; width:60px;">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#1c1917;">
                  <tr><td style="padding:4px 0;text-align:right;">Subtotal:</td><td style="padding:4px 0 4px 20px;text-align:right;width:100px;">₹${Number(payload.subtotal).toFixed(2)}</td></tr>
                  <tr><td style="padding:4px 0;text-align:right;">Tax (18% GST):</td><td style="padding:4px 0 4px 20px;text-align:right;">₹${Number(payload.tax).toFixed(2)}</td></tr>
                  <tr><td style="padding:4px 0;text-align:right;">Shipping:</td><td style="padding:4px 0 4px 20px;text-align:right;">₹${Number(payload.shipping).toFixed(2)}</td></tr>
                  <tr style="font-weight:700;font-size:16px;"><td style="padding:10px 0 0;text-align:right;border-top:1px solid #e7e5e4;">Grand Total:</td><td style="padding:10px 0 0 20px;text-align:right;border-top:1px solid #e7e5e4;color:#d97706;">₹${Number(payload.total).toFixed(2)}</td></tr>
                </table>
              </td>
            </tr>
            <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e7e5e4;margin:0;"></td></tr>
            <tr>
              <td style="padding:28px 40px;text-align:center;">
                <p style="margin:0 0 16px;font-size:13px;color:#78716c;">You can track your order status live anytime using our website tracker.</p>
                <a href="https://signature-spell.com/order-tracking.html" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:30px;">
                  Track Order
                </a>
              </td>
            </tr>
            <tr>
              <td style="background:#fafaf9;padding:20px 40px;border-top:1px solid #e7e5e4;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;color:#78716c;">© 2026 Signature Spell Candles · All rights reserved</p>
                <p style="margin:0;font-size:11px;color:#a8a29e;">Need help? Contact us at hello@signaturespell.com</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;
}

/**
 * Builds the HTML email body sent to admins for each submission.
 */
function buildAdminEmailBody(payload, formName, submittedAt) {
  // Build a table of all submitted fields
  let fieldRows = "";
  const skip = ["Form Name", "Submitted At", "_honeypot"];
  for (const [key, value] of Object.entries(payload)) {
    if (skip.includes(key) || !value) continue;
    fieldRows += `
      <tr>
        <td style="padding:8px 12px; font-weight:600; background:#fafaf9; border-bottom:1px solid #e7e5e4; width:160px; color:#1c1917; font-size:13px; white-space:nowrap;">${escapeHtml(key)}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #e7e5e4; color:#292524; font-size:13px;">${escapeHtml(String(value))}</td>
      </tr>`;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f5f4;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;max-width:600px;">

            <!-- Header -->
            <tr>
              <td style="background:#1c1917;padding:24px 32px;text-align:center;">
                <span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                  Signature <span style="color:#d97706;">Spell</span>
                </span>
                <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;">New Form Submission</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 20px;font-size:15px;color:#1c1917;">
                  A new <strong>${escapeHtml(formName)}</strong> was submitted on <strong>${escapeHtml(submittedAt)}</strong>.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;">
                  ${fieldRows}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#fafaf9;padding:16px 32px;border-top:1px solid #e7e5e4;text-align:center;">
                <p style="margin:0;font-size:11px;color:#78716c;">This is an automated notification from the Signature Spell website contact form.</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>`;
}

/**
 * Builds the HTML confirmation email sent to the person who submitted the form.
 */
function buildConfirmationEmailBody(name, formName) {
  const isBulk = formName.toLowerCase().includes("bulk") || formName.toLowerCase().includes("wholesale");

  const bodyMessage = isBulk
    ? `Thank you for your wholesale inquiry! Our team will review your request and send you a detailed quotation in <strong>₹ (INR)</strong> within <strong>1–2 business days</strong>.`
    : `Thank you for reaching out! Our team has received your message and will get back to you within <strong>24 hours</strong>.`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f5f4;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:4px;overflow:hidden;max-width:600px;">

            <!-- Header -->
            <tr>
              <td style="background:#1c1917;padding:32px;text-align:center;">
                <span style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:2px;">
                  Signature <span style="color:#d97706;">Spell</span>
                </span>
                <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Luxury Hand-Poured Soy Candles</p>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding:36px 40px 24px;text-align:center;">
                <div style="font-size:40px;margin-bottom:16px;">✨</div>
                <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;font-weight:400;color:#1c1917;">Thank You, ${escapeHtml(name)}!</h2>
                <p style="margin:0;font-size:15px;color:#78716c;line-height:1.7;max-width:440px;margin:0 auto;">${bodyMessage}</p>
              </td>
            </tr>

            <!-- Divider -->
            <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e7e5e4;margin:0;"></td></tr>

            <!-- CTA -->
            <tr>
              <td style="padding:28px 40px;text-align:center;">
                <p style="margin:0 0 20px;font-size:14px;color:#78716c;">While you wait, explore our latest scent collection:</p>
                <a href="https://signature-spell.com/shop.html" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-radius:30px;">
                  Browse Candles
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#fafaf9;padding:20px 40px;border-top:1px solid #e7e5e4;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;color:#78716c;">© 2026 Signature Spell Candles · All rights reserved</p>
                <p style="margin:0;font-size:11px;color:#a8a29e;">This email was sent because you submitted a contact form on our website.</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>`;
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────

/** Escapes HTML special characters to prevent injection in email bodies */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
