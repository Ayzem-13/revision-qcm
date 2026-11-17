import type { ReactNode } from "react";
import { Code } from "@/components/ui/code";
import type { RichText as RichTextValue } from "@/domains/catalog/application";

export function RichText(props: { value: RichTextValue }): ReactNode {
  return props.value.map((span, index) =>
    span.kind === "code" ? <Code key={index}>{span.value}</Code> : <span key={index}>{span.value}</span>,
  );
}
