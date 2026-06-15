"use strict";

let firebaseUser = null;
let userAddresses = [];

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initProfilePage();
  }, 300);
});

function initProfilePage() {
  const loadingState = document.getElementById("profile-loading-state");
  const authRequired = document.getElementById("profile-auth-required");
  const profileWorkspace = document.getElementById("profile-workspace");

  if (typeof firebase !== "undefined" && isFirebaseInitialized) {
    auth.onAuthStateChanged(user => {
      if (user) {
        firebaseUser = user;
        syncUserDbMetadata(user).then(() => {
          if (loadingState) loadingState.style.display = "none";
          if (authRequired) authRequired.style.display = "none";
          if (profileWorkspace) profileWorkspace.style.display = "block";
          populateProfileFields(user);
          populateProviderLinking(user);
          loadUserAddresses(user);
        });
      } else {
        firebaseUser = null;
        if (loadingState) loadingState.style.display = "none";
        if (authRequired) authRequired.style.display = "block";
        if (profileWorkspace) profileWorkspace.style.display = "none";
      }
    });
  } else {
    if (loadingState) loadingState.style.display = "none";
    if (authRequired) authRequired.style.display = "block";
    if (profileWorkspace) profileWorkspace.style.display = "none";
    const alertContainer = document.getElementById("details-alert-container");
    showInlineAlert(alertContainer, "Firebase service not initialized. Please verify configuration.", "danger");
  }
  setupProfileFormBindings();
}

async function syncUserDbMetadata(user) {
  try {
    const userRef = db.ref("users/" + user.uid);
    const snapshot = await userRef.once("value");
    const val = snapshot.val();
    
    const now = Date.now();
    if (!val) {
      await userRef.set({
        email: user.email || "No Email",
        displayName: user.displayName || (user.email ? user.email.split("@")[0] : "User"),
        role: (user.email && (user.email === "nandheswara21@gmail.com" || user.email === "admin@signaturespell.com")) ? "admin" : "user",
        status: "active",
        createdAt: now,
        lastActive: now
      });
    } else {
      await userRef.update({
        lastActive: now
      });
    }
  } catch (err) {
    console.error(err);
  }
}

function populateProfileFields(user) {
  const nameInitials = document.getElementById("profile-avatar-initials");
  const summaryName = document.getElementById("summary-display-name");
  const summaryEmail = document.getElementById("summary-email");
  const summaryVerify = document.getElementById("summary-verification-badge");
  const summaryCreated = document.getElementById("summary-created-at");
  const summaryLast = document.getElementById("summary-last-signin");
  
  const nameInput = document.getElementById("profile-name-input");
  const phoneInput = document.getElementById("profile-phone-input");

  const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "User");
  if (summaryName) summaryName.textContent = displayName;
  if (nameInput) nameInput.value = user.displayName || "";
  if (summaryEmail) summaryEmail.textContent = user.email || "No Email";
  
  if (nameInitials) {
    nameInitials.textContent = getInitials(displayName);
  }

  if (summaryVerify) {
    if (user.emailVerified) {
      summaryVerify.textContent = "Verified";
      summaryVerify.className = "badge badge-success";
      const emailStatusDesc = document.getElementById("security-email-status-desc");
      if (emailStatusDesc) emailStatusDesc.textContent = "Your email has been verified.";
      const verifyBtn = document.getElementById("verify-email-btn");
      if (verifyBtn) verifyBtn.style.display = "none";
    } else {
      summaryVerify.textContent = "Unverified";
      summaryVerify.className = "badge badge-warning";
      const verifyBtn = document.getElementById("verify-email-btn");
      if (verifyBtn) verifyBtn.style.display = "inline-block";
    }
  }

  db.ref("users/" + user.uid).once("value").then(snapshot => {
    const data = snapshot.val();
    if (data) {
      if (phoneInput && data.phoneNumber) phoneInput.value = data.phoneNumber;
      if (summaryCreated && data.createdAt) summaryCreated.textContent = new Date(data.createdAt).toLocaleDateString("en-IN", {year:'numeric', month:'short', day:'numeric'});
      if (summaryLast && data.lastActive) summaryLast.textContent = new Date(data.lastActive).toLocaleString("en-IN");
    }
  });
}

