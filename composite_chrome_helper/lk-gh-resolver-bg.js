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
 * @param {string} url - The URL to convert
 * @returns {string|null} - The converted source URL, or null if conversion fails
 */
function convertCompositeToSource(url) {
    const prefix = 'https://github.com/livekit/livekit_composite/blob/';

    if (!url.startsWith(prefix)) {
        return null;
    }

    const rest = url.slice(prefix.length);
    const match = rest.match(/^[^/]+\/([^/]+)\/([^/]+)\/(.+)$/);

    if (match) {
        const [, org, repo, filePath] = match;
        const branch = getDefaultBranch(org, repo);
        return `https://github.com/${org}/${repo}/blob/${branch}/${filePath}?utm_source=livekit_extension`;
    }

    return null;
}

/**
 * Parse GitHub URL to extract org, repo, and file path
 * @param {string} url - GitHub URL
 * @returns {object|null} - Parsed components or null
 */
function parseGitHubUrl(url) {
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/[^/]+\/(.+)$/);
    if (match) {
        return {
            org: match[1],
            repo: match[2],
            filePath: match[3]
        };
    }
    return null;
}

/**
 * Handle 404 redirect logic - called from content script
 * @param {string} url - Current page URL
 * @returns {Promise<string|null>} - Redirect URL or null
 */
async function handle404Redirect(url) {
    // Only handle redirects that came from our extension
    if (!url.includes('utm_source=livekit_extension')) {
        console.log('[LiveKit Extension] 404 not from extension, ignoring');
        return null;
    }

    const parsed = parseGitHubUrl(url);
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
    if (msg.type === 'getBranchCache') {
        // Return the prefetched cache to content script
        prefetchCache().then(data => {
            sendResponse({ data });
        });
        return true;
    }

    if (msg.type === 'updateBranchCache') {
        // Update the in-memory cache when API discovers new branch
        prefetchCache().then(() => {
            const { org, repo, branch } = msg;
            updateBranchCache(org, repo, branch);
            sendResponse({ success: true });
        });
        return true;
    }

    if (msg.type === 'convertUrl') {
        // Convert composite URL to source URL (used by popup)
        prefetchCache().then(() => {
            const result = convertCompositeToSource(msg.url);
            sendResponse({ url: result });
        });
        return true;
    }

    if (msg.type === 'handle404') {
        // Handle 404 redirect logic (used by content script)
        prefetchCache().then(async () => {
            const redirectUrl = await handle404Redirect(msg.url);
            sendResponse({ redirectUrl });
        });
        return true;
    }
});

console.log('[LiveKit Extension] Background service worker initialized');
