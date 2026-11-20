/**
 * Graph representation and validation.
 *
 * A graph G = (V, E) is stored as an adjacency list `number[][]`:
 *   - vertices are the integers 0 .. n-1 (n = adj.length),
 *   - adj[u] lists the neighbours of u,
 *   - the graph is undirected, so v ∈ adj[u]  ⇔  u ∈ adj[v],
 *   - the graph is simple: no self-loops, no parallel (duplicate) edges.
 *
 * Why an adjacency list? BFS only ever asks "who are the neighbours of u?",
 * which an adjacency list answers in O(deg(u)) while using O(V + E) memory
 * (an adjacency matrix would cost O(V²) memory and O(V) per neighbour scan).
 *
 * This module is pure TypeScript: no React, no DOM, no Node APIs.
 */

/** Undirected simple graph as an adjacency list over vertices 0..n-1. */
export type Graph = number[][];

/** An undirected edge; by convention normalised so that u < v. */
export type Edge = readonly [u: number, v: number];

/** Raised when an input is not a valid simple undirected graph. */
export class GraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphError';
  }
}

function edgeLabel(u: number, v: number): string {
  return `(${u}, ${v})`;
}

/**
 * Check one candidate edge against the vertex range, the no-self-loop rule and
 * the no-duplicate rule. Returns an error message, or null when the edge is
 * fine. `seen` collects the keys of the edges accepted so far.
 */
function checkEdge(n: number, u: number, v: number, seen: Set<number>): string | null {
  if (!Number.isInteger(u) || !Number.isInteger(v)) {
    return `Edge ${edgeLabel(u, v)} must join two integer vertices.`;
  }
  if (u < 0 || u >= n || v < 0 || v >= n) {
    return `Edge ${edgeLabel(u, v)} uses a vertex outside 0..${n - 1}.`;
  }
  if (u === v) {
    return `Self-loop at vertex ${u}: the graph must be simple (no self-loops).`;
  }
  const lo = Math.min(u, v);
  const hi = Math.max(u, v);
  const key = lo * n + hi;
  if (seen.has(key)) {
    return `Duplicate edge ${edgeLabel(lo, hi)}: the graph must be simple (no parallel edges).`;
  }
  seen.add(key);
  return null;
}

/**
 * Build an adjacency list from `n` and an edge list, rejecting invalid input
 * with a message that says exactly what is wrong.
 */
export function buildGraph(n: number, edges: ReadonlyArray<readonly [number, number]>): Graph {
  if (!Number.isInteger(n) || n < 0) {
    throw new GraphError(`The number of vertices must be a non-negative integer (got ${String(n)}).`);
  }
  const adj: Graph = Array.from({ length: n }, () => []);
  const seen = new Set<number>();
  for (const [u, v] of edges) {
    const problem = checkEdge(n, u, v, seen);
    if (problem) throw new GraphError(problem);
    adj[u].push(v);
    adj[v].push(u);
  }
  return adj;
}

/**
 * Validate an existing adjacency list (range, no self-loop, no duplicate,
 * symmetric). Throws {@link GraphError} on the first problem found.
 */
export function validateGraph(adj: Graph): void {
  const n = adj.length;
  for (let u = 0; u < n; u++) {
    const seen = new Set<number>();
    for (const v of adj[u]) {
      if (!Number.isInteger(v) || v < 0 || v >= n) {
        throw new GraphError(`Vertex ${u} lists neighbour ${String(v)}, which is outside 0..${n - 1}.`);
      }
      if (v === u) {
        throw new GraphError(`Self-loop at vertex ${u}: the graph must be simple (no self-loops).`);
      }
      if (seen.has(v)) {
        throw new GraphError(
          `Duplicate edge ${edgeLabel(Math.min(u, v), Math.max(u, v))}: the graph must be simple (no parallel edges).`,
        );
      }
      seen.add(v);
    }
  }
  for (let u = 0; u < n; u++) {
    for (const v of adj[u]) {
      if (!adj[v].includes(u)) {
        throw new GraphError(`Edge ${edgeLabel(u, v)} is listed only in adj[${u}]: the graph must be undirected.`);
      }
    }
  }
}

/** Each undirected edge exactly once, as [u, v] with u < v, sorted. */
export function edgeList(adj: Graph): Edge[] {
  const out: Edge[] = [];
  for (let u = 0; u < adj.length; u++) {
    for (const v of adj[u]) if (u < v) out.push([u, v]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out;
}

/** Number of undirected edges. */
export function edgeCount(adj: Graph): number {
  let twice = 0;
  for (const nbrs of adj) twice += nbrs.length;
  return twice / 2;
}

/** Stable identifier of the undirected edge {u, v}, used by the UI and tests. */
export function edgeKey(u: number, v: number): string {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}

/** Serialise to the text format read by the CLI: "n m" then m lines "u v". */
export function formatGraphText(adj: Graph): string {
  const edges = edgeList(adj);
  return [`${adj.length} ${edges.length}`, ...edges.map(([u, v]) => `${u} ${v}`)].join('\n') + '\n';
}

/**
 * Parse the text format "n m" followed by m lines "u v".
 * Blank lines and `#` comments are ignored. Throws {@link GraphError} with a
 * line-numbered message for malformed input, self-loops, duplicates and
 * out-of-range vertices.
 */
export function parseGraphText(text: string): Graph {
  const rows: { no: number; nums: number[] }[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*/, '').trim();
    if (line === '') return;
    const nums = line.split(/\s+/).map((p) => (/^-?\d+$/.test(p) ? Number(p) : Number.NaN));
    if (nums.some(Number.isNaN)) {
      throw new GraphError(`Line ${i + 1}: expected integers, got "${line}".`);
    }
    rows.push({ no: i + 1, nums });
  });

  if (rows.length === 0) throw new GraphError('Empty input: expected "n m" on the first line.');
  const header = rows[0];
  if (header.nums.length !== 2) {
    throw new GraphError(`Line ${header.no}: the first line must be "n m" (vertex count and edge count).`);
  }
  const [n, m] = header.nums;
  if (n < 0 || m < 0) throw new GraphError(`Line ${header.no}: n and m must be non-negative.`);

  const body = rows.slice(1);
  if (body.length !== m) {
    throw new GraphError(`The header announces ${m} edge(s) but ${body.length} edge line(s) follow.`);
  }

  const adj: Graph = Array.from({ length: n }, () => []);
  const seen = new Set<number>();
  for (const row of body) {
    if (row.nums.length !== 2) {
      throw new GraphError(`Line ${row.no}: an edge must be written "u v".`);
    }
    const [u, v] = row.nums;
    const problem = checkEdge(n, u, v, seen);
    if (problem) throw new GraphError(`Line ${row.no}: ${problem}`);
    adj[u].push(v);
    adj[v].push(u);
  }
  return adj;
}
