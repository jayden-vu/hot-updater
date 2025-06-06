import * as p from "@clack/prompts";

import { version } from "@/packageJson";
import { getPackageManager } from "@/utils/getPackageManager";
import { getCwd } from "@hot-updater/plugin-core";
import { ExecaError, execa } from "execa";
import { readPackageUp } from "read-package-up";

const ensurePackageVersion = (pkg: string) => {
  if (pkg === "hot-updater" || pkg.startsWith("@hot-updater/")) {
    return `${pkg}@${version}`;
  }
  return pkg;
};

export const ensureInstallPackages = async (buildPluginPackages: {
  dependencies: string[];
  devDependencies: string[];
}) => {
  const packages = await readPackageUp({ cwd: getCwd() });
  const dependenciesToInstall = buildPluginPackages.dependencies.filter(
    (pkg) => {
      return !packages?.packageJson?.dependencies?.[pkg];
    },
  );

  const devDependenciesToInstall = buildPluginPackages.devDependencies.filter(
    (pkg) => {
      return !packages?.packageJson?.devDependencies?.[pkg];
    },
  );

  const packageManager = getPackageManager();

  await p.tasks([
    {
      enabled: dependenciesToInstall.length > 0,
      title: "Checking packages",
      task: async (message) => {
        message(`Installing ${dependenciesToInstall.join(", ")}...`);
        try {
          const result = await execa(packageManager, [
            packageManager === "yarn" ? "add" : "install",
            ...dependenciesToInstall.map(ensurePackageVersion),
          ]);

          if (result.exitCode !== 0 && result.stderr) {
            p.log.error(result.stderr);
            process.exit(1);
          }

          return `Installed ${dependenciesToInstall.join(", ")}`;
        } catch (e) {
          if (e instanceof ExecaError) {
            p.log.error(e.stderr || e.stdout || e.message);
          } else if (e instanceof Error) {
            p.log.error(e.message);
          }
          process.exit(1);
        }
      },
    },
    {
      enabled: devDependenciesToInstall.length > 0,
      title: "Installing dev dependencies",
      task: async (message) => {
        message(`Installing ${devDependenciesToInstall.join(", ")}...`);
        try {
          const result = await execa(packageManager, [
            packageManager === "yarn" ? "add" : "install",
            ...devDependenciesToInstall.map(ensurePackageVersion),
            packageManager === "yarn" ? "--dev" : "--save-dev",
          ]);

          if (result.exitCode !== 0 && result.stderr) {
            p.log.error(result.stderr);
            process.exit(1);
          }

          return `Installed ${devDependenciesToInstall.join(", ")}`;
        } catch (e) {
          if (e instanceof ExecaError) {
            p.log.error(e.stderr || e.stdout || e.message);
          } else if (e instanceof Error) {
            p.log.error(e.message);
          }
          process.exit(1);
        }
      },
    },
  ]);
};
