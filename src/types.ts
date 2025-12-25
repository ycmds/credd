export type CredsService = {
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  projectCredsUrl?: string;
  token: string;
  server: string;
  force: boolean;
};

export type CredsFile = {
  name: string;
  filename: string;
  credType?: string;
  content?: string;
  handler: (arg0: any) => Record<string, any>;
};

export type CredsVariableType = 'env_var' | 'file';
export type CredsVariableOptions = {
  // TODO: добавится name
  type?: CredsVariableType;
  protected?: boolean;
  description?: string;
  masked?: boolean;
};
export type CredsVariable = string | (CredsVariableOptions & { value: string });

export type CredsConfig = {
  secrets?: Record<string, CredsVariable>;
  variables?: Record<string, CredsVariable>;
  files?: Array<CredsFile> | Record<string, CredsFile>;
  hooks?: Array<any>;
};

// TODO: позднее типы специализируются
export type GitlabCredsConfig = CredsConfig;
export type GithubCredsConfig = CredsConfig;
