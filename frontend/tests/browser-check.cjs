// No dependencies. Run: node frontend/tests/browser-check.cjs
// Uses an installed Chrome/Edge and a local mock API; never contacts Kubernetes.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const browserPath = process.env.BROWSER_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
if (!browserPath) throw new Error('Set BROWSER_PATH to an installed Chrome or Edge executable.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-frontend-browser-'));
let mode = 'success';
const requests = [];
const errors = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/api/')) {
        let body = '';
        for await (const chunk of req) body += chunk;
        requests.push({ url: req.url, headers: req.headers, body });
        await pause(150);
        if (mode === 'network') return req.socket.destroy();
        if (mode === 'nonjson') { res.writeHead(502); return res.end('upstream unavailable'); }
        res.setHeader('Content-Type', 'application/json');
        if (mode === 'error') { res.writeHead(400); return res.end(JSON.stringify({ detail: 'Invalid YAML: secret-value' })); }
        if (mode === 'malformed') return res.end(JSON.stringify({ message: 'unexpected' }));
        return res.end(JSON.stringify({ total: mode === 'empty' ? 0 : 1, results: mode === 'empty' ? [] : [
            { name: '<img src=x onerror=alert(1)>', kind: 'ConfigMap', namespace: null, api_version: 'v1', status: 'APPLIED' }
        ] }));
    }
    const files = { '/': ['index.html', 'text/html'], '/css/styles.css': ['css/styles.css', 'text/css'], '/js/app.js': ['js/app.js', 'text/javascript'] };
    const file = files[req.url];
    if (!file) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', `${file[1]}; charset=utf-8`);
    res.end(fs.readFileSync(path.join(root, file[0])));
});

let browser;
let socket;
async function run() {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    browser.on('error', (error) => errors.push(error.message));
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile) && i < 100; i++) await pause(100);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const waiting = new Map();
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        if (message.id) {
            const callback = waiting.get(message.id);
            waiting.delete(message.id);
            if (callback) callback(message);
        }
    };
    const command = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence;
        const timeout = setTimeout(() => { waiting.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
        waiting.set(id, (message) => { clearTimeout(timeout); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
        const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    };
    const until = async (expression) => {
        for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(50); }
        throw new Error(`Timed out: ${expression}`);
    };
    await command('Runtime.enable');
    await command('Page.enable');
    await command('Page.navigate', { url: origin });
    await until('document.readyState === "complete" && typeof submitManifest === "function"');
    await evaluate(`element('api-url').value = ${JSON.stringify(origin)}`);
    assert.equal(requests.length, 0, 'No automatic apply on page load');
    await evaluate("element('submit-button').click()");
    assert.equal(requests.length, 0, 'Empty YAML must not be submitted');
    const tabBehavior = await evaluate(`(() => {
        const editor = element('manifest');
        editor.value = 'metadata:';
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        return { value: editor.value, cursor: editor.selectionStart, focused: document.activeElement === editor };
    })()`);
    assert.deepEqual(tabBehavior, { value: 'metadata:  ', cursor: 11, focused: true }, 'Tab inserts two spaces and retains editor focus');
    const yaml = 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: example';
    await evaluate(`element('manifest').value = ${JSON.stringify(yaml)}; element('submit-button').click(); element('submit-button').click()`);
    assert.equal(await evaluate("element('controls').disabled"), true);
    await until('!pending');
    assert.equal(requests.length, 1, 'Duplicate submissions blocked');
    assert.equal(requests[0].url, '/api/manifest/apply');
    assert.deepEqual(JSON.parse(requests[0].body), { manifest: yaml });
    assert.equal(await evaluate("element('feedback').dataset.state"), 'success');
    assert.equal(await evaluate("element('result-rows').querySelectorAll('img').length"), 0, 'Resource values must be text');
    assert.ok(await evaluate("element('result-rows').textContent.includes('Cluster-scoped')"));
    for (const width of [375, 768, 1440]) {
        await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `No page overflow at ${width}px`);
        assert.equal(await evaluate("element('submit-button').getBoundingClientRect().width > 0"), true);
        const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        fs.writeFileSync(path.join(profile, `viewport-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    }
    await evaluate("element('file-mode').click(); const transfer = new DataTransfer(); transfer.items.add(new File(['kind: ConfigMap'], 'example.yaml', {type: 'application/yaml'})); element('manifest-file').files = transfer.files; element('manifest-file').dispatchEvent(new Event('change')); element('submit-button').click()");
    await until('!pending');
    assert.equal(requests[1].url, '/api/manifest/apply-file');
    assert.match(requests[1].headers['content-type'], /^multipart\/form-data; boundary=/);
    assert.match(requests[1].body, /name="file"; filename="example.yaml"/);
    await evaluate("element('text-mode').click()");
    for (const state of ['empty', 'error', 'nonjson', 'malformed', 'network']) {
        mode = state;
        await evaluate("element('submit-button').click()");
        await until('!pending');
        assert.equal(await evaluate("element('feedback').dataset.state"), state === 'empty' ? 'empty' : 'error');
        assert.equal(await evaluate("element('manifest').value"), yaml, 'Preserve user input');
        assert.equal(await evaluate("element('controls').disabled"), false);
        assert.equal(await evaluate("element('table-wrapper').hidden"), true);
        assert.equal(await evaluate("element('feedback').textContent.includes('secret-value')"), false);
    }
    assert.deepEqual(errors, [], 'No uncaught browser JavaScript exceptions');
    console.log('PASS: text/file API contracts, duplicate prevention, safe rendering, loading/empty/error states, input preservation, responsive widths, browser exceptions.');
    console.log(`Screenshots: ${profile}`);
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
    if (socket) socket.close();
    if (browser) browser.kill();
    server.closeAllConnections();
    server.close();
});
