# 🔐 Credd

> CLI tool for managing GitHub & GitLab & Local secrets and credentials

[![LSK.js](https://github.com/lskjs/presets/raw/main/docs/badge.svg)](https://github.com/lskjs)
[![NPM version](https://badgen.net/npm/v/credd)](https://www.npmjs.com/package/credd)
[![NPM downloads](https://badgen.net/npm/dt/credd)](https://www.npmjs.com/package/credd)
[![NPM Dependency count](https://badgen.net/bundlephobia/dependency-count/credd)](https://bundlephobia.com/result?p=credd)
[![Have TypeScript types](https://badgen.net/npm/types/credd)](https://www.npmjs.com/package/credd)
[![Have tree shaking](https://badgen.net/bundlephobia/tree-shaking/credd)](https://bundlephobia.com/result?p=credd)
[![NPM Package size](https://badgen.net/bundlephobia/minzip/credd)](https://bundlephobia.com/result?p=credd)
[![License](https://badgen.net/github/license/ycmds/credd)](https://github.com/ycmds/credd/blob/main/LICENSE)
[![Ask us in Telegram](https://img.shields.io/badge/Ask%20us%20in-Telegram-brightblue.svg)](https://t.me/lskjschat)

<div align="center">
  <p><strong>❤️‍🔥 CLI tool for managing GitHub & GitLab & Local secrets and credentials ❤️‍🔥</strong></p>
</div>

<img src="./docs/logo.png" align="right" width="200" height="200" />

**🔐 Secure credential management** for GitHub and GitLab projects <br/>
**🔄 Build and upload workflow** for secrets, variables, and files  <br/>
**📁 File-based credentials** with custom handlers and formats  <br/>
**🔗 Webhook support** for GitLab projects  <br/>
**🔍 Recursive mode** for processing multiple projects  <br/>
**🔒 Encrypted secrets** using GitHub's public key encryption  <br/>
**🎯 TypeScript-first** with full type definitions  <br/>
**⚙️ Flexible configuration** with JavaScript config files  <br/>
**🛡️ Force mode** for overwriting existing credentials  <br/>


## Installation

### Package Manager

Using npm:
```bash
npm install credd
```

Using yarn:
```bash
yarn add credd
```

Using pnpm:
```bash
pnpm add credd
```

Using bun:
```bash
bun add credd
```

## Quick Start

### CLI Usage

Install globally:
```bash
npm i -g credd
```

Then use the command:
```bash
# Build credentials (default)
credd <dir>

# Upload credentials
credd <dir> --upload

# Build and upload
credd <dir> --build --upload

# Force mode (overwrite existing)
credd <dir> --force

# Recursive mode (process subdirectories)
credd <dir> --recursive
```

Or use with npx (without installation):
```bash
# Build credentials (default)
npx credd <dir>

# Upload credentials
npx credd <dir> --upload

# Build and upload
npx credd <dir> --build --upload
```

### Programmatic Usage

```typescript
import { build, upload, buildDeep, uploadDeep } from 'credd';

// Build credentials for a single directory
await build('./configs/project1', {
  buildDir: './build',
  force: false,
});

// Upload credentials for a single directory
await upload('./configs/project1', {
  buildDir: './build',
  force: false,
});

// Build credentials recursively
await buildDeep('./configs', {
  force: false,
});

// Upload credentials recursively
await uploadDeep('./configs', {
  force: false,
});
```

## Usage

### Basic Usage

The `credd` package provides a CLI command for managing credentials in GitHub and GitLab projects:

**Using global installation:**
```bash
# Build credentials (default)
credd <dir>

# Upload credentials
credd <dir> --upload

# Build and upload
credd <dir> --build --upload

# Force mode (overwrite existing)
credd <dir> --force

# Recursive mode (process subdirectories)
credd <dir> --recursive
```

**Using npx (no installation needed):**
```bash
npx credd <dir>
npx credd <dir> --upload
npx credd <dir> --build --upload
npx credd <dir> --force
npx credd <dir> --recursive
```

### Build Credentials

Build credentials from source files into the `build` directory:

```bash
# Build credentials for current directory
credd .

# Build credentials for specific directory
credd ./configs/project1

# Build with force mode
credd . --force

# Build recursively
credd . --recursive
```

The build process:
1. Reads configuration from `config.js` in the target directory
2. Processes files using their handlers
3. Generates output files in the `build` directory
4. Adds metadata comments to generated files

### Upload Credentials

Upload credentials to GitHub or GitLab:

```bash
# Upload credentials
credd . --upload

# Upload with force mode
credd . --upload --force

# Upload recursively
credd . --upload --recursive
```

The upload process:
1. Reads built files from the `build` directory
2. Uploads secrets to the repository
3. Uploads variables to the repository
4. Uploads files as secrets or variables
5. Manages webhooks (GitLab only)

### Recursive Mode

Process multiple credential configurations in subdirectories:

```bash
# Build all credential configs recursively
credd . --recursive --build

# Upload all credential configs recursively
credd . --recursive --upload

# Build and upload all recursively
credd . --recursive --build --upload
```

Recursive mode finds all subdirectories containing `index.js` files and processes them.

## API Reference

The package exports functions for programmatic use:

### Core Functions

```typescript
import { build, upload, buildDeep, uploadDeep } from 'credd';

// Build credentials for a single directory
await build(serviceDirname, {
  buildDir?: string;
  log?: ILogger;
  force?: boolean;
});

// Upload credentials for a single directory
await upload(serviceDirname, {
  buildDir?: string;
  log?: ILogger;
  force?: boolean;
});

// Build credentials recursively
await buildDeep(dirname, {
  buildDir?: string;
  log?: ILogger;
  force?: boolean;
});

// Upload credentials recursively
await uploadDeep(dirname, {
  buildDir?: string;
  log?: ILogger;
  force?: boolean;
});
```

### Service Creation

```typescript
import { createService } from 'credd';

// Create a service instance
const service = await createService(serviceDirname, {
  force?: boolean;
});
```

### Types

```typescript
// Service configuration
type CredsService = {
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  projectCredsUrl?: string;
  token: string;
  server: string;
  force: boolean;
};

// Credential file configuration
type CredsFile = {
  name: string;
  filename: string;
  credType?: 'secret' | 'variable' | 'skip';
  content?: string;
  handler: (fileOptions: any, config: any) => Record<string, any>;
  type?: string;
  format?: string;
};

// Variable configuration
type CredsVariable = string | {
  value: string;
  type?: 'env_var' | 'file';
  protected?: boolean;
  description?: string;
  masked?: boolean;
};

// Main configuration
type CredsConfig = {
  service: {
    serviceName: 'github' | 'gitlab';
    token: string;
    projectPath: string;
    projectName?: string;
    projectId?: string; // Required for GitLab
    server?: string; // Required for GitLab
    projectCredsUrl?: string;
    projectCredsOwner?: string;
  };
  secrets?: Record<string, CredsVariable>;
  variables?: Record<string, CredsVariable>;
  files?: Array<CredsFile> | Record<string, CredsFile>;
  hooks?: Array<any>;
};
```

## Configuration

### Configuration File

Create a `config.js` file in your credentials directory:

```javascript
module.exports = {
  service: {
    serviceName: 'github', // or 'gitlab'
    token: 'YOUR_TOKEN',
    projectPath: 'owner/repo',
    // ... other service options
  },
  secrets: {
    // Secret credentials
  },
  variables: {
    // Environment variables
  },
  files: [
    // File-based credentials
  ],
  hooks: [
    // Webhooks (GitLab only)
  ],
};
```

### GitHub Configuration

For GitHub projects:

```javascript
module.exports = {
  service: {
    serviceName: 'github',
    token: process.env.GITHUB_TOKEN,
    projectPath: 'owner/repo',
    projectName: 'My Project',
    projectCredsUrl: 'https://github.com/owner/repo',
    projectCredsOwner: '@owner',
    server: 'api.github.com', // Optional, defaults to api.github.com
  },
  // ... rest of config
};
```

**Required fields:**
- `serviceName`: Must be `'github'`
- `token`: GitHub personal access token with `repo` and `actions:write` permissions
- `projectPath`: Repository path in format `owner/repo`
- `projectName`: Project name
- `projectCredsUrl`: URL to the repository
- `projectCredsOwner`: Owner username or organization

### GitLab Configuration

For GitLab projects:

```javascript
module.exports = {
  service: {
    serviceName: 'gitlab',
    token: process.env.GITLAB_TOKEN,
    projectId: '123', // Project ID (required)
    projectPath: 'group/project',
    projectName: 'My Project',
    projectCredsUrl: 'https://gitlab.com/group/project',
    projectCredsOwner: '@group',
    server: 'gitlab.com', // GitLab instance URL
  },
  // ... rest of config
};
```

**Required fields:**
- `serviceName`: Must be `'gitlab'`
- `token`: GitLab personal access token with `api` scope
- `projectId`: GitLab project ID (numeric or string)
- `projectPath`: Project path in format `group/project`
- `server`: GitLab instance URL (e.g., `gitlab.com`, `gitlab.example.com`)
- `projectName`: Project name
- `projectCredsUrl`: URL to the repository
- `projectCredsOwner`: Owner username or group

### Secrets and Variables

#### Simple Secrets

```javascript
module.exports = {
  secrets: {
    DATABASE_PASSWORD: 'my-secret-password',
    API_KEY: 'secret-api-key',
  },
};
```

#### Advanced Secrets with Options

```javascript
module.exports = {
  secrets: {
    DATABASE_PASSWORD: {
      value: 'my-secret-password',
      protected: true, // Protected branch only (GitLab)
      description: 'Database password',
      masked: true, // Mask in logs (GitLab)
    },
  },
};
```

#### Environment Variables

```javascript
module.exports = {
  variables: {
    NODE_ENV: 'production',
    API_URL: {
      value: 'https://api.example.com',
      type: 'env_var', // or 'file' for GitLab
      protected: false,
    },
  },
};
```

### Files Configuration

Files allow you to generate credentials from source files:

```javascript
const path = require('path');

module.exports = {
  files: [
    {
      name: 'service-account',
      filename: 'service-account.json',
      credType: 'secret', // 'secret', 'variable', or 'skip'
      type: 'json', // Output format
      handler: async (fileOptions, config) => {
        // Load and process your source file
        const sourceData = require(path.join(__dirname, 'source.json'));
        return {
          // Transform data
          ...sourceData,
          // Add computed values
        };
      },
    },
    {
      name: 'config',
      filename: 'config.js',
      credType: 'variable',
      type: 'js',
      handler: (fileOptions, config) => ({
        apiUrl: 'https://api.example.com',
        environment: 'production',
      }),
    },
  ],
};
```

**File options:**
- `name`: Name of the credential (used as key)
- `filename`: Output filename in `build` directory
- `credType`: How to upload (`'secret'`, `'variable'`, or `'skip'`)
- `type`: Output format (`'json'`, `'js'`, `'yaml'`, etc.)
- `handler`: Function that processes the file and returns data

### Hooks Configuration

Webhooks are supported for GitLab only:

```javascript
module.exports = {
  hooks: [
    {
      url: 'https://example.com/webhook',
      push_events: true,
      tag_push_events: true,
      merge_requests_events: true,
      pipeline_events: true,
      job_events: true,
      enable_ssl_verification: true,
    },
  ],
};
```

### Environment Variables

You can use environment variables in your configuration:

```bash
# Set token via environment
GITHUB_TOKEN=your_token credd . --upload
GITLAB_TOKEN=your_token credd . --upload

# Or with npx
GITHUB_TOKEN=your_token npx credd . --upload
GITLAB_TOKEN=your_token npx credd . --upload
```

## Examples

### Complete GitHub Example

```javascript
// config.js
module.exports = {
  service: {
    serviceName: 'github',
    token: process.env.GITHUB_TOKEN,
    projectPath: 'myorg/myproject',
    projectName: 'My Project',
    projectCredsUrl: 'https://github.com/myorg/myproject',
    projectCredsOwner: '@myorg',
  },
  secrets: {
    DATABASE_URL: process.env.DATABASE_URL,
    API_KEY: {
      value: process.env.API_KEY,
    },
  },
  variables: {
    NODE_ENV: 'production',
    API_URL: 'https://api.example.com',
  },
  files: [
    {
      name: 'service-account',
      filename: 'service-account.json',
      credType: 'secret',
      type: 'json',
      handler: async () => ({
        type: 'service_account',
        project_id: 'my-project',
        private_key: process.env.SERVICE_ACCOUNT_KEY,
      }),
    },
  ],
};
```

### Complete GitLab Example

```javascript
// config.js
module.exports = {
  service: {
    serviceName: 'gitlab',
    token: process.env.GITLAB_TOKEN,
    projectId: '12345',
    projectPath: 'mygroup/myproject',
    projectName: 'My Project',
    projectCredsUrl: 'https://gitlab.com/mygroup/myproject',
    projectCredsOwner: '@mygroup',
    server: 'gitlab.com',
  },
  secrets: {
    DATABASE_PASSWORD: {
      value: process.env.DATABASE_PASSWORD,
      protected: true,
      masked: true,
    },
  },
  variables: {
    NODE_ENV: {
      value: 'production',
      type: 'env_var',
      protected: false,
    },
  },
  files: [
    {
      name: 'config',
      filename: 'config.yaml',
      credType: 'variable',
      type: 'yaml',
      handler: () => ({
        api: {
          url: 'https://api.example.com',
          timeout: 5000,
        },
      }),
    },
  ],
  hooks: [
    {
      url: 'https://example.com/webhook',
      push_events: true,
      pipeline_events: true,
      enable_ssl_verification: true,
    },
  ],
};
```

## Type Definitions

Credd includes comprehensive TypeScript definitions:

```typescript
// All functions are properly typed for intellisense and type safety
import { build, upload, CredsConfig, CredsService } from 'credd';

const config: CredsConfig = {
  service: {
    serviceName: 'github',
    // ... type-safe configuration
  },
};
```

## Dependencies

The package requires:

- `@ycmd/run` - Command execution utilities
- `@ycmd/utils` - Utility functions
- `@lsk4/log` - Logging utilities
- `@lsk4/err` - Error handling
- `@lsk4/stringify` - String formatting
- `axios` - HTTP client for API requests
- `libsodium-wrappers` - Encryption for GitHub secrets
- `fishbird` - Async utilities
- `yargs` - CLI argument parsing

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Resources

- [GitHub Repository](https://github.com/ycmds/credd)
- [NPM Package](https://www.npmjs.com/package/credd)
- [Issues & Bug Reports](https://github.com/ycmds/credd/issues)

## License

MIT © [Igor Suvorov](https://github.com/isuvorov)

---

**credd** - _Secure credential management_ 🔐
