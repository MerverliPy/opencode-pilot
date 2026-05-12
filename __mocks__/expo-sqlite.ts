/**
 * In-memory SQLite mock for testing.
 * Supports basic CRUD: CREATE TABLE, INSERT, SELECT, UPDATE, DELETE.
 */

type Row = Record<string, any>;
type Table = { columns: string[]; rows: Row[] };

class InMemoryDb {
  tables: Map<string, Table> = new Map();

  async execAsync(sql: string): Promise<void> {
    sql = sql.trim();
    if (sql.toUpperCase().startsWith("CREATE TABLE")) {
      const nameMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (nameMatch) {
        const tableName = nameMatch[1];
        const startIdx = sql.indexOf("(");
        let depth = 0;
        let endIdx = -1;
        for (let i = startIdx; i < sql.length; i++) {
          if (sql[i] === "(") depth++;
          if (sql[i] === ")") {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
        if (startIdx >= 0 && endIdx > startIdx) {
          const colsStr = sql.slice(startIdx + 1, endIdx);
          const colDefs = colsStr
            .split(",")
            .map((c) => c.trim().split(/\s+/)[0]);
          if (!this.tables.has(tableName)) {
            this.tables.set(tableName, { columns: colDefs, rows: [] });
          }
        }
      }
    }
  }

  async runAsync(sql: string, params: any[] = []): Promise<void> {
    sql = sql.trim();
    const upper = sql.toUpperCase();

    if (upper.startsWith("INSERT OR")) {
      const replace = upper.includes("REPLACE");
      const ignore = upper.includes("IGNORE");
      const tableMatch = sql.match(
        /INSERT OR \w+ INTO (\w+)[\s\S]*VALUES\s*\(([^)]+)\)/i,
      );
      if (tableMatch) {
        const tableName = tableMatch[1];
        const table = this.tables.get(tableName);
        if (table) {
          const row: Row = {};
          const placeholders = (sql.match(/\?/g) || []).length;
          for (let i = 0; i < placeholders && i < table.columns.length; i++) {
            row[table.columns[i]] = params[i];
          }
          if (replace) {
            const pk = table.columns[0];
            const idx = table.rows.findIndex((r) => r[pk] === row[pk]);
            if (idx >= 0) table.rows[idx] = row;
            else table.rows.push(row);
          } else if (ignore) {
            const pk = table.columns[0];
            if (!table.rows.some((r) => r[pk] === row[pk])) {
              table.rows.push(row);
            }
          } else {
            table.rows.push(row);
          }
        }
      }
      return;
    }

    if (upper.startsWith("INSERT")) {
      const match = sql.match(/INSERT INTO (\w+)[\s\S]*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        const table = this.tables.get(tableName);
        if (table) {
          const row: Row = {};
          const placeholders = (sql.match(/\?/g) || []).length;
          for (let i = 0; i < placeholders; i++) {
            row[table.columns[i]] = params[i];
          }
          table.rows.push(row);
        }
      }
      return;
    }

    if (upper.startsWith("UPDATE")) {
      const match = sql.match(/UPDATE (\w+) SET ([\s\S]+) WHERE ([\s\S]+)/i);
      if (match) {
        const tableName = match[1];
        const table = this.tables.get(tableName);
        if (table) {
          const setClause = match[2];
          const whereClause = match[3];
          const setCols = this.parseSetClause(setClause);
          const whereParams = params.slice(setCols.length);
          for (const row of table.rows) {
            const result = this.matchesWhere(row, whereClause, whereParams);
            if (result.ok) {
              for (let i = 0; i < setCols.length; i++) {
                row[setCols[i]] = params[i];
              }
            }
          }
        }
      }
      return;
    }

    if (upper.startsWith("DELETE")) {
      const match = sql.match(/DELETE FROM (\w+) WHERE ([\s\S]+)/i);
      if (match) {
        const tableName = match[1];
        const table = this.tables.get(tableName);
        if (table) {
          const whereClause = match[2];
          table.rows = table.rows.filter((row) => {
            const result = this.matchesWhere(row, whereClause, params);
            return !result.ok;
          });
        }
      }
      return;
    }
  }

  async getAllAsync<T = Row>(sql: string, params: any[] = []): Promise<T[]> {
    sql = sql.trim();

    // Handle SELECT COUNT(*) ...
    const countMatch = sql.match(
      /SELECT\s+COUNT\(\*\)\s+as?\s+(\w+)\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+))?/i,
    );
    if (countMatch) {
      const tableName = countMatch[2];
      const table = this.tables.get(tableName);
      if (!table) return [{ [countMatch[1]]: 0 }] as T[];
      let cnt = 0;
      if (countMatch[3]) {
        const whereClause = countMatch[3]
          .split("ORDER BY")[0]
          .split("LIMIT")[0]
          .trim();
        for (const row of table.rows) {
          const result = this.matchesWhere(row, whereClause, params);
          if (result.ok) cnt++;
        }
      } else {
        cnt = table.rows.length;
      }
      return [{ [countMatch[1]]: cnt }] as T[];
    }

