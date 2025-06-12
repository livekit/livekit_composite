let applicationLK = document.getElementById("applicationLK");
let information = document.getElementById("information");

function copy(text) {
    const ta = document.createElement('textarea');
    ta.style.cssText = 'opacity:0; position:fixed; width:1px; height:1px; top:0; left:0;';
    ta.value = text;
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    ta.remove();
}

function fillField(container, name, value, tabId) {
    const entry = document.createElement('div');
    entry.className = 'storage-entry';

    if (name.startsWith('loglevel:')) {
        entry.innerHTML = `<b>${name}:</b><br />`;
        const select = document.createElement('select');
        ['DEBUG', 'INFO', 'WARN', 'ERROR'].forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            option.selected = (value === level);
            select.appendChild(option);
        });
        select.addEventListener('change', (e) => {
            const newValue = e.target.value;
            browser.scripting.executeScript({
                target: { tabId: tabId },
                func: (key, value) => {
                    localStorage.setItem(key, value);
                },
                args: [name, newValue]
            });
        });
        entry.appendChild(select);
    } else {
        entry.innerHTML = `<b>${name}:</b><br /><span>${value}</span>`;
        entry.addEventListener('click', () => copy(value));
    }
    container.appendChild(entry);
}

if (typeof browser === "undefined") {
    var browser = chrome;
}

function getCurrentWindowTabs() {
    return browser.tabs.query({ currentWindow: true, active: true });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Always show tools in the LiveKit tab
    information.innerHTML = `
        <div class="tool-section">
            <button class="tool-button" id="go-to-source-btn" style="margin-bottom: 12px;">
                Go To Source
                <span class="tool-description">Convert composite repo URL to source repo</span>
            </button>
            <button class="tool-button" id="ask-deepwiki-btn" style="margin-bottom: 12px;">
                Ask DeepWiki
                <span class="tool-description">Open DeepWiki for this composite repo</span>
            </button>
            <h3>Debugging Tools</h3>
            <button class="tool-button" id="cloud-dashboard">
                Cloud Dashboard
                <span class="tool-description">Manage your LiveKit cloud projects</span>
            </button>
            <button class="tool-button" id="livekit-status">
                LiveKit Cloud Status
                <span class="tool-description">Real-time service status dashboard</span>
            </button>
            <button class="tool-button" id="webrtc-internals">
                Open WebRTC Internals
                <span class="tool-description">Chrome's WebRTC diagnostic page</span>
            </button>
            <button class="tool-button" id="webrtc-test">
                Run WebRTC Browser Test
                <span class="tool-description">LiveKit's connectivity check</span>
            </button>
            <button class="tool-button" id="chrome-flags">
                Open Chrome Flags
                <span class="tool-description">Experimental browser features</span>
            </button>
            <h3>Docs</h3>
            <button class="tool-button" id="docs-link">
                Documentation
                <span class="tool-description">LiveKit's official documentation</span>
            </button>
            <button class="tool-button" id="github-livekit">
                GitHub LiveKit
                <span class="tool-description">Core LiveKit repository</span>
            </button>
            <button class="tool-button" id="github-examples">
                LiveKit Examples
                <span class="tool-description">Official code examples and demos</span>
            </button>
        </div>
    `;

    information.querySelector('#go-to-source-btn').addEventListener('click', async () => {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tab.url;
        const prefix = 'https://github.com/livekit/livekit_composite/blob/';
        if (currentUrl.startsWith(prefix)) {
            const rest = currentUrl.slice(prefix.length);
            const match = rest.match(/^[^/]+\/([^/]+)\/([^/]+)\/(.+)$/);
            if (match) {
                const [, org, repo, filePath] = match;
                const newUrl = `https://github.com/${org}/${repo}/blob/main/${filePath}`;
                browser.tabs.update(tab.id, { url: newUrl });
                return;
            }
        }
        alert('This is not a livekit_composite file URL or could not parse the path.');
    });

    information.querySelector('#ask-deepwiki-btn').addEventListener('click', () => {
        browser.tabs.create({ url: 'https://deepwiki.com/livekit/livekit_composite' });
    });

    information.querySelector('#livekit-status').addEventListener('click', () => {
        browser.tabs.create({ url: 'https://status.livekit.io/' });
    });
    information.querySelector('#webrtc-internals').addEventListener('click', () => {
        alert('Cannot open chrome:// URLs from an extension. Please open this page manually.');
    });
    information.querySelector('#webrtc-test').addEventListener('click', () => {
        browser.tabs.create({ url: 'https://livekit.io/webrtc/browser-test' });
    });
    information.querySelector('#chrome-flags').addEventListener('click', () => {
        alert('Cannot open chrome:// URLs from an extension. Please open this page manually.');
    });
    information.querySelector('#cloud-dashboard').addEventListener('click', () => {
        browser.tabs.create({ url: 'https://cloud.livekit.io/' });
    });
    information.querySelector('#docs-link').addEventListener('click', () => {
        browser.tabs.create({ url: 'https://docs.livekit.io/home/' });
    });
    information.querySelector('#github-livekit').addEventListener('click', () => {
        browser.tabs.create({ url: 'https://github.com/livekit/livekit' });
    });
    information.querySelector('#github-examples').addEventListener('click', () => {
        browser.tabs.create({ url: 'https://github.com/livekit-examples' });
    });
});
