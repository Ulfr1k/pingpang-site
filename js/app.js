// ==================== State ====================
let allRubbers = [];
let ratings = {};
let filters = { search: "", brand: "", status: "", sort: "brand" };

// ==================== Init ====================
document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadData();
});

function bindEvents() {
  const debounced = debounce(handleSearch, 250);
  document.getElementById("search").addEventListener("input", debounced);
  document.getElementById("filter-brand").addEventListener("change", applyFilters);
  document.getElementById("filter-status").addEventListener("change", applyFilters);
  document.getElementById("sort").addEventListener("change", applyFilters);
}

// ==================== Data Loading ====================
async function loadData() {
  try {
    // Build URL lists: local bundled first, then remote repo
    const rubberUrls = [CONFIG.rubbersUrls[0], CONFIG.remoteRubbersUrl];
    const ratingUrls = [CONFIG.ratingsUrls[0], CONFIG.remoteRatingsUrl];

    const rubberData = await fetchFirst(rubberUrls);
    if (!rubberData) throw new Error("Failed to load rubber data from all sources");
    allRubbers = rubberData.rubbers || [];

    const ratingsData = await fetchFirst(ratingUrls);
    if (ratingsData) ratings = ratingsData.ratings || {};

    // Load live review counts from GitHub Issues (best-effort)
    loadLiveIssueCounts();

    populateBrandFilter();
    updateStats();
    renderGrid();
  } catch (err) {
    console.error(err);
    document.getElementById("loading").textContent = "数据加载失败。请检�?js/config.js 中的 dataOwner 配置�?;
  }
}

async function loadLiveIssueCounts() {
  try {
    const res = await fetch(CONFIG.issuesApiUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return;
    const issues = await res.json();
    if (!Array.isArray(issues)) return;
    // Count issues per rubber code
    const countByCode = {};
    for (const issue of issues) {
      const m = (issue.title || "").match(/评分\s*\|\s*(.+?)/);
      // Try to match code from body �?but we use pre-computed ratings.json for averages
    }
    // We rely on ratings.json for aggregated data; live count is supplementary
    renderGrid(); // re-render if ratings were sparse
  } catch {
    // Silent fail �?ratings.json is the primary source
  }
}

// ==================== Rendering ====================
function populateBrandFilter() {
  const brands = [...new Set(allRubbers.map((r) => r.brand))].filter(Boolean).sort();
  const select = document.getElementById("filter-brand");
  for (const b of brands) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  }
}

function updateStats() {
  const total = allRubbers.length;
  const active = allRubbers.filter((r) => r.isActive).length;
  const reviewed = Object.keys(ratings).length;
  const totalReviews = Object.values(ratings).reduce((s, r) => s + (r.count || 0), 0);
  document.getElementById("stat-total").textContent = `📋 ${total} 款长胶`;
  document.getElementById("stat-active").textContent = `�?${active} 款认证有效`;
  document.getElementById("stat-reviews").textContent = `�?${totalReviews} 条用户评价（${reviewed} 款有评价）`;
}

function applyFilters() {
  filters.brand = document.getElementById("filter-brand").value;
  filters.status = document.getElementById("filter-status").value;
  filters.sort = document.getElementById("sort").value;
  renderGrid();
}

function handleSearch(e) {
  filters.search = e.target.value.toLowerCase().trim();
  renderGrid();
}

function getFilteredRubbers() {
  let list = allRubbers.filter((r) => {
    if (filters.brand && r.brand !== filters.brand) return false;
    if (filters.status === "active" && !r.isActive) return false;
    if (filters.status === "inactive" && r.isActive) return false;
    if (filters.search) {
      const hay = `${r.brand} ${r.model} ${r.code}`.toLowerCase();
      if (!hay.includes(filters.search)) return false;
    }
    return true;
  });

  const sort = filters.sort;
  if (sort === "brand") {
    list.sort((a, b) => (a.brand || "").localeCompare(b.brand || "") || (a.model || "").localeCompare(b.model || ""));
  } else if (sort === "model") {
    list.sort((a, b) => (a.model || "").localeCompare(b.model || ""));
  } else if (sort === "rating") {
    list.sort((a, b) => {
      const ra = ratings[a.code]?.overall || 0;
      const rb = ratings[b.code]?.overall || 0;
      return rb - ra;
    });
  }
  return list;
}

