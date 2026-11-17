import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "@/app/app";
import { createApplication, type Ports } from "@/app/application";
import { ApplicationProvider } from "@/app/provider";
import { viteSubjectRepository } from "@/domains/catalog/infrastructure";
import { installTheme } from "@/domains/preferences/components";
import { storedPreferences } from "@/domains/preferences/infrastructure";
import { storedProgressRepository } from "@/domains/progress/infrastructure";
import { storedSessionRepository } from "@/domains/session/infrastructure";
import { browserStorage, cryptoRandom, systemClock } from "@/shared/infrastructure";

function browserPorts(): Ports {
  return {
    subjects: viteSubjectRepository(),
    sessions: storedSessionRepository(browserStorage),
    progress: storedProgressRepository(browserStorage),
    preferences: storedPreferences(browserStorage),
    clock: systemClock,
    random: cryptoRandom,
  };
}

const application = createApplication(browserPorts());

installTheme(application.preferences);

const container = document.getElementById("root");
if (container === null) throw new Error("Élément #root introuvable dans index.html");

createRoot(container).render(
  <StrictMode>
    <ApplicationProvider application={application}>
      <App />
    </ApplicationProvider>
  </StrictMode>,
);
