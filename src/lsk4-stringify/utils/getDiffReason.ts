import { isPlainObject } from './isPlainObject.js';

const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

/**
 * Best-effort, REDACTED explanation of why the value we're about to write (`mem`)
 * differs from the value re-parsed from the existing file (`file`).
 *
 * Reports key names and value TYPES only — never the values — so it is safe to
 * embed into a generated creds file / paste when debugging. Values are normalized
 * the same way they land on disk (env coerces everything to a string) so lossy
 * round-trip artefacts (e.g. `"3000"` re-parsed as `3000`) are NOT reported as
 * real changes. Dev-only diagnostic — not a stable contract.
 */
export function getDiffReason(mem: any, file: any, format?: string): string {
  const norm = (v: unknown) => (format === 'env' ? String(v) : JSON.stringify(v));

  if (typeOf(mem) !== typeOf(file)) return `type ${typeOf(file)}→${typeOf(mem)}`;
  if (!isPlainObject(mem) || !isPlainObject(file)) return 'value changed';

  const has = (o: any, k: string) => Object.hasOwn(o, k);
  const keys = Array.from(new Set([...Object.keys(file), ...Object.keys(mem)]));
  const reasons: string[] = [];
  for (const key of keys) {
    if (!has(file, key)) {
      reasons.push(`+${key}`);
      continue;
    }
    if (!has(mem, key)) {
      reasons.push(`-${key}`);
      continue;
    }
    if (norm(mem[key]) === norm(file[key])) continue;
    const tm = typeOf(mem[key]);
    const tf = typeOf(file[key]);
    reasons.push(format !== 'env' && tm !== tf ? `${key}: ${tf}→${tm}` : `${key}: value`);
  }

  if (reasons.length === 0) {
    return Object.keys(file).join(',') !== Object.keys(mem).join(',')
      ? 'key order changed'
      : 'objects differ (round-trip artefact)';
  }
  const shown = reasons.slice(0, 6);
  const more = reasons.length - shown.length;
  return shown.join('; ') + (more > 0 ? `; +${more} more` : '');
}

export default getDiffReason;
