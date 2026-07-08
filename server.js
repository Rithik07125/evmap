const http = require('http');
const https = require('https');

// ====== TOKENS (set these as environment variables in Railway, not hardcoded) ======
const ION_FINGERPRINT = process.env.ION_FINGERPRINT || 'b8c9ecc9-c874-4205-9a44-a8fa25c8c15f';
const UAEV_BEARER_TOKEN = process.env.UAEV_BEARER_TOKEN || '';
const ZYNETIC_BEARER_TOKEN = process.env.ZYNETIC_BEARER_TOKEN || '';
const ZYNETIC_ORG_ID = process.env.ZYNETIC_ORG_ID || 'org_r6t7OyT6gEOSjoeJQiRRSSH6AYCgWFDF';
const PORT = process.env.PORT || 3001;
// ======================================

const UAEV_IDS = [98, 75, 74, 91, 66, 93, 94, 100, 88, 69, 30, 73, 67, 39, 77, 79, 76, 41, 50, 68, 102, 86, 95, 42, 78, 87, 40, 9, 85, 83, 29, 81, 4, 92, 89, 80, 45, 8, 53, 55, 33, 57, 7, 10, 32, 70, 43, 62, 84, 90, 51, 26, 65, 37, 54, 36, 52, 61, 18, 21, 23, 44, 19, 17, 38, 22, 60, 31, 58, 13, 24, 20, 47, 82, 46, 48, 49, 64];

const E2GO_CENTRES = [
  {lat:25.2048,lng:55.2708},{lat:25.1865,lng:55.2780},{lat:25.0657,lng:55.1713},
  {lat:25.2285,lng:55.3273},{lat:25.1972,lng:55.1390},{lat:25.1124,lng:55.2098},
  {lat:25.0780,lng:55.1365},{lat:25.2582,lng:55.3076},{lat:25.1760,lng:55.4120},
  {lat:25.0500,lng:55.3000},{lat:25.0000,lng:55.1500},{lat:25.3100,lng:55.4500},
  {lat:25.1500,lng:55.3500},{lat:25.0200,lng:55.0800},{lat:25.2900,lng:55.2300},
  {lat:25.3462,lng:55.4272},{lat:25.4111,lng:55.4350},{lat:25.3750,lng:55.5000},
  {lat:25.4000,lng:55.6000},{lat:25.5176,lng:55.5504},{lat:25.4700,lng:55.5100},
  {lat:25.6764,lng:55.7750},{lat:25.8000,lng:55.9500},{lat:25.7500,lng:56.0000},
  {lat:25.1164,lng:56.3414},{lat:25.2800,lng:56.3500},{lat:25.3500,lng:56.2500},
  {lat:24.4539,lng:54.3773},{lat:24.4000,lng:54.5000},{lat:24.4800,lng:54.6000},
  {lat:24.5000,lng:54.4000},{lat:24.3800,lng:54.3000},{lat:24.4200,lng:54.2000},
  {lat:24.4650,lng:54.3600},{lat:24.4900,lng:54.3200},{lat:24.3500,lng:54.4500},
  {lat:24.4100,lng:54.4800},{lat:24.3200,lng:54.3800},{lat:24.4700,lng:54.5500},
  {lat:24.4357,lng:54.6190},{lat:24.4274,lng:54.6072},{lat:24.4764,lng:54.6231},
  {lat:24.5200,lng:54.6800},{lat:24.3600,lng:54.5200},{lat:24.3000,lng:54.6000},
  {lat:24.4600,lng:54.6500},{lat:24.5000,lng:54.5800},{lat:24.4100,lng:54.6900},
  {lat:24.3800,lng:54.6400},{lat:24.4900,lng:54.7200},{lat:24.5300,lng:54.6000},
  {lat:24.3400,lng:54.5800},{lat:24.4200,lng:54.7500},{lat:24.5600,lng:54.6500},
  {lat:24.3100,lng:54.6800},{lat:24.4500,lng:54.8000},{lat:24.5000,lng:54.7800},
  {lat:24.3900,lng:54.6100},{lat:24.5450,lng:54.4370},{lat:24.5100,lng:54.4100},
  {lat:24.5300,lng:54.4500},{lat:24.4800,lng:54.3800},{lat:24.5700,lng:54.4800},
  {lat:24.2075,lng:55.7447},{lat:24.1500,lng:55.8000},{lat:24.2500,lng:55.7000},
  {lat:24.1800,lng:55.7200},{lat:24.2300,lng:55.8500},{lat:24.0800,lng:55.7600},
  {lat:24.2100,lng:55.6800},{lat:24.1200,lng:55.7900},{lat:24.2700,lng:55.8000},
  {lat:24.0000,lng:53.5000},{lat:23.5000,lng:54.0000},{lat:24.1000,lng:52.8000},
  {lat:24.5000,lng:52.5000},{lat:24.0000,lng:52.0000},{lat:23.0000,lng:53.0000},
  {lat:24.1100,lng:53.6500},{lat:23.8000,lng:53.7000},{lat:24.3000,lng:53.0000},
];

// ---- Cache ----
let e2goCache = null;
let e2goLastFetch = 0;
const E2GO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Helpers ----
function httpsGet(url, headers) {
  return new Promise((resolve) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve) => {
    const options = { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) } };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