    const match = sql.match(
      /SELECT\s+\*\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+))?/i,
    );
    if (!match) return [];
    const tableName = match[1];
    const table = this.tables.get(tableName);
    if (!table) return [];

    let rows = [...table.rows];
    let whereConsumed = 0;

    if (match[2]) {
      const whereClause = match[2]
        .split("ORDER BY")[0]
        .split("LIMIT")[0]
        .trim();
      const filtered: Row[] = [];
      for (const row of rows) {
        const result = this.matchesWhere(row, whereClause, params);
        if (result.ok) {
          filtered.push(row);
          whereConsumed = Math.max(whereConsumed, result.consumed);
        }
      }
      rows = filtered;
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER BY (.+?)(?: LIMIT|OFFSET|$)/i);
    if (orderMatch) {
      const parts = orderMatch[1].split(",").map((p) => p.trim().split(/\s+/));
      const originalIndices = new Map(rows.map((r, i) => [r, i]));
      rows.sort((a, b) => {
        for (const [col, dir] of parts) {
          const av = a[col];
          const bv = b[col];
          if (av === bv) continue;
          const mult = dir?.toUpperCase() === "DESC" ? -1 : 1;
          return av < bv ? -1 * mult : 1 * mult;
        }
        return (originalIndices.get(a) ?? 0) - (originalIndices.get(b) ?? 0);
      });
    }

    // Handle LIMIT / OFFSET
    const limitMatch = sql.match(/LIMIT\s+(\?|\d+)(?:\s+OFFSET\s+(\?|\d+))?/i);
    if (limitMatch) {
      const getVal = (m: string, pidx: number) =>
        m === "?" ? (params[pidx] as number) : parseInt(m, 10);
      const limit = getVal(limitMatch[1], whereConsumed);
      whereConsumed++;
      const offset = limitMatch[2] ? getVal(limitMatch[2], whereConsumed) : 0;
      rows = rows.slice(offset, offset + limit);
    }

    return rows as T[];
  }

  async getFirstAsync<T = Row>(
    sql: string,
    params: any[] = [],
  ): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows[0] ?? null;
  }

  async closeAsync(): Promise<void> {
    this.tables.clear();
  }

  private parseSetClause(clause: string): string[] {
    const cols: string[] = [];
    const parts = clause.split(",").map((p) => p.trim());
    for (const part of parts) {
      const match = part.match(/(\w+)\s*=\s*\?/);
      if (match) {
        cols.push(match[1]);
      }
    }
    return cols;
  }

  private matchesWhere(
    row: Row,
    clause: string,
    params: any[],
  ): { ok: boolean; consumed: number } {
    const parts = clause.split(/\s+AND\s+/i);
    let pi = 0;

    for (const rawPart of parts) {
      let part = rawPart.trim();
      if (!part) continue;

      // Strip outer parentheses
      while (part.startsWith("(") && part.endsWith(")")) {
        part = part.slice(1, -1).trim();
      }

      // Handle OR groups: (col LIKE ? OR col LIKE ?)
      if (part.toUpperCase().includes(" OR ")) {
        const orParts = part.split(/\s+OR\s+/i);
        let anyMatch = false;
        let orConsumed = 0;
        for (const orPart of orParts) {
          const trimmed = orPart.trim();
          const likeMatch = trimmed.match(/^(\w+)\s+LIKE\s+\?$/i);
          if (likeMatch) {
            const pattern = params[pi + orConsumed] as string;
            const regex = new RegExp(
              "^" + pattern.replace(/%/g, ".*").replace(/_/g, ".") + "$",
              "i",
            );
            if (regex.test(String(row[likeMatch[1]]))) {
              anyMatch = true;
            }
            orConsumed++;
            continue;
          }
          const eqMatch = trimmed.match(/^(\w+)\s*=\s*\?$/);
          if (eqMatch) {
            if (row[eqMatch[1]] === params[pi + orConsumed]) {
              anyMatch = true;
            }
            orConsumed++;
            continue;
          }
          const eqLit = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
          if (eqLit) {
            let val: any = eqLit[2].trim();
            if (val.startsWith("'") && val.endsWith("'")) {
              val = val.slice(1, -1);
            } else if (!isNaN(Number(val))) {
              val = Number(val);
            }
            if (row[eqLit[1]] === val) {
              anyMatch = true;
            }
            continue;
          }
        }
        pi += orConsumed;
        if (!anyMatch) return { ok: false, consumed: pi };
        continue;
      }

      // col = ? (parameterized)
      const eqParam = part.match(/^(\w+)\s*=\s*\?$/);
      if (eqParam) {
        if (row[eqParam[1]] !== params[pi])
          return { ok: false, consumed: pi + 1 };
        pi++;
        continue;
      }

      // col = value (literal)
      const eqLit = part.match(/^(\w+)\s*=\s*(.+)$/);
      if (eqLit) {
        let val: any = eqLit[2].trim();
        if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        } else if (!isNaN(Number(val))) {
          val = Number(val);
        }
        if (row[eqLit[1]] !== val) return { ok: false, consumed: pi };
        continue;
      }

      // col IN (?, ?, ...)
      const inMatch = part.match(/^(\w+)\s+IN\s*\(([^)]+)\)$/i);
      if (inMatch) {
        const placeholders = (inMatch[2].match(/\?/g) || []).length;
        const values = params.slice(pi, pi + placeholders);
        pi += placeholders;
        if (!values.includes(row[inMatch[1]]))
          return { ok: false, consumed: pi };
        continue;
      }

      // col LIKE ?
      const likeMatch = part.match(/^(\w+)\s+LIKE\s+\?$/i);
      if (likeMatch) {
        const pattern = params[pi] as string;
        pi++;
        const regex = new RegExp(
          "^" + pattern.replace(/%/g, ".*").replace(/_/g, ".") + "$",
          "i",
        );
        if (!regex.test(String(row[likeMatch[1]])))
          return { ok: false, consumed: pi };
        continue;
      }
    }

    return { ok: true, consumed: pi };
  }
}

