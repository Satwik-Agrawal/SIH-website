document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reportForm");
  const imageInput = document.getElementById("issueImage");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("issueTitle").value.trim();
    const desc = document.getElementById("issueDesc").value.trim();
    const category = document.getElementById("issueCategory")?.value || "General";
    const status = document.getElementById("issueStatus")?.value || "Open";
    const reporter = document.getElementById("issueReporter")?.value.trim() || "Anonymous";
    const location = document.getElementById("issueLocation").value.trim();
    const department = document.getElementById("issueDept").value;
    const date = new Date().toISOString().split("T")[0];

    const file = imageInput.files[0];

    if (file) {
      // If image selected → read it
      const reader = new FileReader();
      reader.onload = function (event) {
        saveIssue({
          title, desc, category, status, reporter,
          location, department, date,
          image: event.target.result
        });
      };
      reader.readAsDataURL(file);
    } else {
      // No image → save anyway
      saveIssue({
        title, desc, category, status, reporter,
        location, department, date,
        image: ""
      });
    }
  });

  function saveIssue(issue) {
    let issues = JSON.parse(localStorage.getItem("issues")) || [];
    issues.unshift(issue); // add at top
    localStorage.setItem("issues", JSON.stringify(issues));

    // Success message
    if (typeof showMessage === "function") {
      showMessage("Issue reported successfully!", "success");
    } else {
      alert("Issue reported successfully!");
    }

    // Handle redirect
    const redirect = sessionStorage.getItem("redirectAfterProfile");
    if (redirect) {
      sessionStorage.removeItem("redirectAfterProfile");
      setTimeout(() => { window.location.href = redirect; }, 700);
    } else {
      setTimeout(() => { window.location.href = "index.html"; }, 700);
    }
  }
});
