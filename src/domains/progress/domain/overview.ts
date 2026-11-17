import type { ChapterId, Subject, SubjectId } from "@/domains/catalog/domain";
import { addCounts, masteryIn, type MasteryCounts, type Progress } from "./progress";

export type ChapterOverview = {
  readonly id: ChapterId;
  readonly title: string;
  readonly questionCount: number;
  readonly mastery: MasteryCounts;
};

export type SectionOverview = { readonly title: string; readonly chapters: readonly ChapterOverview[] };

export type SubjectOverview = {
  readonly id: SubjectId;
  readonly title: string;
  readonly hue: number;
  readonly questionCount: number;
  readonly mastery: MasteryCounts;
  readonly sections: readonly SectionOverview[];
};

export function overviewOf(subject: Subject, progress: Progress): SubjectOverview {
  const sections = subject.sections.map((section) => ({
    title: section.title,
    chapters: section.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      questionCount: chapter.questions.length,
      mastery: masteryIn(chapter.questions, progress),
    })),
  }));
  const chapters = sections.flatMap((section) => section.chapters);
  return {
    id: subject.id,
    title: subject.title,
    hue: subject.hue,
    questionCount: subject.questions.size,
    mastery: chapters.map((chapter) => chapter.mastery).reduce(addCounts, masteryIn([], progress)),
    sections,
  };
}
