// ========================
// script.js - updated (sort/filter/search + persistent votes)
// ========================

/* -------------------------
   Helpers & DOM shortcuts
   ------------------------- */
const profileUpload = document.getElementById('profileUpload');
const profileImage = document.getElementById('profileImage');
const issuesContainerId = 'issuesContainer';
const searchBar = document.getElementById('searchBar');
const sortEl = document.getElementById('sortSelect') || document.getElementById('sortOptions') || document.getElementById('sort');
const filterEl = document.getElementById('filterSelect') || document.getElementById('filterOptions') || document.getElementById('filter');

/* -------------------------
   Load issues from API
   ------------------------- */
async function loadIssues() {
  try {
    const issues = await apiClient.getIssues();
    return issues;
  } catch (error) {
    console.error('Error loading issues:', error);
    return [];
  }
}

/* -------------------------
   Utility: update stats (counts)
   ------------------------- */
function updateStats() {
  const total = document.querySelectorAll(".issue-card").length;
  const inProgress = document.querySelectorAll(".status.in-progress").length;
  const resolved = document.querySelectorAll(".status.resolved").length;

  if (document.getElementById("totalIssues"))
    document.getElementById("totalIssues").textContent = total;
  if (document.getElementById("inProgressIssues"))
    document.getElementById("inProgressIssues").textContent = inProgress;
  if (document.getElementById("resolvedIssues"))
    document.getElementById("resolvedIssues").textContent = resolved;
}

/* -------------------------
   Persist liked issues in session (simple toggle)
   ------------------------- */
function getLikedSet() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem('likedIssues') || '[]'));
  } catch {
    return new Set();
  }
}
function saveLikedSet(set) {
  sessionStorage.setItem('likedIssues', JSON.stringify(Array.from(set)));
}

/* -------------------------
   Render issues (with filter, search, sort)
   ------------------------- */
