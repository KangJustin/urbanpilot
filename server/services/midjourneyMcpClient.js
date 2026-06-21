// Connects the backend directly to Midjourney's hosted MCP server
// (https://mcp.midjourney.com/mcp) using the same OAuth 2.1/PKCE flow the
// Midjourney MCP docs show for programmatic/backend clients (see their
// fastmcp Python example). This is a *user* OAuth flow: the first time the
// server needs to generate an image, it prints/opens an authorization URL
// and the person running the server must approve it once in a browser with
// their Midjourney account (use the hackathon Mega-plan account). After
// that, tokens are cached on disk and refreshed automatically.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { UnauthorizedError } = require('@modelcontextprotocol/sdk/client/auth.js');

const MCP_URL = 'https://mcp.midjourney.com/mcp';
const REDIRECT_PORT = Number(process.env.MIDJOURNEY_OAUTH_PORT) || 8090;
const REDIRECT_URL = `http://localhost:${REDIRECT_PORT}/callback`;
const TOKEN_STORE = path.join(__dirname, '..', '.mcp-auth', 'midjourney.json');

// On a fresh deploy (e.g. Render) there's no disk-persisted token from a prior interactive
// auth, and a headless container can't open a browser to do that auth itself. If an operator
// has already completed the one-time auth locally, MIDJOURNEY_TOKEN_CACHE can carry that same
// cached file's JSON content so the deployed instance starts already-authenticated. No-op
// (and no behavior change) when the file already exists or the env var isn't set — this is
// exactly today's local-dev path.
function seedTokenCacheFromEnv() {
  if (fs.existsSync(TOKEN_STORE)) return;
  const seed = process.env.MIDJOURNEY_TOKEN_CACHE;
  if (!seed) return;
  try {
    JSON.parse(seed); // validate before writing — a malformed seed should not silently corrupt auth
    fs.mkdirSync(path.dirname(TOKEN_STORE), { recursive: true });
    fs.writeFileSync(TOKEN_STORE, seed);
    console.log('[midjourney] Seeded token cache from MIDJOURNEY_TOKEN_CACHE env var.');
  } catch (err) {
    console.warn('[midjourney] MIDJOURNEY_TOKEN_CACHE is not valid JSON, ignoring:', err.message);
  }
}
seedTokenCacheFromEnv();

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`, () => {});
}

class FileOAuthClientProvider {
  constructor() {
    this._codeVerifier = undefined;
    try {
      const saved = JSON.parse(fs.readFileSync(TOKEN_STORE, 'utf8'));
      this._clientInformation = saved.clientInformation;
      this._tokens = saved.tokens;
    } catch {
      this._clientInformation = undefined;
      this._tokens = undefined;
    }
  }

  _persist() {
    fs.mkdirSync(path.dirname(TOKEN_STORE), { recursive: true });
    fs.writeFileSync(
      TOKEN_STORE,
      JSON.stringify({ clientInformation: this._clientInformation, tokens: this._tokens }, null, 2)
    );
  }

  get redirectUrl() {
    return REDIRECT_URL;
  }

  get clientMetadata() {
    return {
      redirect_uris: [REDIRECT_URL],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'UrbanPilot',
    };
  }

  clientInformation() {
    return this._clientInformation;
  }

  saveClientInformation(info) {
    this._clientInformation = info;
    this._persist();
  }

  tokens() {
    return this._tokens;
  }

  saveTokens(tokens) {
    this._tokens = tokens;
    this._persist();
  }

  saveCodeVerifier(verifier) {
    this._codeVerifier = verifier;
  }

  codeVerifier() {
    if (!this._codeVerifier) throw new Error('No code verifier saved');
    return this._codeVerifier;
  }

  redirectToAuthorization(authorizationUrl) {
    const url = authorizationUrl.toString();
    console.log(`\n[midjourney] One-time authorization required. Opening:\n${url}\n`);
    openBrowser(url);
  }
}

function waitForAuthorizationCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(error ? `<html><body>Authorization failed: ${error}</body></html>` : '<html><body>Authorized — you can close this tab.</body></html>');
      server.close();
      if (error) reject(new Error(error));
      else if (!code) reject(new Error('No authorization code received'));
      else resolve(code);
    });
    server.listen(REDIRECT_PORT);
  });
}

let clientPromise = null;

async function connectClient() {
  const provider = new FileOAuthClientProvider();
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider });
  const client = new Client({ name: 'urbanpilot', version: '1.0.0' });

  try {
    await client.connect(transport);
  } catch (err) {
    if (!(err instanceof UnauthorizedError)) throw err;
    const code = await waitForAuthorizationCode();
    await transport.finishAuth(code);
    await client.connect(transport);
  }
  return client;
}

function getClient() {
  if (!clientPromise) {
    clientPromise = connectClient().catch(err => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

module.exports = { getClient };
