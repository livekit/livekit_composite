/**
 * LiveKit GitHub URL Resolver - Background Service Worker
 *
 * ASSUMPTION: All callers (main.js, 404-detector.js) validate that URLs are
 * github.com/livekit/* or github.com/livekit-examples/* before calling these functions.
 * This file does NOT perform that sanity check - it trusts the upstream validation.
 */

// In-memory branch cache for all tabs to share
let branchCache = null;

/**
 * Prefetch and cache the branch data from JSON file
 * Only runs once when background service worker starts
 */
async function prefetchCache() {
    if (!branchCache) {
        console.log('[LiveKit Extension] Prefetching branch cache in background...');
        const res = await fetch(chrome.runtime.getURL('repo-default-branches.json'));
        branchCache = await res.json();
        console.log('[LiveKit Extension] Branch cache prefetched and ready');
    }
    return branchCache;
}

/**
 * Get the default branch for a repo
 * @param {string} org - Organization name (e.g., "livekit", "livekit-examples")
 * @param {string} repo - Repository name (e.g., "agents")
 * @returns {string} - Default branch name (e.g., "main", "master")
 */
function getDefaultBranch(org, repo) {
    const entry = branchCache?.[org]?.[repo];
    return entry?.branch || 'main';
}

/**
 * Check if a repo is marked as an override in the cache
 * @param {string} org - Organization name
 * @param {string} repo - Repository name
 * @returns {boolean} - True if marked as override
 */
function isOverride(org, repo) {
    const entry = branchCache?.[org]?.[repo];
    return entry?.isOverride === true;
}

/**
 * Update the branch cache for a specific repo
 * @param {string} org - Organization name
 * @param {string} repo - Repository name
 * @param {string} branch - Default branch name
 */
function updateBranchCache(org, repo, branch) {
    if (!branchCache[org]) {
        branchCache[org] = {};
    }
    branchCache[org][repo] = { branch: branch };
    console.log(`[LiveKit Extension] Cache updated: ${org}/${repo} -> ${branch}`);
}

/**
 * Fetch default branch from GitHub API
 * @param {string} org - Organization name
 * @param {string} repo - Repository name
 * @returns {Promise<string>} - Default branch name
 */
async function fetchDefaultBranchFromAPI(org, repo) {
    try {
        const response = await fetch(`https://api.github.com/repos/${org}/${repo}`);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        const data = await response.json();
        return data.default_branch;
    } catch (error) {
        console.error(`[LiveKit Extension] Failed to fetch branch for ${org}/${repo}:`, error);
        return 'main';
    }
}

/**
 * Converts a LiveKit composite repository URL to its source repository URL
 *
 * NOTE: This parses COMPOSITE URLs where the source org/repo are NESTED in the path.
 * Do not merge with parseSourceRepoUrl() - they handle different URL structures.
 *
 * Input:  https://github.com/livekit/livekit_composite/blob/{branch}/{org}/{repo}/{filePath}
 * Output: https://github.com/{org}/{repo}/blob/{branch}/{filePath}
 *
 * @param {string} url - The composite URL to convert
 * @returns {string|null} - The converted source URL, or null if conversion fails
 */
function convertCompositeToSource(url) {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    // parts: [livekit, livekit_composite, type, branch, org, repo, ...filePath]
    //         0        1                  2     3       4    5     6+
    if (parts[2] !== 'blob') {
        return null; // TODO: handle 'tree' in the future
    }

    if (parts.length < 7) {
        return null;
    }

    const [, , , , org, repo, ...filePathParts] = parts;
    const filePath = filePathParts.join('/');
    const branch = getDefaultBranch(org, repo);
    return `https://github.com/${org}/${repo}/blob/${branch}/${filePath}?utm_source=livekit_extension`;
}

/**
 * Parse a source repo URL (after redirect from composite) to extract org, repo, and file path
 *
 * NOTE: This parses SOURCE REPO URLs where org/repo are at the ROOT of the path.
 * Do not merge with convertCompositeToSource() - they handle different URL structures.
 *
 * Input: https://github.com/{org}/{repo}/blob/{branch}/{filePath}
 * Used by: tryResolveStaleBranch404() to re-resolve 404s from stale branch cache
 *
 * @param {string} url - GitHub source repo URL
 * @returns {object|null} - { org, repo, filePath } or null
 */
function parseSourceRepoUrl(url) {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    // parts: [org, repo, 'blob', branch, ...filePath]
    //         0    1      2       3       4+
    if (parts.length < 5 || parts[2] !== 'blob') {
        return null;
    }

    const [org, repo, , , ...filePathParts] = parts;
    return { org, repo, filePath: filePathParts.join('/') };
}

/**
 * Try to resolve a 404 caused by stale branch cache
 * @param {string} url - Current page URL
 * @returns {Promise<string|null>} - Redirect URL or null
 */
async function tryResolveStaleBranch404(url) {
    // Only handle redirects that came from our extension
    if (!url.includes('utm_source=livekit_extension')) {
        console.log('[LiveKit Extension] 404 not from extension, ignoring');
        return null;
    }

    const parsed = parseSourceRepoUrl(url);
    if (!parsed) {
        return null;
    }

    const { org, repo, filePath } = parsed;

    // If this is an override repo, trust the JSON and don't check API
    if (isOverride(org, repo)) {
        console.log(`[LiveKit Extension] Override repo ${org}/${repo}, file not found`);
        return null;
    }

    console.log(`[LiveKit Extension] 404 detected for ${org}/${repo}, checking GitHub API...`);

    // Get cached branch and fetch actual branch from API
    const cachedBranch = getDefaultBranch(org, repo);
    const apiBranch = await fetchDefaultBranchFromAPI(org, repo);

    // If they match, the cache is correct - this is a real 404
    if (cachedBranch === apiBranch) {
        console.log(`[LiveKit Extension] Branch is correct (${cachedBranch}), file not found`);
        return null;
    }

    // Cache is stale, update it
    console.log(`[LiveKit Extension] Cache stale: ${cachedBranch} -> ${apiBranch}, updating and redirecting`);
    updateBranchCache(org, repo, apiBranch);

    // Return the correct URL
    return `https://github.com/${org}/${repo}/blob/${apiBranch}/${filePath}?utm_source=livekit_extension`;
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'convertCompositeUrl') {
        // Convert composite URL to source URL (used by popup)
        prefetchCache().then(() => {
            const result = convertCompositeToSource(msg.url);
            sendResponse({ url: result });
        }).catch(err => {
            console.error('[LiveKit Extension] Error converting URL:', err);
            sendResponse({ url: null });
        });
        return true;
    }

    if (msg.type === 'handleLiveKit404') {
        // Handle 404 redirect logic (used by content script)
        prefetchCache().then(async () => {
            const redirectUrl = await tryResolveStaleBranch404(msg.url);
            sendResponse({ redirectUrl });
        }).catch(err => {
            console.error('[LiveKit Extension] Error handling 404:', err);
            sendResponse({ redirectUrl: null });
        });
        return true;
    }
});

console.log('[LiveKit Extension] Background service worker initialized');
