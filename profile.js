function showMessage(msg, type = "info") {
  const msgBox = document.getElementById("profileMessage");
  if (msgBox) {
    msgBox.textContent = msg;
    msgBox.className = "message " + type;
  } else {
    console.log(msg);
  }
}

document.getElementById("profileForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const idType = document.getElementById("govt_id_type").value;
  const idNumber = document.getElementById("govt_id_number").value.trim();
  const address = document.getElementById("address").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const consent = document.getElementById("consent").checked;

  if (!idType || !idNumber || !address || !pincode || !consent) {
    showMessage("Please fill all fields and give consent.", "error");
    return;
  }

  if (idType === "aadhaar" && !/^[0-9]{12}$/.test(idNumber)) {
    showMessage("Aadhaar must be 12 digits.", "error");
    return;
  }

  if (idType === "pan" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber)) {
    showMessage("Invalid PAN format (e.g., ABCDE1234F).", "error");
    return;
  }

  if (idType === "voter" && !/^[A-Z0-9]{6,12}$/i.test(idNumber)) {
    showMessage("Invalid Voter ID format.", "error");
    return;
  }

  if (!/^[0-9]{6}$/.test(pincode)) {
    showMessage("Pincode must be 6 digits.", "error");
    return;
  }

  // Save to sessionStorage
  sessionStorage.setItem("profile", JSON.stringify({
    idType,
    idNumber: maskID(idNumber),
    address,
    pincode
  }));

  showMessage("Profile saved successfully!", "success");

  // Redirect back to homepage after 1s
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
});

document.getElementById("skipProfileBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});

function maskID(id) {
  if (!id) return "";
  return id.slice(0, 4) + "-****-" + id.slice(-4);
}
