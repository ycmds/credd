import { Err } from '@lsk4/err';

import { GithubService } from '../services/GithubService.js';
import { GitlabService } from '../services/GitlabService.js';
import type { Service } from '../services/Service.js';
import { loadConfig } from '../utils/loadConfig.js';

type ServiceOptions = {
  force?: boolean;
};

export async function createService(
  serviceDirname: string,
  options: ServiceOptions = {},
): Promise<Service> {
  const { path, config } = await loadConfig(serviceDirname);

  const serviceName = config.service?.serviceName;
  if (!serviceName) {
    throw new Err('!serviceName', { data: { configPath: path } });
  }

  let service: GithubService | GitlabService;
  const serviceOptions = {
    ...config.service,
    ...options,
    path,
    config,
  };
  if (serviceName === 'github') {
    service = new GithubService(serviceOptions);
  } else if (serviceName === 'gitlab') {
    service = new GitlabService(serviceOptions);
  } else {
    throw new Err('incorrect serviceName', { serviceName });
  }
  return service;
}
