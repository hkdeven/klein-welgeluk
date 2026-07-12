import { JWT } from "google-auth-library";

// Google Sheets access via a service account. Requires three env vars:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL       — the service account's email
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — its private key (with literal \n escapes)
//   RESOURCES_SHEET_ID                 — the spreadsheet ID (from its URL)
// The sheet must be shared with the service account email (Editor).

let client: JWT | null | undefined;

function getClient(): JWT | null {
  if (client !== undefined) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !key) {
    client = null;
    return null;
  }
  client = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return client;
}

export const sheetsConfigured = () =>
  !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.RESOURCES_SHEET_ID);

const sheetId = () => process.env.RESOURCES_SHEET_ID;

// Read a rectangular range; returns a 2D array of strings (first row = headers).
export async function getRows(range = "A:Z"): Promise<string[][] | null> {
  const c = getClient();
  if (!c || !sheetId()) return null;
  const res = await c.request<{ values?: string[][] }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId()}/values/${encodeURIComponent(range)}`,
  });
  return res.data.values || [];
}

// Append a single row to the end of the sheet.
export async function appendRow(row: (string | number)[], range = "A:Z"): Promise<void> {
  const c = getClient();
  if (!c || !sheetId()) throw new Error("Google Sheets not configured");
  await c.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId()}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    method: "POST",
    data: { values: [row] },
  });
}
