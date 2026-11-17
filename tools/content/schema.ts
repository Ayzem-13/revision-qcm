import { join } from "node:path";
import { z } from "zod";
import { wireChapter, wireManifest } from "@/domains/catalog/infrastructure/wire";
import { PROJECT_ROOT } from "./files";

export type SchemaFile = { readonly path: string; readonly text: string };

function render(schema: z.ZodType): string {
  return `${JSON.stringify(z.toJSONSchema(schema, { target: "draft-07", io: "input" }), null, 2)}\n`;
}

export function schemaFiles(): readonly SchemaFile[] {
  return [
    { path: "tools/content/schemas/chapter.schema.json", text: render(wireChapter) },
    { path: "tools/content/schemas/subject.schema.json", text: render(wireManifest) },
  ];
}

if (import.meta.main) {
  for (const file of schemaFiles()) {
    await Bun.write(join(PROJECT_ROOT, file.path), file.text);
    console.log(`${file.path} écrit`);
  }
}
