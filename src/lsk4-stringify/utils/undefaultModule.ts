/**
 * Unwrap an ESM `default` export from the various module shapes that
 * require()/import() can return:
 *  - Node's require(esm) (Node 22+) yields a CJS-interop wrapper
 *    `{ __esModule: true, default: X }`;
 *  - a native dynamic import() / tsx yields `{ default: X }`.
 * Both unwrap to `X`. The `__esModule` interop marker is ignored so the extra
 * key does not defeat the check. Modules with named exports (more than just
 * `default`) or plain CJS objects are returned unchanged.
 */
export function undefaultModule(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const keys = Object.keys(data).filter((key) => key !== '__esModule');
  if (keys.length === 1 && keys[0] === 'default') return data.default;
  return data;
}

export default undefaultModule;
