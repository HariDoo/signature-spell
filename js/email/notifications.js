"use strict";

(function() {
  const EMAIL_ENDPOINT = "https://script.google.com/macros/s/AKfycbzIrSiQ7Awd5WrQ7v7UU3G5OAVai_egithMCa58yKwalHHpuFHnqnxmgalzCVigxbs9/exec";

  function postJson(payload, useBeacon) {
    const body = JSON.stringify(payload || {});

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const queued = navigator.sendBeacon(EMAIL_ENDPOINT, blob);
      if (queued) {
        return Promise.resolve({ ok: true, beacon: true });
      }
    }

    return fetch(EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: body,
      keepalive: true,
      mode: "no-cors"
    }).then(function() {
      // no-cors responses are opaque; reaching this point means request was dispatched.
      return { ok: true, transport: "fetch-no-cors" };
    }).catch(function(err) {
      console.error("Email notification request failed:", err);
      return { ok: false, error: err && err.message ? err.message : String(err) };
    });
  }

  async function fetchOrderFromDb(orderId) {
    const firebaseReady = (typeof isFirebaseInitialized !== "undefined" && isFirebaseInitialized === true);
    if (!orderId || typeof db === "undefined" || !firebaseReady) {
      return null;
    }

    try {
      const snapshot = await db.ref("orders/" + orderId).once("value");
      const order = snapshot.val();
      if (!order) return null;
      return { id: orderId, ...order };
    } catch (err) {
      console.error("Unable to load order from DB:", err);
      return null;
    }
  }

  function getCurrentAdminEmail() {
    try {
      if (typeof auth !== "undefined" && auth.currentUser && auth.currentUser.email) {
        return auth.currentUser.email;
      }
      if (typeof UserSession !== "undefined" && typeof UserSession.get === "function") {
        const user = UserSession.get();
        return user && user.email ? user.email : "";
      }
    } catch (err) {
      console.error(err);
    }
    return "";
  }

  const EmailNotificationService = {
    endpoint: EMAIL_ENDPOINT,

    notifyOrderStatusUpdate: async function(orderId, newStatus, previousStatus) {
      const order = await fetchOrderFromDb(orderId);
      if (!order || !order.email) {
        return { ok: false, skipped: true, reason: "Missing order or customer email" };
      }

      return postJson({
        action: "order_status_update",
        orderId: orderId,
        previousStatus: previousStatus || order.status || "Confirmed",
        newStatus: newStatus,
        updatedAt: new Date().toISOString(),
        adminEmail: getCurrentAdminEmail(),
        order: order
      });
    },

    queueAbandonedCartReminder: function(cartPayload, useBeacon) {
      return postJson({
        action: "abandoned_cart_event",
        createdAt: new Date().toISOString(),
        payload: cartPayload || {}
      }, !!useBeacon);
    }
  };

  window.EmailNotificationService = EmailNotificationService;
})();
