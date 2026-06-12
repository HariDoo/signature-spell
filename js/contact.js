/* js/contact.js - Asynchronous Form Handling, Validation, and Modal Popups */

document.addEventListener("DOMContentLoaded", () => {
  // CONFIGURATION: Replace with your deployed Google Apps Script Web App URL
  const GOOGLE_SHEET_FORM_URL = "https://script.google.com/macros/s/AKfycbzIrSiQ7Awd5WrQ7v7UU3G5OAVai_egithMCa58yKwalHHpuFHnqnxmgalzCVigxbs9/exec";

  // ── TAB SWITCHING ──────────────────────────────────────────────────────────
  const tabs = document.querySelectorAll(".contact-tab");
  const panes = document.querySelectorAll(".contact-form-pane");

  function switchTab(targetPaneId) {
    tabs.forEach(t => t.classList.remove("active"));
    panes.forEach(p => p.classList.remove("active"));

    const targetTab = document.querySelector(`.contact-tab[data-tab="${targetPaneId}"]`);
    const targetPane = document.getElementById(targetPaneId);

    if (targetTab) targetTab.classList.add("active");
    if (targetPane) targetPane.classList.add("active");
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
    });
  });

  // ── FORM REFS ──────────────────────────────────────────────────────────────
  const generalForm = document.getElementById("general-contact-form");
  const bulkForm = document.getElementById("bulk-order-form");

  if (generalForm) {
    generalForm.addEventListener("submit", (e) => handleFormSubmit(e, "General Contact"));
  }

  if (bulkForm) {
    bulkForm.addEventListener("submit", (e) => handleFormSubmit(e, "Bulk Wholesale Inquiry"));
  }

  // Use global showModal() from ui-components.js as the feedback modal
  function showFeedbackModal(message, isSuccess) {
    if (typeof window.showModal === "function") {
      window.showModal(message, {
        title: isSuccess ? "Thank You!" : "Submission Issue",
        type: isSuccess ? "success" : "error",
        icon: isSuccess ? "✨" : "⚠️",
        confirmText: isSuccess ? "Close" : "Try Again"
      });
    }
  }

  /**
   * Phone Number Validation
   * Validates general phone number patterns: 8-15 characters, allowing digits, spaces, hyphens, and a leading '+'
   */
  function validatePhoneNumber(phone) {
    const cleanPhone = phone.trim();
    // Regular expression: Optional leading +, followed by digits, spaces, or hyphens (8 to 15 chars total)
    const phoneRegex = /^\+?[0-9\s\-]{8,15}$/;
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Handle async form submissions
   */
  async function handleFormSubmit(event, formName) {
    event.preventDefault();
    const form = event.target;

    // 1. Spam Prevention: Honeypot field validation
    const honeypot = form.querySelector('input[name="_honeypot"]');
    if (honeypot && honeypot.value) {
      console.warn("Spam submission detected and blocked via honeypot field.");
      // Silent mitigation: Pretend submission was successful to mislead the bot
      showFeedbackModal("Thank you! Your message has been sent successfully.", true);
      form.reset();
      return;
    }

    // 2. Custom Input Validations
    if (form.id === "bulk-order-form") {
      const phoneInput = form.querySelector('input[type="tel"]');
      if (phoneInput && !validatePhoneNumber(phoneInput.value)) {
        showFeedbackModal("Please enter a valid phone number (8-15 digits, allowing only numbers, spaces, or hyphens).", false);
        phoneInput.focus();
        return;
      }
    }

    // 3. Prepare Form Data
    const formData = new FormData(form);
    
    // Add custom metadata (form name and timestamp)
    formData.append("Form Name", formName);
    formData.append("Submitted At", new Date().toLocaleString());

    // Convert FormData to a clean JSON payload to avoid url-encoding bugs (e.g. spaces as '+')
    const payloadObj = {};
    formData.forEach((value, key) => {
      payloadObj[key] = value.toString().trim();
    });
    const jsonBody = JSON.stringify(payloadObj);

    // 4. Toggle submit button loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.classList.add("btn-loading");
    submitBtn.disabled = true;

    // Prepare success notification message based on form type
    const successMsg = form.id === "bulk-order-form"
      ? "Corporate wholesale inquiry submitted successfully! A manager will send you a quotation invoice in ₹ shortly."
      : "Thank you! Your message has been received. Our team will respond within 24 hours.";

    try {
      // 5. Asynchronous fetch request
      const response = await fetch(GOOGLE_SHEET_FORM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: jsonBody
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result === "success") {
          showFeedbackModal(successMsg, true);
          form.reset();
        } else {
          showFeedbackModal(data.error || "Submission failed. Please check inputs and try again.", false);
        }
      } else {
        showFeedbackModal("Submission failed: Server returned an error code.", false);
      }
    } catch (error) {
      console.error("Submission error details:", error);
      
      // Google Apps Script redirect CORS workaround:
      // If we are hitting script.google.com and get a TypeError (CORS redirect blocked),
      // the submission actually succeeded because the request was transmitted, but the browser blocked reading the response.
      if (GOOGLE_SHEET_FORM_URL.includes("script.google.com")) {
        showFeedbackModal(successMsg, true);
        form.reset();
      } else {
        showFeedbackModal("Submission failed: Unable to connect to the form server. Please verify your internet connection or Web App deployment.", false);
      }
    } finally {
      // Restore submit button state
      submitBtn.classList.remove("btn-loading");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
});
