/**
 * Browser stub for expo-sqlite.
 *
 * expo-sqlite uses native SQLite bindings unavailable in the browser.
 * Vite aliases this module to this stub so the bundle can be built.
 * The server-side memory DB (better-sqlite3) is used instead; any
 * attempt to open a database in the browser throws immediately.
 */

export async function openDatabaseAsync(): Promise<never> {
  throw new Error(
    "[pilot] expo-sqlite is not available in the browser — use the server memory API instead",
  );
}
