let generatedOTP;

// show inline messages inside the login box (fallbacks to console if #loginMessage not present)
function showMessage(msg, type = "info") {
  const msgBox = document.getElementById("loginMessage");
  if (msgBox) {
    msgBox.textContent = msg;
    msgBox.className = "message " + type;
  } else {
    // fallback if message box missing
    if (type === "error") console.error(msg);
    else console.log(msg);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateBtn");
  const nameEl = document.getElementById("name");
  const mobileEl = document.getElementById("mobile");

  function validateLoginFields() {
    const name = nameEl?.value.trim() || "";
    const mobile = mobileEl?.value.trim() || "";
    const isNameValid = name.length > 0;
    const isMobileValid = /^[0-9]{10}$/.test(mobile);

    console.log("Validation Check -> Name:", isNameValid, "Mobile:", isMobileValid);

    if (generateBtn) {
      generateBtn.disabled = !(isNameValid && isMobileValid);
      console.log("Generate OTP button disabled?", generateBtn.disabled);
    }
  }

  // attach listeners to BOTH fields
  if (nameEl) nameEl.addEventListener("input", validateLoginFields);
  if (mobileEl) mobileEl.addEventListener("input", validateLoginFields);

  // run once on page load
  validateLoginFields();
});



function generateOTP() {
  const nameEl = document.getElementById("name");
  const mobileEl = document.getElementById("mobile");
  const name = nameEl ? nameEl.value.trim() : "";
  const mobile = mobileEl ? mobileEl.value.trim() : "";

  if (!name || !mobile) {
    showMessage("Name and Mobile No. are required!", "error");
    if (!name && nameEl) nameEl.focus();
    else if (!mobile && mobileEl) mobileEl.focus();
    return;
  }

  const mobilePattern = /^[0-9]{10}$/;
  if (!mobilePattern.test(mobile)) {
    showMessage("Please enter a valid 10-digit mobile number.", "error");
    if (mobileEl) mobileEl.focus();
    return;
  }

  // generate OTP
  generatedOTP = Math.floor(1000 + Math.random() * 9000);
  showMessage("Your OTP is: " + generatedOTP, "info");

  const otpSection = document.getElementById("otpSection");
  if (otpSection) otpSection.style.display = "block";
}

function verifyOTP() {
  const enteredOTP = document.getElementById("otpInput").value;

  if (enteredOTP == generatedOTP) {
    sessionStorage.setItem("loggedIn", "true");
    showMessage("Login successful!", "success");

    setTimeout(() => {
      const redirectPage = sessionStorage.getItem("redirectAfterLogin");
      const modal = document.getElementById("profileModal");
      if (modal) {
        modal.style.display = "block"; // show profile modal first
      } else {
        // fallback → go home
        window.location.href = redirectPage || "index.html";
      }
    }, 800);
  } else {
    showMessage("Invalid OTP. Try again.", "error");
  }
}

// Profile modal buttons (only if modal exists)
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveProfileBtn");
  const skipBtn = document.getElementById("skipProfileBtn");

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const idType = document.getElementById("govt_id_type").value;
      const idNumber = document.getElementById("govt_id_number").value.trim();
      const pincode = document.getElementById("pincode").value.trim();
      const consent = document.getElementById("consent").checked;

      if (!idType || !idNumber || !pincode || !consent) {
        showMessage("Please fill ID, pincode and give consent.", "error");
        return;
      }

      if (idType === "aadhaar" && !/^[0-9]{12}$/.test(idNumber)) {
        showMessage("Aadhaar must be 12 digits.", "error");
        return;
      }

      sessionStorage.setItem(
        "profile",
        JSON.stringify({
          idType,
          idNumber: maskID(idNumber),
          pincode,
        })
      );

      showMessage("Profile saved (demo).");
      document.getElementById("profileModal").style.display = "none";
      window.location.href = "index.html";
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      document.getElementById("profileModal").style.display = "none";
      window.location.href = "index.html";
    });
  }
});

function maskID(id) {
  if (!id) return "";
  return id.slice(0, 4) + "-****-" + id.slice(-4);
}