function getInitials(name) {
  if (!name) return "SS";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function setupProfileFormBindings() {
  const detailsForm = document.getElementById("profile-details-form");
  if (detailsForm) {
    detailsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const displayName = document.getElementById("profile-name-input").value.trim();
      const phoneNumber = document.getElementById("profile-phone-input").value.trim();
      const alertContainer = document.getElementById("details-alert-container");

      if (isFirebaseInitialized && firebaseUser) {
        firebaseUser.updateProfile({ displayName: displayName })
          .then(() => {
            return db.ref("users/" + firebaseUser.uid).update({
              displayName: displayName,
              phoneNumber: phoneNumber
            });
          })
          .then(() => {
            showInlineAlert(alertContainer, "Profile details updated successfully!", "success");
            showToast("Profile details updated.");
            populateProfileFields(firebaseUser);
          })
          .catch(err => {
            showInlineAlert(alertContainer, err.message, "danger");
          });
      }
    });
  }

  const newPassInput = document.getElementById("profile-new-pass");
  if (newPassInput) {
    newPassInput.addEventListener("input", (e) => {
      const pass = e.target.value;
      const fill = document.getElementById("pass-strength-fill");
      const text = document.getElementById("pass-strength-text");
      
      if (!pass) {
        fill.className = "progress-bar-fill";
        text.textContent = "Password strength: Empty";
        return;
      }

      let score = 0;
      if (pass.length >= 6) score += 1;
      if (pass.length >= 10) score += 1;
      if (/[A-Z]/.test(pass)) score += 1;
      if (/[0-9]/.test(pass)) score += 1;
      if (/[^A-Za-z0-9]/.test(pass)) score += 1;

      if (score <= 2) {
        fill.className = "progress-bar-fill strength-weak";
        text.textContent = "Password strength: Weak";
      } else if (score <= 4) {
        fill.className = "progress-bar-fill strength-fair";
        text.textContent = "Password strength: Fair";
      } else if (score === 5) {
        fill.className = "progress-bar-fill strength-strong";
        text.textContent = "Password strength: Strong";
      }
    });
  }

  const passwordForm = document.getElementById("profile-password-form");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const oldPass = document.getElementById("profile-old-pass").value;
      const newPass = document.getElementById("profile-new-pass").value;
      const confirmPass = document.getElementById("profile-confirm-pass").value;
      const alertContainer = document.getElementById("password-alert-container");

      if (newPass.length < 6) {
        showInlineAlert(alertContainer, "New password must be at least 6 characters.", "danger");
        return;
      }

      if (newPass !== confirmPass) {
        showInlineAlert(alertContainer, "New passwords do not match.", "danger");
        return;
      }

      if (isFirebaseInitialized && firebaseUser) {
        const providers = firebaseUser.providerData.map(p => p.providerId);
        const hasPassword = providers.includes('password');

        if (hasPassword) {
          const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, oldPass);
          firebaseUser.reauthenticateWithCredential(credential)
            .then(() => {
              return firebaseUser.updatePassword(newPass);
            })
            .then(() => {
              showInlineAlert(alertContainer, "Password changed successfully!", "success");
              passwordForm.reset();
              document.getElementById("pass-strength-fill").className = "progress-bar-fill";
              document.getElementById("pass-strength-text").textContent = "Password strength: Empty";
              populateProviderLinking(firebaseUser);
            })
            .catch(err => {
              showInlineAlert(alertContainer, err.message, "danger");
            });
        } else {
          // Google-only user setting a new password (linking it)
          const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, newPass);
          firebaseUser.linkWithCredential(credential)
            .then((result) => {
              showInlineAlert(alertContainer, "Password set successfully! You can now log in using either method.", "success");
              passwordForm.reset();
              document.getElementById("pass-strength-fill").className = "progress-bar-fill";
              document.getElementById("pass-strength-text").textContent = "Password strength: Empty";
              firebaseUser = result.user; // Update current user
              populateProviderLinking(firebaseUser);
            })
            .catch(err => {
              showInlineAlert(alertContainer, err.message, "danger");
            });
        }
      }
    });
  }

  const deleteForm = document.getElementById("delete-account-form");
  if (deleteForm) {
    deleteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const password = document.getElementById("delete-password-input").value;
      const alertContainer = document.getElementById("delete-modal-alert");

      if (isFirebaseInitialized && firebaseUser) {
        const providers = firebaseUser.providerData.map(p => p.providerId);
        const hasPassword = providers.includes('password');

        let reauthPromise;
        if (hasPassword) {
          const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, password);
          reauthPromise = firebaseUser.reauthenticateWithCredential(credential);
        } else {
          if (!googleReauthenticated) {
            showInlineAlert(alertContainer, "Please reauthenticate with Google using the button first.", "danger");
            return;
          }
          reauthPromise = Promise.resolve();
        }

        reauthPromise
          .then(() => {
            return db.ref("users/" + firebaseUser.uid).remove();
          })
          .then(() => {
            return firebaseUser.delete();
          })
          .then(() => {
            window.location.href = "index.html";
          })
          .catch(err => {
            showInlineAlert(alertContainer, err.message, "danger");
          });
      }
    });
  }

  const deleteGoogleBtn = document.getElementById("delete-google-btn");
  if (deleteGoogleBtn) {
    deleteGoogleBtn.addEventListener("click", () => {
      const alertContainer = document.getElementById("delete-modal-alert");
      if (alertContainer) alertContainer.innerHTML = "";

      if (isFirebaseInitialized && firebaseUser) {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebaseUser.reauthenticateWithPopup(provider)
          .then(() => {
            googleReauthenticated = true;
            const submitBtn = document.getElementById("delete-confirm-submit-btn");
            if (submitBtn) submitBtn.disabled = false;
            showInlineAlert(alertContainer, "Google authentication verified successfully! You can now permanently delete your account.", "success");
          })
          .catch(err => {
            showInlineAlert(alertContainer, err.message, "danger");
          });
      }
    });
  }

  const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
  const modalCloseBtn = document.getElementById("delete-modal-close");
  const deleteOverlay = document.getElementById("delete-confirm-modal");
  
  const closeModal = () => {
    if (deleteOverlay) deleteOverlay.classList.remove("active");
  };

  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);

  const addressForm = document.getElementById("address-form");
  if (addressForm) {
    addressForm.addEventListener("submit", handleAddressFormSubmit);
  }
}

