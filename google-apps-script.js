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
    const senderName  = payload["name"]         || payload["contactPerson"] || "N/A";
    const senderEmail = payload["email"]        || "";

    // ── 1. Write to Google Sheet ──────────────────────────────────────────────
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Auto-create header row if the sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Form", "Name", "Email", "Phone",
        "Company", "Product Interest", "Quantity", "Message"
      ]);
      // Bold the header row
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold");
    }

    // Append a data row
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

    // ── 2. Send Admin Notification Email ─────────────────────────────────────
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

    // ── 3. Send Confirmation Email to Submitter ───────────────────────────────
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

    // ── 4. Return success response ────────────────────────────────────────────
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
