import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-ncs-careers.mjs <authorized-ncs-export.json>");
  process.exitCode = 2;
} else {
  const input = resolve(inputPath);
  const output = resolve("src/data/ncsCareers.json");
  try {
    const raw = JSON.parse(await readFile(input, "utf8"));
    const moduleUrl = new URL("../src/lib/ncs/importNormalizer.ts", import.meta.url);
    const normalizeModule = await import(moduleUrl.href);
    const report = normalizeModule.importNcsRecords(raw);
    await writeFile(output, `${JSON.stringify(report.catalog, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
      importedCount: report.importedCount,
      duplicateCount: report.duplicateCount,
      rejectedCount: report.rejectedCount,
      errors: report.errors,
      output,
    }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "NCS import failed.");
    process.exitCode = 1;
  }
}