window.handleProfileLogout = function() {
  if (isFirebaseInitialized) {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  }
};

window.triggerLoginModal = function() {
  const overlay = document.getElementById("auth-modal-overlay");
  if (overlay) overlay.classList.add("active");
};

window.handleSendEmailVerification = function() {
  const alertContainer = document.getElementById("security-alert-container");
  if (isFirebaseInitialized && firebaseUser) {
    firebaseUser.sendEmailVerification()
      .then(() => {
        showInlineAlert(alertContainer, "Verification email has been dispatched to your inbox.", "info");
      })
      .catch(err => {
        showInlineAlert(alertContainer, err.message, "danger");
      });
  }
};

let googleReauthenticated = false;

window.triggerDeleteAccountModal = function() {
  const deleteOverlay = document.getElementById("delete-confirm-modal");
  const passInput = document.getElementById("delete-password-input");
  const alertContainer = document.getElementById("delete-modal-alert");
  
  googleReauthenticated = false; // Reset

  if (passInput) passInput.value = "";
  if (alertContainer) alertContainer.innerHTML = "";

  if (isFirebaseInitialized && firebaseUser) {
    const providers = firebaseUser.providerData.map(p => p.providerId);
    const hasPassword = providers.includes('password');

    const passGroup = document.getElementById("delete-password-group");
    const googleGroup = document.getElementById("delete-google-reauth-group");
    const reauthText = document.getElementById("delete-reauth-text");
    const submitBtn = document.getElementById("delete-confirm-submit-btn");

    if (hasPassword) {
      if (passGroup) passGroup.style.display = "block";
      if (passInput) passInput.required = true;
      if (googleGroup) googleGroup.style.display = "none";
      if (reauthText) reauthText.textContent = "by entering your current password below to confirm this action";
      if (submitBtn) submitBtn.disabled = false;
    } else {
      if (passGroup) passGroup.style.display = "none";
      if (passInput) passInput.required = false;
      if (googleGroup) googleGroup.style.display = "block";
      if (reauthText) reauthText.textContent = "by authenticating with your Google account using the button below";
      if (submitBtn) submitBtn.disabled = true;
    }
  }
  
  if (deleteOverlay) deleteOverlay.classList.add("active");
};