const databases = new Map<string, InMemoryDb>();

export function openDatabaseSync(name: string): any {
  if (!databases.has(name)) {
    databases.set(name, new InMemoryDb());
  }
  const db = databases.get(name)!;
  return {
    execSync: jest.fn((sql: string) => db.execAsync(sql)),
    runSync: jest.fn((sql: string, params?: any[]) => db.runAsync(sql, params)),
    getAllSync: jest.fn((sql: string, params?: any[]) =>
      db.getAllAsync(sql, params),
    ),
    getFirstSync: jest.fn((sql: string, params?: any[]) =>
      db.getFirstAsync(sql, params),
    ),
  };
}

export async function openDatabaseAsync(name: string): Promise<any> {
  if (!databases.has(name)) {
    databases.set(name, new InMemoryDb());
  }
  const db = databases.get(name)!;
  return {
    execAsync: jest.fn((sql: string) => db.execAsync(sql)),
    runAsync: jest.fn((sql: string, params?: any[]) =>
      db.runAsync(sql, params),
    ),
    getAllAsync: jest.fn((sql: string, params?: any[]) =>
      db.getAllAsync(sql, params),
    ),
    getFirstAsync: jest.fn((sql: string, params?: any[]) =>
      db.getFirstAsync(sql, params),
    ),
    closeAsync: jest.fn(() => db.closeAsync()),
  };
}

export function __resetDatabases() {
  databases.clear();
}