function renderGrid() {
  const grid = document.getElementById("grid");
  const loading = document.getElementById("loading");
  const empty = document.getElementById("empty");
  const banner = document.getElementById("expired-banner");

  loading.style.display = "none";

  const list = getFilteredRubbers();

  // Show expired banner if there are inactive rubbers visible
  const hasInactive = list.some((r) => !r.isActive);
  banner.style.display = hasInactive ? "block" : "none";

  if (list.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  grid.innerHTML = list.map(rubberCard).join("");

  // Bind click events
  grid.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => openModal(card.dataset.code));
  });
}

function rubberCard(r) {
  const rating = ratings[r.code];
  const overall = rating?.overall || 0;
  const count = rating?.count || 0;
  const stars = renderStars(overall);
  const bars = rating ? renderRatingBars(rating.average) : "";
  const statusBadge = r.isActive
    ? '<span class="badge badge-active">认证有效</span>'
    : '<span class="badge badge-expired">已过�?/span>';
  const imgSrc = r.imageUrl
    ? r.imageUrl
    : "";
  const imgHtml = imgSrc
    ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(r.brand + " " + r.model)}" loading="lazy" onerror="this.parentNode.classList.add('img-fallback')">`
    : "";
  const colors = (r.colors || []).map((c) => `<span class="color-dot ${c.toLowerCase()}"></span>`).join("");

  return `
    <div class="card ${r.isActive ? "" : "card-inactive"}" data-code="${escapeAttr(r.code)}">
      <div class="card-img ${imgHtml ? "" : "img-fallback"}">${imgHtml}</div>
      <div class="card-body">
        <div class="card-brand">${escapeHtml(r.brand || "�?)}</div>
        <div class="card-model">${escapeHtml(r.model || "�?)}</div>
        <div class="card-meta">
          ${statusBadge}
          ${r.code ? `<span class="badge badge-code">${escapeHtml(r.code)}</span>` : ""}
        </div>
        <div class="card-colors">${colors}</div>
        ${count > 0 ? `
          <div class="card-rating">
            ${stars} <span class="rating-num">${overall.toFixed(1)}</span>
            <span class="rating-count">(${count}�?</span>
          </div>
          <div class="card-bars">${bars}</div>
        ` : '<div class="card-noreview">暂无评价</div>'}
        <div class="card-action">查看评价 �?/div>
      </div>
    </div>`;
}

function renderStars(score) {
  const full = Math.round(score);
  let s = "";
  for (let i = 0; i < 5; i++) s += i < full ? "�? : "�?;
  return `<span class="stars">${s}</span>`;
}