async function renderIssues() {
  const container = document.getElementById(issuesContainerId);
  if (!container) {
    console.warn("renderIssues: no container found");
    return;
  }

  // Load issues from API
  const raw = await loadIssues();
  
  // read controls (safe guards)
  const filterVal = (filterEl && filterEl.value) ? filterEl.value.trim().toLowerCase() : 'all';
  const sortVal = (sortEl && sortEl.value) ? sortEl.value.trim().toLowerCase() : 'latest';
  const searchTerm = (searchBar && searchBar.value) ? searchBar.value.trim().toLowerCase() : '';

  // 1) filter by category (if not 'all')
  let filtered = raw.filter(issue => {
    if (!filterVal || filterVal === 'all') return true;
    // allow 'road' to match 'roads' etc.
    const cat = (issue.category || '').toLowerCase();
    return cat.includes(filterVal);
  });

  // 2) search (title, desc, location, reporter)
  if (searchTerm) {
    filtered = filtered.filter(issue => {
      const hay = `${issue.title || ''} ${issue.description || ''} ${issue.location || ''} ${issue.reporter_name || ''}`.toLowerCase();
      return hay.includes(searchTerm);
    });
  }

  // 3) sort
  filtered.sort((a, b) => {
    if (sortVal === 'votes' || sortVal === 'most-voted' || sortVal === 'most voted') {
      return (b.vote_count || 0) - (a.vote_count || 0);
    }
    if (sortVal === 'title' || sortVal === 'a-z' || sortVal === 'name') {
      return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
    }
    // date sorting: newest first = 'latest'
    const da = a.created_at ? Date.parse(a.created_at) : 0;
    const db = b.created_at ? Date.parse(b.created_at) : 0;
    if (sortVal === 'oldest') return da - db;
    // default to newest first
    return db - da;
  });

  // build DOM
  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = `<div class="no-results" style="text-align:center;padding:28px;color:#555">No issues found.</div>`;
    updateStats();
    return;
  }

  filtered.forEach(issue => {
    const card = document.createElement('div');
    card.className = 'issue-card';
    card.dataset.id = issue.id;
    card.dataset.title = issue.title || '';
    card.dataset.desc = issue.description || '';
    card.dataset.location = issue.location || '';
    card.dataset.date = issue.created_at || '';
    card.dataset.reporter = issue.reporter_name || '';
    card.dataset.status = issue.status || '';
    card.dataset.image = issue.image_path || '';
    card.dataset.category = issue.category || '';

    const statusClass = (issue.status || '').toLowerCase().replace(/\s+/g, '-');
    const imageUrl = issue.image_path ? `/uploads/${issue.image_path.split('/').pop()}` : '';

    card.innerHTML = `
      ${imageUrl ? `<img src="${imageUrl}" alt="Issue Image" class="issue-image">` : ''}
      <div class="issue-content">
        <h3>${escapeHtml(issue.title || '')}</h3>
        <p class="reporter-name">${escapeHtml(issue.reporter_name || '')}</p>
        <span class="status ${statusClass}">${escapeHtml(issue.status || '')}</span>
        <p style="margin-top:10px;">${escapeHtml(issue.description || '')}</p>
        <div class="issue-actions" style="margin-top:12px;">
          <button class="vote-btn" data-id="${issue.id}">👍 Vote (${issue.vote_count || 0})</button>
          <button class="comment-btn" data-id="${issue.id}">💬 Comment</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // update stats and attach event handlers
  updateStats();
  attachCardListeners();
}

/* small helper to avoid injecting raw html values */
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[s];
  });
}

/* -------------------------
   Attach listeners for votes / comments / card click
   (call after render)
   ------------------------- */
function attachCardListeners() {
  const container = document.getElementById(issuesContainerId);
  if (!container) return;

  // vote buttons
  container.querySelectorAll('.vote-btn').forEach(btn => {
    // remove old listeners (defensive)
    btn.replaceWith(btn.cloneNode(true));
  });
  // reselect after cloning
  container.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const issueId = parseInt(btn.dataset.id, 10);
      if (Number.isNaN(issueId)) return;

      // require authentication to vote
      if (!apiClient.isAuthenticated()) {
        if (confirm("You must be logged in to vote on an issue. Proceed to login page?")) {
          window.location.href = "login.html";
        }
        return;
      }

      try {
        const result = await apiClient.voteIssue(issueId);
        if (result.success) {
          showMessage('Vote added successfully!', 'success');
          renderIssues(); // re-render to update counts
        } else {
          showMessage(result.error || 'Failed to vote', 'error');
        }
      } catch (error) {
        showMessage('Error voting on issue', 'error');
      }
    });
  });

  // comment buttons
  container.querySelectorAll('.comment-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  container.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const issueId = parseInt(btn.dataset.id, 10);
      if (Number.isNaN(issueId)) return;

      if (!apiClient.isAuthenticated()) {
        if (confirm("You must be logged in to comment. Proceed to login page?")) {
          window.location.href = "login.html";
        }
        return;
      }

      const comment = prompt("Enter your comment:");
      if (comment && comment.trim()) {
        try {
          const result = await apiClient.addComment(issueId, comment.trim());
          if (result.success) {
            showMessage('Comment added successfully!', 'success');
          } else {
            showMessage(result.error || 'Failed to add comment', 'error');
          }
        } catch (error) {
          showMessage('Error adding comment', 'error');
        }
      }
    });
  });

  // issue card click (open popup)
  container.querySelectorAll('.issue-card').forEach(card => {
    // remove old handlers by cloning pattern
    const newCard = card.cloneNode(true);
    card.replaceWith(newCard);
  });

  container.querySelectorAll('.issue-card').forEach(card => {
    card.addEventListener('click', async () => {
      const issueId = card.dataset.id;
      const imageSrc = card.dataset.image || card.querySelector('.issue-image')?.src || '';
      const title = card.dataset.title || 'No title';
      const reporter = card.dataset.reporter || 'Unknown Reporter';
      const status = card.dataset.status || 'No Status';
      const location = card.dataset.location || '';
      const date = card.dataset.date || '';
      const desc = card.dataset.desc || '';

      // Load comments for this issue
      let commentsHtml = '';
      try {
        const comments = await apiClient.getComments(issueId);
        if (comments && comments.length > 0) {
          commentsHtml = `
            <div style="margin-top: 20px;">
              <h4>Comments (${comments.length})</h4>
              <div style="max-height: 200px; overflow-y: auto;">
                ${comments.map(comment => `
                  <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>${escapeHtml(comment.username || 'Anonymous')}</strong>
                    <span style="color: #666; font-size: 12px; margin-left: 10px;">
                      ${new Date(comment.created_at).toLocaleDateString()}
                    </span>
                    <p style="margin: 5px 0 0 0;">${escapeHtml(comment.comment)}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      }

      const details = `
        <img src="${escapeHtml(imageSrc)}" alt="Issue Image" class="issue-image" style="border-radius:8px;max-width:100%;height:auto;margin-bottom:12px;"/>
        <h2 style="margin-top:0;">${escapeHtml(title)}</h2>
        <p><strong>Reporter:</strong> ${escapeHtml(reporter)}</p>
        <p><strong>Status:</strong> ${escapeHtml(status)}</p>
        ${location ? `<p><strong>Location:</strong> ${escapeHtml(location)}</p>` : ''}
        ${date ? `<p><strong>Date:</strong> ${escapeHtml(new Date(date).toLocaleDateString())}</p>` : ''}
        <p style="margin-top:8px;">${escapeHtml(desc)}</p>
        ${commentsHtml}
      `;
      openPopup(details);
    });
  });

  // visually mark liked buttons (session)
  const liked = getLikedSet();
  document.querySelectorAll('.vote-btn').forEach(btn => {
    const idx = btn.dataset.idx;
    if (liked.has(String(idx))) {
      btn.classList.add('liked');
      btn.style.backgroundColor = '#1976d2';
      btn.style.color = '#fff';
    } else {
      btn.classList.remove('liked');
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }
  });
}

/* -------------------------
   Popup open/close
   ------------------------- */
function openPopup(content) {
  const popup = document.getElementById("popupModal");
  const popupContent = document.getElementById("popupContent");
  if (!popup || !popupContent) return;
  popupContent.innerHTML = content;
  popup.style.display = "flex";
}
function closePopup() {
  const popup = document.getElementById("popupModal");
  if (!popup) return;
  popup.style.display = "none";
}

/* -------------------------
   Sidebar open/close (keeps existing behavior)
   ------------------------- */
function openSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const hamburger = document.querySelector(".hamburger");
  if (sidebar && mainContent && hamburger) {
    sidebar.classList.add("sidebar-open");
    mainContent.classList.add("main-shift");
    hamburger.style.display = "none";
    document.body.classList.add('sidebar-opened');
  }
}
function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const hamburger = document.querySelector(".hamburger");
  if (sidebar && mainContent && hamburger) {
    sidebar.classList.remove("sidebar-open");
    mainContent.classList.remove("main-shift");
    hamburger.style.display = "block";
    document.body.classList.remove('sidebar-opened');
  }
}
// clicking outside sidebar closes it safely
document.addEventListener('click', (e) => {
  const sidebar = document.querySelector('.sidebar');
  const hamburger = document.querySelector('.hamburger');
  if (!sidebar || !hamburger) return;
  if (sidebar.classList.contains('sidebar-open') && !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
    closeSidebar();
  }
});

/* -------------------------
   DOMContentLoaded: wire everything
   ------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded fired in script.js");

  await renderIssues();

  // search -> render
  if (searchBar) {
    searchBar.addEventListener('input', () => {
      renderIssues();
    });
  }

  // sort & filter -> render (support multiple ids)
  if (sortEl) sortEl.addEventListener('change', () => renderIssues());
  if (filterEl) filterEl.addEventListener('change', () => renderIssues());

  // popup overlay close on backdrop click
  const popupModal = document.getElementById("popupModal");
  if (popupModal) {
    popupModal.addEventListener("click", (e) => {
      if (e.target === popupModal) closePopup();
    });
  }

  // Profile image upload
  if (profileUpload) {
    profileUpload.addEventListener('change', function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          if (profileImage) profileImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Report button and report links (require authentication)
  (function attachReportChecks() {
    const heroReportBtn = document.querySelector(".hero-btn.primary") || document.getElementById('reportNowBtn');
    if (heroReportBtn) {
      heroReportBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!apiClient.isAuthenticated()) {
          if (confirm("You must be logged in to report an issue. Proceed to login page?")) {
            window.location.href = "login.html";
          }
          return;
        }
        window.location.href = "report.html";
      });
    }

    document.querySelectorAll('a[href="report.html"]').forEach(link => {
      link.addEventListener("click", (e) => {
        if (apiClient.isAuthenticated()) return;
        e.preventDefault();
        if (confirm("You must be logged in to report an issue. Proceed to login page?")) {
          window.location.href = "login.html";
        }
      });
    });
  })();

}); // end DOMContentLoaded
/* -------------------------
   Map View (Google Maps API)
   ------------------------- */
// ========================
// script.js - updated (with map view markers)
// ========================

// ... all your existing code above stays the same ...

/* -------------------------
   Map View (Leaflet + OpenStreetMap)
   ------------------------- */

// ========================
// script.js - updated (sort/filter/search + persistent votes + map popups with image & votes)
// ========================

// ... all your existing code above stays the same ...

/* -------------------------
   Map View (Leaflet + OpenStreetMap)
   ------------------------- */

let map;
let markers = [];

// ✅ Single fakeGeocode function (Jharkhand bounding box)
function fakeGeocode(query, idx) {
  const minLat = 23.0, maxLat = 24.7;
  const minLng = 83.0, maxLng = 87.5;

  const lat = minLat + (idx * 37 % (maxLat - minLat));
  const lng = minLng + (idx * 53 % (maxLng - minLng));
  return { lat, lng };
}

async function initMap() {
  // If map not created yet → initialize
  if (!map) {
    map = L.map("map").setView([23.61, 85.28], 7); // Center on Ranchi

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  }

  // Clear old markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const issues = await loadIssues();
  const bounds = [];

  issues.forEach((issue, idx) => {
    if (!issue.title) return;
    const pos = fakeGeocode(issue.location || issue.title, idx);

    const marker = L.marker([pos.lat, pos.lng]).addTo(map);

    // ✅ Updated popup with image + votes
    const imageUrl = issue.image_path ? `/uploads/${issue.image_path.split('/').pop()}` : '';
    let popupHtml = `
      <div style="max-width:240px;">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" 
             alt="Issue Image" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px;"/>` : ""}
        <h4 style="margin:0 0 6px;">${escapeHtml(issue.title || "Issue")}</h4>
        <p style="margin:0;font-size:13px;">${escapeHtml(issue.description || "")}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#555;">
          <strong>Status:</strong> ${escapeHtml(issue.status || "Unknown")}
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:#555;">
          <strong>Votes:</strong> ${issue.vote_count || 0}
        </p>
      </div>
    `;

    marker.bindPopup(popupHtml);

    markers.push(marker);
    bounds.push([pos.lat, pos.lng]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds);
  }
}

function showMapView() {
  // Hide issue list, show map section
  document.querySelector(".issues-section").style.display = "none";
  document.getElementById("mapSection").style.display = "block";

  setTimeout(() => {
    if (map) {
      map.invalidateSize(); // Fixes rendering inside hidden container
    } else {
      initMap();
    }
  }, 300);
}
function showListView() {
  document.querySelector(".issues-section").style.display = "block";
  document.getElementById("mapSection").style.display = "none";
}
