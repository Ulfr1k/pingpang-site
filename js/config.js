/**
 * Config — adjust before deploying.
 *
 * dataOwner = GitHub user/org owning the pingpang-reviews repo.
 * The site tries local ./data/ files first (bundled), then falls back
 * to the reviews repo's raw URL. This lets the site work standalone
 * before the reviews repo is published.
 */
const CONFIG = {
  // Change to your GitHub username/org
  dataOwner: "YOUR_GITHUB_USERNAME",
  dataRepo: "pingpang-reviews",
  dataBranch: "main",

  // Try local bundled data first, then remote repo
  rubbersUrls: [
    "data/larc-long-rubbers.json",
    null, // filled at runtime with remote URL
  ],
  ratingsUrls: [
    "data/ratings.json",
    null,
  ],

  get remoteRubbersUrl() {
    return `https://raw.githubusercontent.com/${this.dataOwner}/${this.dataRepo}/${this.dataBranch}/data/larc-long-rubbers.json`;
  },
  get remoteRatingsUrl() {
    return `https://raw.githubusercontent.com/${this.dataOwner}/${this.dataRepo}/${this.dataBranch}/data/ratings.json`;
  },

  get issuesApiUrl() {
    return `https://api.github.com/repos/${this.dataOwner}/${this.dataRepo}/issues?labels=rating&state=open&per_page=100`;
  },

  ittfEquipmentUrl: "https://equipment.ittf.com/#/equipment_preview/racket_coverings/",
};

// Helper: try fetching from multiple URLs, return first that works
async function fetchFirst(urls) {
  for (const url of urls) {
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
  }
  return null;
}
