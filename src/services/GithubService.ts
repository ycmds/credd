import { Err } from '@lsk4/err';
import { createLogger } from '@lsk4/log';
import axios from 'axios';
import _sodium from 'libsodium-wrappers';

import type { CredsVariable } from '../types.js';
import { Service } from './Service.js';

interface GithubServiceOptions {
  projectName: string;
  projectPath: string;
  projectCredsUrl: string;
  projectCredsOwner: string;
  token: string;
  server?: string;

  clientOptions: any;
}

export class GithubService extends Service {
  projectName!: string;
  projectPath!: string;
  projectCredsUrl!: string;
  projectCredsOwner!: string;
  token!: string;
  server?: string;

  log = createLogger(this.constructor.name);

  constructor(options: GithubServiceOptions) {
    super(options);
    // TODO: не разобрался почему надо копипастить строчки ниже
    this.assign(options as any);
    this.checkConfig();
    this.client = this.createClient(options.clientOptions);
  }
  checkConfig() {
    if (!this.projectName) throw new Err('!projectName');
    if (!this.projectPath) throw new Err('!projectPath');
    if (!this.projectCredsUrl) throw new Err('!projectCredsUrl');
    if (!this.projectCredsOwner) throw new Err('!projectCredsOwner');
    if (!this.token) throw new Err('!token');
  }
  createClient(options: any = {}) {
    const server = this.server || 'api.github.com';
    const baseURL = `https://${server}/repos/${this.getProjectPath()}`;
    return axios.create({
      baseURL,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      ...options,
    });
  }
  getServiceHostname() {
    return 'github.com';
  }
  getProjectPath() {
    return this.projectPath;
  }
  getProjectUrl() {
    return `https://${this.getServiceHostname()}/${this.getProjectPath()}`;
  }
  getProjectCICDSettingURL() {
    return `${this.getProjectUrl()}/settings/secrets/actions`;
  }

  async uploadSecret(name: string, variable: CredsVariable) {
    const { data: publicKeyData } = await this.client({
      method: 'get',
      url: `/actions/secrets/public-key`,
    }).catch((err) => {
      // TODO: сделать такой интерцептор
      throw new Err(err.message, { data: err?.response?.data });
      // console.log(err.response.data);
    });

    // TODO: add ZOD validation
    const content = typeof variable === 'string' ? variable : variable.value;

    if (!publicKeyData?.key) throw new Err('!publicKey');
    if (!publicKeyData?.key_id) throw new Err('!publicKeyId');

    await _sodium.ready;
    const sodium = _sodium;
    const binkey = sodium.from_base64(publicKeyData.key, sodium.base64_variants.ORIGINAL);
    const binsec = sodium.from_string(content);
    const encBytes = sodium.crypto_box_seal(binsec, binkey);
    const output = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

    await this.client({
      method: 'put',
      url: `/actions/secrets/${name}`,
      data: {
        encrypted_value: output,
        key_id: publicKeyData.key_id,
      },
    });
  }
  async uploadVariable(name: string, variable: CredsVariable) {
    // TODO: add ZOD validation
    const value = typeof variable === 'string' ? variable : variable.value;

    const { data: varData, status } = await this.client({
      method: 'get',
      url: `/actions/variables/${name}`,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    }).catch((err) => err?.response);
    if (status === 404) {
      await this.client({
        method: 'post',
        url: `/actions/variables`,
        data: {
          name,
          value,
        },
      });
    }
    if (status === 200 && varData.name.toLowerCase() === name.toLowerCase()) {
      await this.client({
        method: 'patch',
        url: `/actions/variables/${name}`,
        data: {
          name,
          value,
        },
      });
    }
  }
  uploadHook(): Promise<void> {
    throw new Err('Github hooks not supported yet');
  }
}
