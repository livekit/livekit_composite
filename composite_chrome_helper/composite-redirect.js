/**
 * Converts a LiveKit composite repository URL to its source repository URL
 *
 * @param {string} url - The URL to convert
 * @returns {string|null} - The converted source URL, or null if conversion fails
 *
 * @example
 * Input:  https://github.com/livekit/livekit_composite/blob/main/livekit/agents/file.py
 * Output: https://github.com/livekit/agents/blob/main/file.py
 */
export function convertCompositeToSource(url) {
    const prefix = 'https://github.com/livekit/livekit_composite/blob/';

    if (!url.startsWith(prefix)) {
        return null; // Not a composite URL
    }

    const rest = url.slice(prefix.length);
    const match = rest.match(/^[^/]+\/([^/]+)\/([^/]+)\/(.+)$/);

    if (match) {
        const [, org, repo, filePath] = match;
        return `https://github.com/${org}/${repo}/blob/main/${filePath}`;
    }

    return null; // Could not parse the URL structure
}
