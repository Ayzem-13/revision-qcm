import { createContext, use, type ReactNode } from "react";
import type { SubjectId } from "@/domains/catalog/application";
import type { Study, StudyState } from "@/domains/session/application";
import { useReadable } from "@/shared/components";
import type { Application } from "./application";

const ApplicationContext = createContext<Application | null>(null);

export function ApplicationProvider(props: { application: Application; children: ReactNode }): ReactNode {
  return <ApplicationContext value={props.application}>{props.children}</ApplicationContext>;
}

export function useApplication(): Application {
  const application = use(ApplicationContext);
  if (application === null) throw new Error("ApplicationProvider manquant");
  return application;
}

export function useStudy(subjectId: SubjectId): { readonly study: Study; readonly state: StudyState } {
  const study = use(useApplication().study(subjectId));
  return { study, state: useReadable(study) };
}
