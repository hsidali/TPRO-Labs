import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { PSEUDO_CODE } from '../algo/shortestCycle';

const KEYWORDS = /(\bfor each\b|\bwhile\b|\belse if\b|\bif\b|\breturn\b|\bnot\b|\bempty\b|\bin\b)/;
const FUNCTIONS = /(\bdequeue\b|\benqueue\b|\brebuild\b)/;

/** Minimal syntax colouring: keywords and helper calls get their own class. */
function colourise(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(KEYWORDS).forEach((chunk, i) => {
    if (i % 2 === 1) {
      out.push(
        <span key={`${keyPrefix}k${i}`} className="tok-kw">
          {chunk}
        </span>,
      );
      return;
    }
    chunk.split(FUNCTIONS).forEach((piece, j) => {
      out.push(
        j % 2 === 1 ? (
          <span key={`${keyPrefix}f${i}-${j}`} className="tok-fn">
            {piece}
          </span>
        ) : (
          <Fragment key={`${keyPrefix}t${i}-${j}`}>{piece}</Fragment>
        ),
      );
    });
  });
  return out;
}

/**
 * One source line → { indent level, statements }. Indentation (4 spaces per level) becomes CSS,
 * and the statements of a line ("a ; b ; c") are kept unbreakable, so on a narrow panel a long
 * line wraps between statements instead of being cut off.
 */
function layoutLine(raw: string) {
  const trimmed = raw.trimStart();
  const indent = Math.round((raw.length - trimmed.length) / 4);
  const parts = trimmed.split(' ; ');
  const statements = parts.map((s, i) => (i < parts.length - 1 ? `${s} ;` : s));
  return { indent, statements };
}

interface Props {
  /** 1-based line being executed, or null when nothing is running. */
  line: number | null;
}

export function PseudoCode({ line }: Props) {
  return (
    <ol className="code" aria-label="Pseudo-code of the algorithm">
      {PSEUDO_CODE.map((raw, i) => {
        const current = line === i + 1;
        const { indent, statements } = layoutLine(raw);
        return (
          <li key={i} className={current ? 'code__line is-current' : 'code__line'} aria-current={current ? 'step' : undefined}>
            <span className="code__no" aria-hidden="true">
              {i + 1}
            </span>
            <code className="code__text" style={{ '--indent': indent } as CSSProperties}>
              {statements.map((s, k) => (
                // The statement is unbreakable; the space after it (outside the span) is the only wrap point.
                <Fragment key={k}>
                  <span className="code__stmt">{colourise(s, `${i}-${k}-`)}</span>{' '}
                </Fragment>
              ))}
            </code>
          </li>
        );
      })}
    </ol>
  );
}
