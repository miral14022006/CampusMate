import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
];

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  console.log('Starting preview server and Chrome headless...');

  // Start Vite preview on port 5174
  const preview = spawn('npx', ['vite', 'preview', '--port', '5174'], {
    cwd: path.resolve('client')
  });

  await new Promise(r => setTimeout(r, 2000));

  // Launch Chrome headless
  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9444',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    'http://localhost:5174/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const tabs = await fetchJson('http://127.0.0.1:9444/json/list');
    const targetTab = tabs.find(t => t.type === 'page') || tabs[0];
    const wsUrl = targetTab?.webSocketDebuggerUrl;

    if (!wsUrl) {
      throw new Error('No WebSocket debugger URL found from Chrome');
    }

    const WebSocket = globalThis.WebSocket;
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    console.log('Connected to Chrome DevTools WebSocket successfully.');

    let allViewportsPassed = true;

    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`VERIFYING VIEWPORT: ${vp.width}x${vp.height}`);
      console.log(`======================================================`);

      // Set Emulation viewport
      await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: false
      });

      await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:5174/' });
      // Allow fonts and layouts to settle
      await new Promise(r => setTimeout(r, 1200));

      const res = await sendCDP(ws, 'Runtime.evaluate', {
        expression: `
          (() => {
            const scenes = Array.from(document.querySelectorAll('section.scene'));
            const expectedHeight = window.innerHeight;
            const docH = document.documentElement.clientHeight;
            const innerH = window.innerHeight;

            const sceneData = scenes.map((s, idx) => {
              const rect = s.getBoundingClientRect();
              const h = rect.height;
              const scrollH = s.scrollHeight;
              const clientH = s.clientHeight;
              const diff = Math.abs(h - expectedHeight);
              return {
                idx: idx + 1,
                id: s.id,
                height: h,
                diff,
                scrollH,
                clientH,
                overflow: scrollH > clientH + 1
              };
            });

            // Also check nav link mapping for scrollspy
            const navLinks = Array.from(document.querySelectorAll('header nav a')).map(a => ({
              text: a.innerText.trim().split('\\n')[0],
              href: a.getAttribute('href'),
              current: a.getAttribute('aria-current')
            }));

            return {
              expectedHeight,
              innerH,
              docH,
              count: scenes.length,
              scenes: sceneData,
              navLinks
            };
          })()
        `,
        returnByValue: true
      });

      const result = res.result?.value;
      if (result) {
        console.log(`Expected Scene Height (window.innerHeight): ${result.expectedHeight}px (Scenes found: ${result.count})`);

        let heightsMatch = true;
        let noOverflow = true;

        for (const sc of result.scenes) {
          const match = sc.diff <= 1.0;
          if (!match) heightsMatch = false;
          if (sc.overflow) noOverflow = false;

          console.log(
            `Scene ${sc.idx} [#${sc.id.padEnd(8)}]: height = ${sc.height.toFixed(1)}px (diff: ${sc.diff.toFixed(1)}px, match: ${match ? 'YES' : 'NO'}) | scroll: ${sc.scrollH}px / client: ${sc.clientH}px | Overflow: ${sc.overflow ? 'FAIL' : 'PASS'}`
          );
        }

        console.log(`\nView Port Results (${vp.width}x${vp.height}):`);
        console.log(`- Equal height across 7 scenes (within 1px): ${heightsMatch ? 'PASS ✓' : 'FAIL ✗'}`);
        console.log(`- Content block overflow-free: ${noOverflow ? 'PASS ✓' : 'FAIL ✗'}`);

        if (!heightsMatch || !noOverflow) {
          allViewportsPassed = false;
        }
      }
    }

    // Scroll down to check scrollspy mapping on dates and about
    console.log(`\n======================================================`);
    console.log(`CHECKING SCROLLSPY NAV LINK HIGHLIGHTS`);
    console.log(`======================================================`);

    const scrollspyTests = ['home', 'features', 'how', 'demo', 'dates', 'about', 'contact'];
    for (const targetId of scrollspyTests) {
      await sendCDP(ws, 'Runtime.evaluate', {
        expression: `
          (() => {
            const el = document.getElementById('${targetId}');
            if (el) el.scrollIntoView({ behavior: 'instant' });
          })()
        `
      });
      await new Promise(r => setTimeout(r, 600));

      const navEval = await sendCDP(ws, 'Runtime.evaluate', {
        expression: `
          (() => {
            const activeNav = document.querySelector('header nav a[aria-current="page"]');
            return activeNav ? activeNav.innerText.trim().split('\\n')[0] : 'None';
          })()
        `,
        returnByValue: true
      });

      console.log(`Scrolled to #${targetId.padEnd(8)} -> Active Nav Link: "${navEval.result?.value}"`);
    }

    console.log(`\n======================================================`);
    console.log(`ALL 7 SCENES & VIEWPORTS VERIFICATION: ${allViewportsPassed ? 'SUCCESS' : 'FAILED'}`);
    console.log(`======================================================`);

    ws.close();
  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    chromeProc.kill();
    preview.kill();
  }
}

run();
