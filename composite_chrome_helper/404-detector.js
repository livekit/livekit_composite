/**
 * Content script for 404 detection and redirect handling
 * All business logic is in the background service worker
 */

const browser = typeof globalThis.chrome !== 'undefined' ? globalThis.chrome : globalThis.browser;

/**
 * Check if current page is a 404 on a LiveKit repo
 * @returns {boolean}
 */
function isLiveKitRepo404() {
    // Check if it's a 404 page
    const is404 = document.title.includes('Page not found') ||
                  document.title.includes('404') ||
                  document.querySelector('img[alt="404"]') !== null;

    if (!is404) return false;

    // Check if it's a livekit or livekit-examples repo
    const url = window.location.href;
    return url.startsWith('https://github.com/livekit/') ||
           url.startsWith('https://github.com/livekit-examples/');
}

/**
 * Handle 404 detection and request redirect from background worker
 */
async function handle404Redirect() {
    if (!isLiveKitRepo404()) {
        return;
    }

    console.log('[LiveKit Extension] 404 detected, requesting redirect check from background...');

    try {
        const response = await browser.runtime.sendMessage({
            type: 'handleLiveKit404',
            url: window.location.href
        });

        if (response.redirectUrl) {
            console.log(`[LiveKit Extension] Redirecting to: ${response.redirectUrl}`);
            window.location.href = response.redirectUrl;
        }
    } catch (error) {
        console.error('[LiveKit Extension] Failed to handle 404:', error);
    }
}

// Run 404 handler when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(handle404Redirect, 500);
    });
} else {
    setTimeout(handle404Redirect, 500);
}
