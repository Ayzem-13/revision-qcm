import { expect, test } from "bun:test";
import { join } from "node:path";
import { PROJECT_ROOT } from "../../../tools/content/files";
import { schemaFiles } from "../../../tools/content/schema";

test("tools/content/schemas/*.json equal what bun run content:schema would write", async () => {
  for (const file of schemaFiles()) {
    const written = await Bun.file(join(PROJECT_ROOT, file.path)).text();
    expect({ path: file.path, text: written }).toEqual({ path: file.path, text: file.text });
  }
});

test("the editor maps every content file to its schema", async () => {
  const settings = await Bun.file(join(PROJECT_ROOT, ".vscode/settings.json")).json();
  expect(settings["json.schemas"]).toEqual([
    { fileMatch: ["/content/*/subject.json"], url: "./tools/content/schemas/subject.schema.json" },
    { fileMatch: ["/content/*/*.json", "!/content/*/subject.json"], url: "./tools/content/schemas/chapter.schema.json" },
  ]);
});
