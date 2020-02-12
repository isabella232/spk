import commander from "commander";

import { build as buildCmd, exit as exitCmd } from "../../lib/commandBuilder";
import {
  generateDefaultHldComponentYaml,
  generateGitIgnoreFile,
  generateHldAzurePipelinesYaml
} from "../../lib/fileutils";
import { checkoutCommitPushCreatePRLink } from "../../lib/gitutils";
import { hasValue } from "../../lib/validator";
import { logger } from "../../logger";
import decorator from "./init.decorator.json";

// values that we need to pull out from command operator
interface ICommandOptions {
  defaultComponentGit: string;
  defaultComponentName: string;
  defaultComponentPath: string;
  gitPush: boolean;
}

export const execute = async (
  hldRepoPath: string,
  gitPush: boolean,
  componentGit: string,
  componentName: string,
  componentPath: string,
  exitFn: (status: number) => Promise<void>
) => {
  try {
    if (!hasValue(hldRepoPath)) {
      throw new Error("project path is not provided");
    }
    await initialize(
      hldRepoPath,
      gitPush,
      componentGit,
      componentName,
      componentPath
    );
    await exitFn(0);
  } catch (err) {
    logger.error(
      `Error occurred while initializing hld repository ${hldRepoPath}`
    );
    logger.error(err);
    await exitFn(1);
  }
};

export const commandDecorator = (command: commander.Command): void => {
  buildCmd(command, decorator).action(async (opts: ICommandOptions) => {
    const hldRepoPath = process.cwd();
    // gitPush will is always true or false. It shall not be
    // undefined because default value is set in the commander decorator
    logger.info(`opts.defaultComponentGit: ${opts.defaultComponentGit}`);
    logger.info(`opts.defaultComponentName: ${opts.defaultComponentName}`);
    logger.info(`opts.defaultComponentPath: ${opts.defaultComponentPath}`);

    await execute(
      hldRepoPath,
      opts.gitPush,
      opts.defaultComponentGit,
      opts.defaultComponentName,
      opts.defaultComponentPath,
      async (status: number) => {
        await exitCmd(logger, process.exit, status);
      }
    );
  });
};

export const initialize = async (
  hldRepoPath: string,
  gitPush: boolean,
  componentGit: string,
  componentName: string,
  componentPath: string
) => {
  // Create manifest-generation.yaml for hld repository, if required.
  logger.info("Initializing bedrock HLD repository.");

  generateHldAzurePipelinesYaml(hldRepoPath);
  generateDefaultHldComponentYaml(
    hldRepoPath,
    componentGit,
    componentName,
    componentPath
  );
  // Create .gitignore file in directory ignoring spk.log, if one doesn't already exist.
  generateGitIgnoreFile(hldRepoPath, "spk.log");

  // If requested, create new git branch, commit, and push
  if (gitPush) {
    const newBranchName = "spk-hld-init";
    const directory = ".";
    await checkoutCommitPushCreatePRLink(newBranchName, directory);
  }
};
