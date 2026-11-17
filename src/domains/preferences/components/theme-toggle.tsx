import type { ReactNode } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PreferencesSource, ThemePreference } from "@/domains/preferences/application";
import { useThemePreference } from "./theme";

const CHOICES: readonly { readonly value: ThemePreference; readonly label: string; readonly icon: LucideIcon }[] = [
  { value: "system", label: "Système", icon: Monitor },
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
];

export function ThemeToggle(props: { preferences: PreferencesSource }): ReactNode {
  const theme = useThemePreference(props.preferences);
  const current = CHOICES.find((choice) => choice.value === theme.preference);
  const Icon = theme.resolved === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="theme-toggle"
          aria-label={`Thème : ${current?.label ?? "Système"}`}
        >
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Thème</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme.preference}
          onValueChange={(value) => {
            const choice = CHOICES.find((candidate) => candidate.value === value);
            if (choice !== undefined) theme.choose(choice.value);
          }}
        >
          {CHOICES.map((choice) => (
            <DropdownMenuRadioItem key={choice.value} value={choice.value}>
              <choice.icon aria-hidden="true" />
              {choice.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
