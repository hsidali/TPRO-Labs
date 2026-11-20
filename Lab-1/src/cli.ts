/**
 * Terminal entry point.
 *
 *   npx tsx src/cli.ts samples/graph.txt
 *   cat samples/graph.txt | npx tsx src/cli.ts -
 *
 * Input: "n m" on the first line, then m lines "u v" (vertices 0..n-1).
 * Output: the girth and one shortest cycle, or "No cycle: the graph is acyclic".
 * Uses the same algorithm module as the UI, with the trace disabled.
 */

import { readFileSync } from 'node:fs';
import { formatReport } from './algo/format';
import { GraphError, parseGraphText } from './algo/graph';
import { shortestCycle } from './algo/shortestCycle';

function main(argv: string[]): number {
  const target = argv[0];
  if (target === undefined || target === '-h' || target === '--help') {
    console.error('Usage: npx tsx src/cli.ts <graph-file | ->');
    console.error('  File format: "n m" then m lines "u v" (vertices 0..n-1); "-" reads stdin.');
    return target === undefined ? 2 : 0;
  }

  let text: string;
  try {
    text = readFileSync(target === '-' ? 0 : target, 'utf8');
  } catch (err) {
    console.error(`Cannot read "${target}": ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  try {
    const graph = parseGraphText(text);
    const result = shortestCycle(graph); // trace disabled
    for (const line of formatReport(result)) console.log(line);
    return 0;
  } catch (err) {
    if (err instanceof GraphError) {
      console.error(`Invalid graph: ${err.message}`);
      return 1;
    }
    throw err;
  }
}

process.exitCode = main(process.argv.slice(2));
