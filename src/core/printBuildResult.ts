import { log } from '../utils/log.js';

interface BuildFileResult {
  filepath: string;
  status: string;
  name: string;
  credType: string;
  projectPath: string;
}

interface BuildResult {
  serviceDirname: string;
  buildDir: string;
  files: BuildFileResult[];
}

export function printBuildResult(res: BuildResult) {
  log.info('[build]', res.serviceDirname, '[=>]', res.buildDir);
  const { files = [] } = res;
  const maxNameLength = Math.max(...files.map(({ name }) => name.length), 9);
  const maxStatusLength = Math.max(...files.map(({ status }) => status.length), 6);
  const maxCredTypeLength = Math.max(...files.map(({ credType }) => credType.length), 9);
  files.forEach(({ filepath, status, name, credType, projectPath }) => {
    log.info(
      [
        `[${projectPath}]`,
        `(${name})`.padEnd(maxNameLength + 2, ' '),
        `[${status}]`.padEnd(maxStatusLength + 2, ' '),
        `[${credType}]`.padEnd(maxCredTypeLength + 2, ' '),
        `[=>] ${filepath}`,
      ].join(' '),
    );
  });
  if (files.length === 0) {
    log.info('No files to build');
  }
}