function renderRatingBars(avg) {
  const dims = [
    { key: "spin_reversal", label: "变化" },
    { key: "control", label: "控制" },
    { key: "attack", label: "进攻" },
    { key: "weirdness", label: "怪异" },
    { key: "durability", label: "耐用" },
  ];
  return dims
    .map((d) => {
      const v = avg[d.key] || 0;
      const pct = (v / 5) * 100;
      return `<div class="bar-row"><span class="bar-label">${d.label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;
    })
    .join("");
}

// ==================== Modal ====================
function openModal(code) {
  const r = allRubbers.find((x) => x.code === code);
  if (!r) return;
  const rating = ratings[code];
  const body = document.getElementById("modal-body");

  let html = `
    <div class="detail-header">
      <h2>${escapeHtml(r.brand)} ${escapeHtml(r.model)}</h2>
      <div class="detail-badges">
        ${r.isActive ? '<span class="badge badge-active">认证有效</span>' : '<span class="badge badge-expired">已过�?/span>'}
        ${r.code ? `<span class="badge badge-code">${escapeHtml(r.code)}</span>` : ""}
      </div>
    </div>
    <div class="detail-info">
      ${r.colors.length ? `<p><strong>颜色�?/strong>${r.colors.join("�?)}</p>` : ""}
      ${r.expiresOn ? `<p><strong>有效期至�?/strong>${formatDate(r.expiresOn)}</p>` : ""}
      ${r.hasOXVersion != null ? `<p><strong>OX 版本�?/strong>${r.hasOXVersion ? "�? : "�?}</p>` : ""}
    </div>`;

  if (rating && rating.count > 0) {
    html += `
      <div class="detail-radar">
        <h3>评分雷达�?/h3>
        ${renderRadar(rating.average)}
      </div>
      <div class="detail-bars">${renderRatingBars(rating.average)}</div>
      <div class="detail-overall">综合评分�?{rating.overall.toFixed(1)} / 5.0�?{rating.count} 人评价）</div>`;

    if (rating.styles && Object.keys(rating.styles).length) {
      const total = Object.values(rating.styles).reduce((s, v) => s + v, 0);
      html += `<div class="detail-styles"><h3>打法分布</h3><div class="style-bars">`;
      for (const [style, cnt] of Object.entries(rating.styles)) {
        const pct = total ? Math.round((cnt / total) * 100) : 0;
        html += `<div class="bar-row"><span class="bar-label">${escapeHtml(style)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-num">${cnt}�?(${pct}%)</span></div>`;
      }
      html += `</div></div>`;
    }

    if (rating.reviews && rating.reviews.length) {
      html += `<div class="detail-reviews"><h3>用户评价</h3>`;
      for (const rev of rating.reviews) {
        html += `
          <div class="review-item">
            <div class="review-meta">
              ${rev.style ? `<span>${escapeHtml(rev.style)}</span>` : ""}
              ${rev.position ? `<span>${escapeHtml(rev.position)}</span>` : ""}
              ${rev.sponge ? `<span>${escapeHtml(rev.sponge)}</span>` : ""}
            </div>
            ${rev.comment ? `<p class="review-text">${escapeHtml(rev.comment)}</p>` : ""}
          </div>`;
      }
      html += `</div>`;
    }
  } else {
    html += `<div class="detail-noreview">还没有人评价这款长胶，成为第一个评价的人吧�?/div>`;
  }

  const issueTitle = `评分 | ${r.brand} ${r.model} | ${code}`;
  const issueUrl = `https://github.com/${CONFIG.dataOwner}/${CONFIG.dataRepo}/issues/new?template=rating.yml&labels=rating&title=${encodeURIComponent(issueTitle)}`;
  html += `<a href="${issueUrl}" target="_blank" rel="noopener" class="btn-rate">�?我要评价</a>`;

  body.innerHTML = html;
  document.getElementById("modal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ==================== Radar Chart (SVG) ====================
function renderRadar(avg) {
  const dims = [
    { key: "spin_reversal", label: "变化" },
    { key: "control", label: "控制" },
    { key: "attack", label: "进攻" },
    { key: "weirdness", label: "怪异" },
    { key: "durability", label: "耐用" },
  ];
  const n = dims.length;
  const cx = 120, cy = 120, r = 80;
  const pts = dims.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const v = (avg[d.key] || 0) / 5;
    return [cx + Math.cos(angle) * r * v, cy + Math.sin(angle) * r * v];
  });
  const polygon = pts.map((p) => p.join(",")).join(" ");

  let grid = "";
  for (let level = 1; level <= 5; level++) {
    const gp = dims.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [cx + Math.cos(angle) * r * (level / 5), cy + Math.sin(angle) * r * (level / 5)].join(",");
    }).join(" ");
    grid += `<polygon points="${gp}" fill="none" stroke="#ddd" stroke-width="1"/>`;
  }

  let axes = "";
  let labels = "";
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    axes += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle) * r}" y2="${cy + Math.sin(angle) * r}" stroke="#ddd" stroke-width="1"/>`;
    const lx = cx + Math.cos(angle) * (r + 15);
    const ly = cy + Math.sin(angle) * (r + 15) + 4;
    labels += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="12" fill="#555">${dims[i].label}</text>`;
  }

  return `<svg viewBox="0 0 240 240" class="radar-svg">
    ${grid}${axes}
    <polygon points="${polygon}" fill="rgba(25,118,210,0.2)" stroke="#1976d2" stroke-width="2"/>
    ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#1976d2"/>`).join("")}
    ${labels}
  </svg>`;
}

// ==================== Utils ====================
function formatDate(d) {
  if (!d) return "�?;
  try { return new Date(d).toLocaleDateString("zh-CN"); } catch { return d; }
}
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

