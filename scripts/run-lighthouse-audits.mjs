import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, ".lighthouserc.json");

function readConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

async function waitForHttpReady(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
      lastError = `Server returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError ?? "unknown error"}`);
}

function buildCategoryThresholds(assertions) {
  const thresholds = new Map();

  if (!assertions) {
    return thresholds;
  }

  for (const [key, value] of Object.entries(assertions)) {
    if (!key.startsWith("categories:")) {
      continue;
    }

    const category = key.replace("categories:", "");
    if (value === "off") {
      continue;
    }

    if (Array.isArray(value)) {
      const [, options] = value;
      if (typeof options?.minScore === "number") {
        thresholds.set(category, options.minScore);
      }
    }
  }

  return thresholds;
}

async function safeKillChrome(chrome) {
  try {
    await chrome.kill();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Lighthouse Chrome cleanup warning: ${message}`);
  }
}

function stopServer(server) {
  if (server.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }

  server.kill("SIGTERM");
}

async function main() {
  const config = readConfig();
  const collect = config.ci?.collect;
  const urls = collect?.url ?? [];
  const startServerCommand = collect?.startServerCommand ?? "npm run start";
  const outputDirectory = path.resolve(ROOT, config.ci?.upload?.outputDir ?? "output/lhci");
  const thresholds = buildCategoryThresholds(config.ci?.assert?.assertions);

  if (urls.length === 0) {
    throw new Error("No Lighthouse URLs configured.");
  }

  mkdirSync(outputDirectory, { recursive: true });

  const server = process.platform === "win32"
    ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", startServerCommand], {
        cwd: ROOT,
        shell: false,
        stdio: "pipe",
      })
    : (() => {
        const [serverCommand, ...serverArgs] = startServerCommand.split(" ");
        return spawn(serverCommand, serverArgs, {
          cwd: ROOT,
          shell: false,
          stdio: "pipe",
        });
      })();

  server.stdout?.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  server.stderr?.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await waitForHttpReady(urls[0], 180_000);

    const failures = [];

    for (const url of urls) {
      const chrome = await launch({
        chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
      });

      try {
        const runnerResult = await lighthouse(url, {
          port: chrome.port,
          logLevel: "error",
          output: "json",
          onlyCategories: Array.from(thresholds.keys()),
          formFactor: collect?.settings?.formFactor,
          throttlingMethod: collect?.settings?.throttlingMethod,
          screenEmulation: collect?.settings?.screenEmulation,
        });

        if (!runnerResult) {
          failures.push(`${url}: Lighthouse produced no result.`);
          continue;
        }

        const reportPath = path.join(
          outputDirectory,
          `${new URL(url).pathname.replace(/[\\/]+/g, "_").replace(/^_+/, "") || "root"}.lhr.json`,
        );
        writeFileSync(reportPath, runnerResult.report, "utf8");

        const { lhr } = runnerResult;
        const categorySummary = Array.from(thresholds.entries()).map(([category, minScore]) => {
          const actualScore = lhr.categories[category]?.score ?? 0;
          return {
            category,
            actualScore,
            minScore,
          };
        });

        categorySummary.forEach(({ category, actualScore, minScore }) => {
          console.log(`${url} :: ${category}=${actualScore.toFixed(2)} (min ${minScore.toFixed(2)})`);
        });

        categorySummary
          .filter(({ actualScore, minScore }) => actualScore < minScore)
          .forEach(({ category, actualScore, minScore }) => {
            failures.push(`${url}: ${category} score ${actualScore.toFixed(2)} is below ${minScore.toFixed(2)}`);
          });
      } finally {
        await safeKillChrome(chrome);
      }
    }

    if (failures.length > 0) {
      throw new Error(failures.join("\n"));
    }
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
