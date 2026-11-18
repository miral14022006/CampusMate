import http from 'http';
import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
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

async function audit() {
  console.log('--- Starting Web Vitals & Accessibility Audit ---');
  const preview = spawn('npx', ['vite', 'preview', '--port', '5189'], {
    cwd: path.resolve('client')
  });

  await new Promise(r => setTimeout(r, 2000));

  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9555',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    'http://localhost:5189/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const tabs = await fetchJson('http://127.0.0.1:9555/json/list');
    const wsUrl = (tabs.find(t => t.type === 'page') || tabs[0])?.webSocketDebuggerUrl;

    const WebSocket = globalThis.WebSocket;
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    // Enable domains
    await sendCDP(ws, 'Performance.enable');
    await sendCDP(ws, 'Page.enable');

    // Emulate Desktop 1366x768
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:5189/' });
    await new Promise(r => setTimeout(r, 3000));

    // Measure CLS, LCP, Navigation Timing
    const evalMetrics = await sendCDP(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          let cls = 0;
          let lcp = 0;
          const po = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                cls += entry.value;
              }
              if (entry.entryType === 'largest-contentful-paint') {
                lcp = entry.startTime;
              }
            }
          });
          try {
            po.observe({ type: 'layout-shift', buffered: true });
            po.observe({ type: 'largest-contentful-paint', buffered: true });
          } catch(e) {}

          const [nav] = performance.getEntriesByType('navigation');
          const domContentLoaded = nav ? nav.domContentLoadedEventEnd : 0;
          const loadComplete = nav ? nav.loadEventEnd : 0;

          // Accessibility basic validation
          const images = Array.from(document.querySelectorAll('img, svg')).map(el => ({
            tag: el.tagName.toLowerCase(),
            hasAltOrAria: !!(el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('aria-hidden'))
          }));
          const buttons = Array.from(document.querySelectorAll('button, a')).map(el => ({
            tag: el.tagName.toLowerCase(),
            hasAccessibleName: !!(el.innerText?.trim() || el.getAttribute('aria-label') || el.getAttribute('title'))
          }));

          return {
            cls,
            lcp: lcp || domContentLoaded,
            domContentLoaded: Math.round(domContentLoaded),
            loadComplete: Math.round(loadComplete),
            imagesTotal: images.length,
            imagesAccessible: images.filter(i => i.hasAltOrAria).length,
            buttonsTotal: buttons.length,
            buttonsAccessible: buttons.filter(b => b.hasAccessibleName).length
          };
        })()
      `,
      returnByValue: true
    });

    const val = evalMetrics.result?.value;
    console.log('AUDIT REPORT:');
    console.log(`- Cumulative Layout Shift (CLS): ${val?.cls.toFixed(4)} (Threshold < 0.05: ${val?.cls < 0.05 ? 'PASS' : 'FAIL'})`);
    console.log(`- Largest Contentful Paint (LCP estimate): ${val?.lcp}ms (Threshold < 2500ms: ${val?.lcp < 2500 ? 'PASS' : 'FAIL'})`);
    console.log(`- DOM Content Loaded: ${val?.domContentLoaded}ms`);
    console.log(`- Accessible Images/SVGs: ${val?.imagesAccessible}/${val?.imagesTotal}`);
    console.log(`- Accessible Buttons/Links: ${val?.buttonsAccessible}/${val?.buttonsTotal}`);

    ws.close();
  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    chromeProc.kill();
    preview.kill();
  }
}

audit();