// ---- ION ----
async function fetchIon() {
  return httpsGet(
    'https://api.ion.ae/api/v1/driver/charge-site?latitude=25.3582&longitude=55.4274&distance=0',
    { 'x-device-fingerprint': ION_FINGERPRINT, 'x-client-version': '1.46.1', 'x-build-number': '133', 'accept': '*/*', 'accept-language': 'en-AE', 'user-agent': 'IonDriver/1.46.1 (iOS; 26.5; Build/133)' }
  );
}

// ---- UAEV ----
async function fetchUaev() {
  const locObj = {};
  UAEV_IDS.forEach(id => locObj[id] = '');
  const body = JSON.stringify({ locations: locObj });
  const result = await httpsPost('uaev.uae-uaev.charge.ampeco.tech', '/api/v1/app/locations?operatorCountry=AE',
    { 'Authorization': 'Bearer ' + UAEV_BEARER_TOKEN, 'x-operator-country': 'AE', 'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'x-mobile-app-bundle-id': 'com.etihadwe.evcharging', 'User-Agent': 'ChargeMobile/1782724343 CFNetwork/3860.600.12 Darwin/25.5.0' },
    body
  );
  return result ? result.locations : null;
}

// ---- E2GO sweep ----
async function sweepE2go() {
  console.log('E2GO: starting sweep...');
  const allById = {};
  for (const c of E2GO_CENTRES) {
    const result = await httpsGet(
      `https://api.adnocmob.adnocdistribution.ae/v1/services/ev/locations?lat=${c.lat}&long=${c.lng}&page=0`,
      { 'Accept': '*/*', 'X-Device-OS-Version': '26.5', 'X-API-Version': 'v2', 'X-Device-Platform': 'ios', 'User-Agent': 'ADNOC%20Dist/1 CFNetwork/3860.600.12 Darwin/25.5.0', 'X-Device-Id': '4BCFD439-8821-417C-B0B2-B54D44BE68BC', 'X-App-Version': '5.12.5', 'X-Device-Model': 'iPhone 15' }
    );
    if (result && result.locations) {
      result.locations.forEach(loc => { allById[loc.id] = loc; });
    }
    await delay(60);
  }
  const all = Object.values(allById);
  e2goCache = { locations: all };
  e2goLastFetch = Date.now();
  console.log(`E2GO: sweep complete — ${all.length} unique stations cached`);
  return e2goCache;
}

async function getE2go() {
  if (!e2goCache || (Date.now() - e2goLastFetch) > E2GO_CACHE_TTL) {
    return sweepE2go();
  }
  return e2goCache;
}

// Run first sweep immediately on startup
sweepE2go();
// Re-sweep every 5 minutes to keep status fresh
setInterval(sweepE2go, E2GO_CACHE_TTL);

// ---- Zynetic ----
async function fetchZynetic() {
  return httpsGet(
    'https://zynetic.axoir.com/api/v1/app/chargers/locations/summary',
    {
      'Authorization': 'Bearer ' + ZYNETIC_BEARER_TOKEN,
      'X-Organization-Id': ZYNETIC_ORG_ID,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'ktor-client'
    }
  );
}

// ---- DEWA ----
function getWithCookies(hostname, path) {
  return new Promise((resolve) => {
    https.get({
      hostname, path, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ html: data, cookies: res.headers['set-cookie'] || [] }));
    }).on('error', () => resolve({ html: '', cookies: [] }));
  });
}

async function fetchDewa() {
  // Step 1: load the page to get a fresh CSRF token + session cookie
  const { html, cookies } = await getWithCookies('www.dewa.gov.ae', '/en/consumer/ev-community/ev-green-charger-stations');
  const tokenMatch = html.match(/__RequestVerificationToken[^>]*value="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token || !cookies.length) return null;
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

  // Step 2: POST to the data endpoint using that token + cookie
  const body = JSON.stringify({
    onlinemapinputs: { vendorid: '', lang: 'EN', evcharger: 'X' },
    __RequestVerificationToken: token
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'www.dewa.gov.ae',
      path: '/en/api/EVLocation/GetMapDataPoints',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.dewa.gov.ae/en/consumer/ev-community/ev-green-charger-stations',
        'Cookie': cookieHeader,
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

// ---- Server ----
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url.startsWith('/ion')) {
    const data = await fetchIon();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));

  } else if (req.url.startsWith('/uaev')) {
    const data = await fetchUaev();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));

  } else if (req.url.startsWith('/e2go')) {
    const data = await getE2go();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));

  } else if (req.url.startsWith('/zynetic')) {
    const data = await fetchZynetic();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));

  } else if (req.url.startsWith('/dewa')) {
    const data = await fetchDewa();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));

  } else if (req.url === '/' || req.url.startsWith('/health')) {
    // Health check endpoint so Railway (or uptime pings) has something to hit at root
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', e2goCacheAge: e2goLastFetch ? Date.now() - e2goLastFetch : null }));

  } else {
    res.writeHead(404);
    res.end('Use /ion, /uaev, /e2go, /zynetic, /dewa, or /health');
  }
}).listen(PORT, () => {
  console.log(`Combined proxy running on port ${PORT}`);
  console.log('  ION:     /ion');
  console.log('  UAEV:    /uaev');
  console.log('  E2GO:    /e2go');
  console.log('  Zynetic: /zynetic');
  console.log('  DEWA:    /dewa');
  console.log('  Health:  /health');
});
