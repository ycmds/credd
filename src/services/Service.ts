import { Err } from '@lsk4/err';
import { createLogger } from '@lsk4/log';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { map } from 'fishbird';

import type { CredsConfig, CredsService, CredsVariable } from '../types.js';

export class Service {
  client!: AxiosInstance;
  log = createLogger(this.constructor.name);

  constructor(options: any) {
    this.assign(options);
    this.checkConfig();
    this.client = this.createClient(options.clientOptions);
  }
  createClient(clientOptions: any = {}): AxiosInstance {
    return axios.create(clientOptions);
  }
  assign(options: CredsService) {
    Object.assign(this, options);
  }

  getFiles(): any[] {
    const config = (this as any).config;
    if (!config) throw new Err('!config');
    const { files = [] } = config;
    return files;
  }
  getVariables(): Record<string, CredsVariable> {
    const config = (this as any).config;
    if (!config) throw new Err('!config');
    const { variables = {} } = config;
    return variables;
  }
  getSecrets(): Record<string, CredsVariable> {
    const config = (this as any).config;
    if (!config) throw new Err('!config');
    const { secrets = {} } = config;
    return secrets;
  }
  getHooks(): any[] {
    const config = (this as any).config;
    if (!config) throw new Err('!config');
    const { hooks = [] } = config;
    return hooks;
  } 

  checkConfig() {
    throw new Err('NOT_IMPLEMENTED', 'checkConfig method not implemented');
  }
  getServiceHostname(): string {
    throw new Err('NOT_IMPLEMENTED', 'getServiceHostname method not implemented');
  }
  getProjectUrl(): string {
    throw new Err('NOT_IMPLEMENTED', 'getProjectUrl method not implemented');
  }
  getProjectCICDSettingURL(): string {
    throw new Err('NOT_IMPLEMENTED', 'getProjectCICDSettingURL method not implemented');
  }

  getProjectPath(): string {
    const value = (this as any).projectPath;
    if (!value) throw new Err('!projectPath');
    return value;
  }

  getProjectId(): string {
    const value = (this as any).projectId;
    // if (!value) throw new Err('!projectId');
    return value;
  }
  getProjectCredsUrl(): string {
    const value = (this as any).projectCredsUrl;
    if (!value) throw new Err('!projectCredsUrl');
    return value;
  }
  getProjectCredsOwner(): string {
    const value = (this as any).projectCredsOwner;
    if (!value) throw new Err('!projectCredsOwner');
    return value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async uploadSecret(_key: string, _content: CredsVariable) {
    throw new Err('NOT_IMPLEMENTED', 'uploadSecret method not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async uploadVariable(_key: string, _content: CredsVariable) {
    throw new Err('NOT_IMPLEMENTED', 'uploadVariable method not implemented');
  }

  async removeOldHooks() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async uploadHook(_dataHook: any) {}

  async uploadHooks(env: CredsConfig): Promise<void> {
    if (!env) throw new Err('!env');
    const { hooks = [] } = env;
    try {
      await this.removeOldHooks();
    } catch (err) {
      this.log.error(`[ERR] Old hooks removing failed:`, Err.getMessage(err));
    }

    await map(hooks, async (dataHook, index) => {
      try {
        await this.uploadHook(dataHook);
        this.log.info(`[OK] Hook ${index} uploaded`);
      } catch (err) {
        this.log.error(`[ERR] Hook ${index} not uploaded:`, Err.getMessage(err));
      }
    });
  }

  async uploadAll(env: CredsConfig) {
    if (!env) throw new Err('!env');
    const { secrets = {}, variables = {}, files = [] } = env;
    await this.uploadHooks(env);
    await map(Object.entries(secrets), async ([key, value]) => {
      try {
        await this.uploadSecret(key, value);
        this.log.info(`[OK] Secret ${key} uploaded`);
      } catch (err) {
        this.log.error(`[ERR] Secret ${key} not uploaded as secret, because`, Err.getMessage(err));
        // console.log('err', err);
        this.log.trace(err);
      }
    });
    await map(Object.entries(variables), async ([key, value]) => {
      try {
        await this.uploadVariable(key, value);
        this.log.info(`[OK] Variable ${key} uploaded`);
      } catch (err) {
        this.log.error(
          `[ERR] Variable ${key} not uploaded as variable, because`,
          Err.getMessage(err),
        );
        // console.log('err', err);
        this.log.trace(err);
        // log.error(err);
      }
    });
    await map(Object.values(files), async ({ name, credType, content }: any) => {
      const key = name;
      const value = content;
      try {
        if (credType === 'variable') {
          await this.uploadVariable(key, value);
        } else if (credType === 'secret') {
          await this.uploadSecret(key, value);
        } else if (credType === 'skip') {
          this.log.debug(`[SKIP] File ${key} uploaded as ${credType}`);
          return;
        } else {
          throw new Err('unknown credType', { credType });
        }
        this.log.info(`[OK] File ${key} uploaded as ${credType}`);
      } catch (err) {
        this.log.error(
          `[ERR] File ${key} not uploaded as ${credType}, because`,
          Err.getMessage(err),
        );
        this.log.trace(err);
        // log.error(err);
      }
    });
  }
}
