// One-time setup script — run once to get a refresh token for the Gmail
// account you want to send magic-link emails from.
//
// Usage:
//   1. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env first
//      (from Google Cloud Console — see README section on Gmail setup).
//   2. Run: npm run get-gmail-token
//   3. Open the printed URL, sign in with the Gmail account you want to
//      send from, approve access.
//   4. The refresh token prints in this terminal — copy it into
//      backend/.env as GMAIL_REFRESH_TOKEN.
//
// You only need to run this once per Gmail account. Re-run it if you ever
// revoke access or switch which Gmail account sends the emails.

import http from 'http';
import { google } from 'googleapis';
import 'dotenv/config';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env first, then re-run this.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forces Google to issue a refresh_token even if you've authorized this app before
  scope: ['https://www.googleapis.com/auth/gmail.send'],
});

console.log('\n1. Open this URL in your browser and sign in with the Gmail account you want to send FROM:\n');
console.log(authUrl);
console.log('\n2. Approve access. Your browser will redirect back here automatically — leave this running.\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.end('Waiting for the OAuth redirect...');
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end(`Authorization failed: ${error}. Check your terminal and try again.`);
    console.error(`\n❌ Authorization failed: ${error}\n`);
    server.close();
    process.exit(1);
  }

  res.end('Success! You can close this tab and return to your terminal.');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error(
        '\n⚠️  No refresh token returned. This usually means the account already granted access before.\n' +
          'Go to https://myaccount.google.com/permissions, remove access for this app, and run this script again.\n'
      );
      process.exit(1);
    }
    console.log('\n✅ Refresh token generated — add this to backend/.env:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    console.error('\n❌ Failed to exchange code for tokens:', err.message, '\n');
  }
  process.exit(0);
});

server.listen(PORT);
