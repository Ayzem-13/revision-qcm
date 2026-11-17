import { readSubject, subjectFrom } from "@/domains/catalog/infrastructure/wire";
import { PROJECT_ROOT, readContentFolders } from "./files";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

const root = process.argv[2] ?? PROJECT_ROOT;
const { subjects, unreadable } = await readContentFolders(root);
const issues = [...unreadable, ...subjects.flatMap((files) => readSubject(files).issues)];

if (subjects.length === 0) {
  console.error(`Aucune matière trouvée dans ${root}/content.`);
  process.exit(1);
}

if (issues.length > 0) {
  for (const issue of issues) console.error(`${issue.file} : ${issue.message}`);
  console.error(plural(issues.length, "problème", "problèmes"));
  process.exit(1);
}

const assembled = subjects.map(subjectFrom);
const chapters = assembled.reduce((sum, subject) => sum + subject.chapters.size, 0);
const questions = assembled.reduce((sum, subject) => sum + subject.questions.size, 0);
console.log(
  `${plural(assembled.length, "matière", "matières")}, ${plural(chapters, "chapitre", "chapitres")}, ${plural(questions, "question", "questions")} : aucun problème`,
);