// --- HELPER UTILITIES & AUTH LINKING ---

function showInlineAlert(container, message, type = "info") {
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}" style="margin-top: 10px; margin-bottom: 15px;">
      ${message}
    </div>
  `;
}

function populateProviderLinking(user) {
  const providers = user.providerData.map(p => p.providerId);
  const hasGoogle = providers.includes('google.com');
  const hasPassword = providers.includes('password');

  // Update Password Form UI based on active providers
  const oldPassGroup = document.getElementById("profile-old-pass-group");
  const oldPassInput = document.getElementById("profile-old-pass");
  const changePassBtn = document.getElementById("change-pass-btn");
  const changePassTitle = document.querySelector("#profile-password-form-card .profile-card-header h3");

  if (hasPassword) {
    if (oldPassGroup) oldPassGroup.style.display = "block";
    if (oldPassInput) oldPassInput.required = true;
    if (changePassBtn) changePassBtn.textContent = "Change Password";
    if (changePassTitle) changePassTitle.textContent = "Change Password";
  } else {
    if (oldPassGroup) oldPassGroup.style.display = "none";
    if (oldPassInput) oldPassInput.required = false;
    if (changePassBtn) changePassBtn.textContent = "Create Password Login";
    if (changePassTitle) changePassTitle.textContent = "Set Account Password";
  }

  // Update Linked Accounts Status and Buttons
  const googleStatus = document.getElementById("google-link-status");
  const googleBtn = document.getElementById("google-link-btn");
  const passwordStatus = document.getElementById("password-link-status");

  if (googleStatus && googleBtn) {
    if (hasGoogle) {
      googleStatus.innerHTML = '<span class="badge badge-success">Connected</span>';
      const googleInfo = user.providerData.find(p => p.providerId === 'google.com');
      if (googleInfo && googleInfo.email) {
        googleStatus.innerHTML += ` <span style="font-size:0.9rem; color:var(--color-muted-gray);">(${googleInfo.email})</span>`;
      }
      
      const otherProvidersCount = hasPassword ? 1 : 0;
      if (otherProvidersCount > 0) {
        googleBtn.textContent = "Disconnect Google";
        googleBtn.className = "btn btn-secondary btn-small";
        googleBtn.style.display = "inline-block";
        googleBtn.onclick = () => handleUnlinkGoogle();
      } else {
        googleBtn.style.display = "none";
      }
    } else {
      googleStatus.innerHTML = '<span class="badge badge-warning">Not Connected</span>';
      googleBtn.textContent = "Connect Google Account";
      googleBtn.className = "btn btn-primary btn-small";
      googleBtn.style.display = "inline-block";
      googleBtn.onclick = () => handleLinkGoogle();
    }
  }

  if (passwordStatus) {
    if (hasPassword) {
      passwordStatus.innerHTML = '<span class="badge badge-success">Enabled</span>';
    } else {
      passwordStatus.innerHTML = '<span class="badge badge-warning">Disabled (Google Sign-In Only)</span>';
    }
  }
}

window.handleLinkGoogle = function() {
  const alertContainer = document.getElementById("linked-accounts-alert-container");
  if (alertContainer) alertContainer.innerHTML = "";

  if (isFirebaseInitialized && firebaseUser) {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebaseUser.linkWithPopup(provider)
      .then((result) => {
        showInlineAlert(alertContainer, "Google account linked successfully!", "success");
        showToast("Google account linked.");
        firebaseUser = result.user; // Update reference
        populateProviderLinking(firebaseUser);
      })
      .catch((err) => {
        showInlineAlert(alertContainer, err.message, "danger");
      });
  }
};

window.handleUnlinkGoogle = function() {
  const alertContainer = document.getElementById("linked-accounts-alert-container");
  if (alertContainer) alertContainer.innerHTML = "";

  if (isFirebaseInitialized && firebaseUser) {
    firebaseUser.unlink('google.com')
      .then((user) => {
        showInlineAlert(alertContainer, "Google account disconnected successfully.", "success");
        showToast("Google account unlinked.");
        firebaseUser = user; // Update reference
        populateProviderLinking(firebaseUser);
      })
      .catch((err) => {
        showInlineAlert(alertContainer, err.message, "danger");
      });
  }
};

// --- ADDRESS BOOK FUNCTIONS ---

async function loadUserAddresses(user) {
  const loading = document.getElementById("address-book-loading");
  const empty = document.getElementById("address-book-empty");
  const list = document.getElementById("address-book-list");
  
  if (loading) loading.style.display = "block";
  if (empty) empty.style.display = "none";
  if (list) list.innerHTML = "";
  
  try {
    const snapshot = await db.ref("users/" + user.uid + "/addresses").once("value");
    const data = snapshot.val();
    userAddresses = [];
    
    if (loading) loading.style.display = "none";
    
    if (!data) {
      if (empty) empty.style.display = "block";
      return;
    }
    
    let html = "";
    // Sort addresses so default is always first
    const addrList = Object.values(data).sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });

    addrList.forEach(addr => {
      userAddresses.push(addr);
      const defaultBadge = addr.isDefault ? `<span class="badge badge-success" style="font-size:0.65rem; padding: 2px 6px; margin-left: 8px;">Default</span>` : "";
      
      html += `
        <div class="address-book-card-item" id="address-card-${addr.id}">
          <div class="address-card-header-row">
            <span class="address-card-name">${addr.firstName} ${addr.lastName} ${defaultBadge}</span>
          </div>
          <div class="address-card-body">
            <p style="margin: 3px 0;">${addr.address}</p>
            <p style="margin: 3px 0;">${addr.city} - ${addr.zip}</p>
            <p style="margin: 3px 0;">Phone: ${addr.phone}</p>
          </div>
          <div class="address-card-actions">
            <button class="address-action-btn edit" onclick="openAddressModal('${addr.id}')">Edit</button>
            <button class="address-action-btn delete" onclick="handleDeleteAddress('${addr.id}')">Delete</button>
          </div>
        </div>
      `;
    });
    
    if (list) {
      list.innerHTML = html;
    }
  } catch (err) {
    console.error("Error loading addresses:", err);
    if (loading) loading.style.display = "none";
    const alertContainer = document.getElementById("address-alert-container");
    showInlineAlert(alertContainer, "Failed to load address book: " + err.message, "danger");
  }
}

window.openAddressModal = function(addressId = null) {
  const overlay = document.getElementById("address-modal-overlay");
  const title = document.getElementById("address-modal-title");
  const form = document.getElementById("address-form");
  const modalAlert = document.getElementById("address-modal-alert");
  
  if (modalAlert) modalAlert.innerHTML = "";
  if (form) form.reset();
  
  if (addressId) {
    if (title) title.textContent = "Edit Address";
    const addr = userAddresses.find(a => a.id === addressId);
    if (addr) {
      document.getElementById("address-id-input").value = addr.id;
      document.getElementById("address-first-name").value = addr.firstName || "";
      document.getElementById("address-last-name").value = addr.lastName || "";
      document.getElementById("address-street").value = addr.address || "";
      document.getElementById("address-city").value = addr.city || "";
      document.getElementById("address-zip").value = addr.zip || "";
      document.getElementById("address-phone").value = addr.phone || "";
      document.getElementById("address-default").checked = !!addr.isDefault;
    }
  } else {
    if (title) title.textContent = "Add New Address";
    document.getElementById("address-id-input").value = "";
    document.getElementById("address-default").checked = userAddresses.length === 0;
  }
  
  if (overlay) overlay.classList.add("active");
};

window.closeAddressModal = function() {
  const overlay = document.getElementById("address-modal-overlay");
  if (overlay) overlay.classList.remove("active");
};

async function handleAddressFormSubmit(e) {
  e.preventDefault();
  if (!firebaseUser) return;
  
  const id = document.getElementById("address-id-input").value || ("addr_" + Date.now());
  const firstName = document.getElementById("address-first-name").value.trim();
  const lastName = document.getElementById("address-last-name").value.trim();
  const street = document.getElementById("address-street").value.trim();
  const city = document.getElementById("address-city").value.trim();
  const zip = document.getElementById("address-zip").value.trim();
  const phone = document.getElementById("address-phone").value.trim();
  const isDefault = document.getElementById("address-default").checked;
  
  const modalAlert = document.getElementById("address-modal-alert");
  
  const addressData = {
    id,
    firstName,
    lastName,
    address: street,
    city,
    zip,
    phone,
    isDefault
  };

  const submitBtn = document.getElementById("address-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const addrRef = db.ref("users/" + firebaseUser.uid + "/addresses");
    
    if (isDefault) {
      // Find existing addresses and set their isDefault to false
      const snapshot = await addrRef.once("value");
      const addresses = snapshot.val() || {};
      const updates = {};
      Object.keys(addresses).forEach(key => {
        if (key !== id && addresses[key].isDefault) {
          updates[key + "/isDefault"] = false;
        }
      });
      updates[id] = addressData;
      await addrRef.update(updates);
    } else {
      // Just set this address, check if it's the only one. If it is, make it default anyway.
      const snapshot = await addrRef.once("value");
      const addresses = snapshot.val() || {};
      const count = Object.keys(addresses).length;
      if (count === 0 || (count === 1 && addresses[id])) {
        addressData.isDefault = true;
      }
      await addrRef.child(id).set(addressData);
    }
    
    showToast("Address saved successfully.");
    closeAddressModal();
    loadUserAddresses(firebaseUser);
  } catch (err) {
    showInlineAlert(modalAlert, err.message, "danger");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Address";
  }
}

window.handleDeleteAddress = async function(addressId) {
  if (!firebaseUser) return;
  if (!confirm("Are you sure you want to delete this address?")) return;
  
  try {
    const addrRef = db.ref("users/" + firebaseUser.uid + "/addresses/" + addressId);
    
    // Check if the deleted address was the default one
    const addressSnap = await addrRef.once("value");
    const addressData = addressSnap.val();
    
    await addrRef.remove();
    showToast("Address deleted successfully.");
    
    // If it was default, make another address default
    if (addressData && addressData.isDefault) {
      const parentSnap = await db.ref("users/" + firebaseUser.uid + "/addresses").once("value");
      const addresses = parentSnap.val();
      if (addresses) {
        const firstKey = Object.keys(addresses)[0];
        await db.ref("users/" + firebaseUser.uid + "/addresses/" + firstKey).update({ isDefault: true });
      }
    }
    
    loadUserAddresses(firebaseUser);
  } catch (err) {
    const alertContainer = document.getElementById("address-alert-container");
    showInlineAlert(alertContainer, err.message, "danger");
  }
};







