# Carte des modules

L'arborescence réelle du dépôt, un fichier par ligne. Sont exclus les dossiers installés ou produits par les outils
(`node_modules/`, `dist/`, `.playwright/`). Le pourquoi de cette forme est dans [architecture.md](architecture.md).

## Arborescence

```
revision-qcm/
  .github/workflows/ci.yml                 CI : installation figée, lint, typecheck, tests, contenu, build, Prettier, knip, Playwright
  .vscode/settings.json                    associe content/*/subject.json et content/*/*.json à leur JSON Schema
  .gitignore                               dépendances, build, sorties de Playwright (.playwright/)
  .prettierignore                          ce que Prettier ne touche pas (contenu, schémas générés, lockfile, sorties)
  .prettierrc.json                         Prettier avec prettier-plugin-tailwindcss ; style shadcn dans src/components/ui
  AGENTS.md                                consignes pour un agent de code
  README.md                                lancer, vérifier, ajouter une matière, où sont les choses
  bun.lock                                 lockfile de Bun
  bunfig.toml                              [test] root = "tests/unit" : bun test ne lance jamais les specs Playwright
  components.json                          configuration shadcn (radix-nova, lucide, tailwind.css = src/index.css)
  eslint.config.js                         domaines lus dans src/domains, droits de chaque couche, points d'entrée, clôtures des bibliothèques, six règles shadcn
  index.html                               page hôte de Vite (lang="fr", couleurs de thème)
  knip.json                                points d'entrée de la détection de code mort
  package.json                             dépendances et scripts (dev, build, lint, typecheck, test, test:e2e, content:*, format*, knip, check)
  playwright.config.ts                     tests/e2e/specs ; build puis preview sur le port 5190 ; sorties dans .playwright/results ; projets phone, phone-360, tablet, desktop
  tsconfig.json                            racine des références TypeScript
  tsconfig.app.json                        code de src/ : strict, noUncheckedIndexedAccess, erasableSyntaxOnly
  tsconfig.node.json                       vite.config.ts, tools/, playwright.config.ts
  tsconfig.e2e.json                        tests/e2e/ (types du DOM et de Node)
  tsconfig.test.json                       tests/unit/ (types de Bun et du DOM), pour que tsc -b vérifie aussi les tests
  vite.config.ts                           React, Tailwind, alias @, port 5180

  public/
    favicon.svg                            icône de l'application

  content/                                 les matières : des données, pas du code
    admin-linux/
      subject.json                         titre et teinte de la matière
      al1-ch01.json ... al1-ch10.json      dix chapitres, section « Cours, partie 1 »
      al2-ch01.json ... al2-ch08.json      huit chapitres, section « Cours, partie 2 »
      tp1-a.json ... tp2-b.json            quatre chapitres (tp1-a, tp1-b, tp2-a, tp2-b), section « Travaux pratiques »

  docs/
    architecture.md                        le problème, la structure par domaine, les quatre domaines, les décisions et leurs raisons
    design-system.md                       tokens, variantes, choix d'une primitive, « rien ne bouge », règles de lint
    module-map.md                          ce fichier
    ubiquitous-language.md                 terme français, identifiant anglais, domaine, sens

  tools/                                   ce qui se lance à la main ou en CI, hors de l'application
    content/
      check.ts                             bun run content:check : valide chaque matière, affiche chaque problème avec son fichier, sort en 1 s'il y en a
      files.ts                             lit content/ sur le disque en dossiers de matière ; partagé par le contrôle et les tests
      schema.ts                            bun run content:schema : écrit schemas/*.json depuis le schéma zod
      schemas/
        chapter.schema.json                généré depuis le schéma zod d'un chapitre ; validation dans l'éditeur
        subject.schema.json                généré depuis le schéma zod de subject.json

  src/
    main.tsx                               racine de composition : adaptateurs du navigateur (browserPorts), application, thème, racine React
    index.css                              le thème, au format shadcn
    lib/
      css-variables.d.ts                   autorise les propriétés personnalisées (--x) dans le type de style de React
      utils.ts                             cn, tel que shadcn l'attend

    app/                                   ce qui relie les domaines ; n'importe aucune infrastructure
      application.ts                       Ports, Application, createApplication : une Study par matière, session en cours, préférences, port SetupMemory branché
      provider.tsx                         ApplicationProvider, useApplication, useStudy
      route.ts                             route par le hash : accueil ou matière ; seul lecteur de location.hash
      app.tsx                              fournisseurs, coquille, aiguillage des routes, écran = f(state.session)

    domains/
      catalog/                             ce qu'il y a à réviser ; n'importe aucun autre domaine
        domain/
          ids.ts                           identifiants typés et leurs quatre constructeurs (les seuls casts du cœur)
          subject.ts                       agrégat Subject, ChapterDraft, règles d'une matière valide, assembleSubject, texte enrichi, révision
          repository.ts                    port SubjectRepository
          index.ts                         entrée de la couche
        application/
          index.ts                         ce que React et app lisent du catalogue : identifiants, RichText, SubjectSummary, InvalidSubject, SubjectRepository
        infrastructure/
          wire.ts                          schémas zod de subject.json et d'un chapitre, passage au ChapterDraft, messages en français
          vite-subject-repository.ts       les deux import.meta.glob ; list() sans téléchargement, load() mémoïsé
          index.ts                         entrée de la couche : viteSubjectRepository, subjectRepositoryOver
        components/
          subject-card.tsx                 une matière, dans sa teinte
          rich-text.tsx                    RichText en texte et Code
          hue.ts                           useSeedHue (teinte de la matière ouverte sur <html>), hueScope (teinte d'une carte)
          index.ts                         entrée de la couche

      progress/                            ce que l'on sait déjà ; en aval de catalog
        domain/
          progress.ts                      Progress, QuestionStat, Mastery, Verdict ; record, currentFor, masteryIn, masteryOf
          overview.ts                      SubjectOverview, SectionOverview, ChapterOverview ; overviewOf
          repository.ts                    port ProgressRepository
          index.ts                         entrée de la couche
        application/
          index.ts                         ce que React et app lisent : Mastery, MasteryCounts, vues d'ensemble, ProgressRepository
        infrastructure/
          stored-progress.ts               clé qcm.progress.<matière>, version, forme stockée (un tuple par question)
          progress-repository.ts           ProgressRepository, un magasin par matière, progression courante mémoïsée
          index.ts                         entrée de la couche : storedProgressRepository
        components/
          mastery.tsx                      ordre, libellés et tons des quatre niveaux de maîtrise ; barre et légende
          index.ts                         entrée de la couche

      session/                             une session de révision ; en aval de progress
        domain/
          mode.ts                          table des politiques de mode (sans libellés)
          plan.ts                          SessionSetup, SessionRequest, SessionPlan ; tirage pondéré, mélange, générateur à graine
          session.ts                       agrégat Session, commandes, événements, begin, handle, primaryAction
          scoring.ts                       isCorrect, la seule règle de correction
          view.ts                          le modèle de lecture : QuestionView, ResultsView, ReviewedQuestion, viewOf
          snapshot.ts                      le mémento : SessionSnapshot, snapshotOf, restore
          repository.ts                    port SessionRepository
          index.ts                         entrée de la couche
        application/
          ports.ts                         SessionPorts : dépôts, port SetupMemory, horloge, hasard
          use-cases.ts                     startSession, replaySession, quitSession, sendCommand, resetProgress ; stateOf, poolSizes
          study.ts                         Study et studyOf : l'état mémoïsé et les actions d'une matière
          index.ts                         entrée de la couche, et les modèles de lecture que React lit
        infrastructure/
          stored-session.ts                clé qcm.session, version, forme stockée de l'instantané
          session-repository.ts            SessionRepository : snapshot à l'écriture, restore mémoïsé à la lecture
          index.ts                         entrée de la couche : storedSessionRepository
        components/
          index.ts                         entrée de la couche
          mode-copy.ts                     libellé, description et icône de chaque mode
          resume-banner.tsx                la session en cours à reprendre
          setup/
            chapter-picker.tsx             sections et chapitres en groupes de cases avec case parente
            count-picker.tsx               10, 20, 40 ou tout, plafonnés par le vivier
            mode-picker.tsx                un Choice par mode, désactivé quand son vivier est vide
          question/
            answer-choices.tsx             les ChoiceView sur ChoiceGroup ; verdict et icône par marque
            exam-timer.tsx                 compte à rebours sur une échéance absolue
            question-card.tsx              ligne de métadonnées, énoncé, code, réponses
            question-navigator.tsx         feuille avec une tuile par question
            session-action-bar.tsx         action principale, navigation, panneau de correction repliable
            session-dialogs.tsx            confirmations quitter, recommencer, terminer
            use-session-keys.ts            chiffres par event.code, Entrée, flèches en navigation libre
          results/
            chapter-breakdown.tsx          une barre de progression par chapitre
            review-card.tsx                une ReviewedQuestion et la marque de chaque choix
            score-dial.tsx                 anneau de progression et nombre animé

      preferences/                         thème et dernier réglage ; en aval de session (le réglage nomme un Mode)
        domain/
          preferences.ts                   ThemePreference, Preferences, port PreferencesStore
          index.ts                         entrée de la couche
        application/
          preferences.ts                   PreferencesSource et preferencesSource (chooseTheme), rememberSetup
          index.ts                         entrée de la couche
        infrastructure/
          stored-settings.ts               clé qcm.settings, version, forme stockée
          preferences-store.ts             PreferencesStore sur qcm.settings
          index.ts                         entrée de la couche : storedPreferences
        components/
          theme.ts                         installTheme (classe dark de <html>), useThemePreference
          theme-toggle.tsx                 menu Système, Clair, Sombre
          index.ts                         entrée de la couche

    pages/                                 un fichier par écran ; compose les composants des domaines
      home.tsx                             salutation, bannière de reprise, grille des matières, état vide
      setup.tsx                            en-tête, réinitialisation, progression, formulaire, barre d'action fixe
      session.tsx                          barre du haut, progression, question, raccourcis, barre d'action
      results.tsx                          score, actions, par chapitre, correction paginée

    shared/                                ce que plusieurs domaines utilisent sans le posséder ; n'importe aucun domaine
      application/
        readable.ts                        Readable : une valeur et son abonnement
        system.ts                          ports Clock et Random
        index.ts                           entrée
      infrastructure/
        browser-storage.ts                 l'hôte localStorage : read, write, watch (événement storage)
        versioned-store.ts                 enveloppe { v, data }, migration, mise de côté du corrompu, version plus récente en lecture seule
        system.ts                          systemClock, cryptoRandom
        index.ts                           entrée
      components/
        confirm-dialog.tsx                 une composition d'AlertDialog : titre, description, deux libellés, ton
        format.ts                          nombres fr-FR, pluriel, durées
        use-readable.ts                    useReadable, sur useSyncExternalStore
        index.ts                           entrée

    components/
      layout/                              la coquille ; importe les surfaces des domaines, ni app ni les pages
        app-shell.tsx                      barre du haut, lien d'évitement, menu de thème, conteneur de page
        error-boundary.tsx                 problèmes d'InvalidSubject en liste ; erreur inattendue
        loading.tsx                        attente du chargement d'une matière
      ui/                                  le design system ; ne connaît rien de l'application
        (installés par la CLI shadcn, Radix ou statiques ; variantes modifiées sur place)
        alert-dialog.tsx                   boîte de confirmation ; forme et surface définies ici
        alert.tsx                          variantes default, destructive, success
        badge.tsx                          variantes de pastille et taille lg (minuteur)
        button.tsx                         variantes et tailles de bouton, 44 px minimum
        card.tsx                           tons, tailles, variante interactive
        dropdown-menu.tsx                  menu ; tailles des éléments définies ici
        item.tsx                           lignes de la correction, variantes par marque
        kbd.tsx                            touches affichées dans les raccourcis
        progress.tsx                       barre de progression, variante wavy, largeur par --progress
        separator.tsx                      séparateur, utilisé par item.tsx
        sheet.tsx                          feuille ; forme du côté bottom définie ici
        skeleton.tsx                       tel que livré
        tooltip.tsx                        tel que livré
        (sur @ui-sdk/react : ce qui tient une valeur en place)
        action-bar.tsx                     barre d'action à hauteur constante et son panneau repliable (Collapsible)
        checkbox.tsx                       Checkbox, CheckboxGroup, case parente et état mixte
        choice-group.tsx                   ChoiceGroup, Choice, ChoiceMarker, ChoiceContent, ChoiceLabel, ChoiceDescription, ChoiceIndicator
        segmented-control.tsx              SegmentedControl et ses éléments, indicateur placé par les variables CSS de la partie
        (propres, sans bibliothèque de comportement)
        code.tsx                           Code (en ligne) et CodeBlock
        motion-tokens.ts                   ressorts, pas de décalage, plafond du décalage
        motion.tsx                         MotionProvider, ScreenTransition, Reveal, Stagger, AnimatedNumber
        progress-ring.tsx                  anneau de progression ondulé, tailles en variantes
        spinner.tsx                        indicateur de chargement qui change de forme
        stacked-bar.tsx                    segments proportionnels aux tons de graphique, et sa légende

  tests/
    unit/                                  bun test ; même forme que src/
      support/
        memory-ports.ts                    hôte de stockage en mémoire, horloge réglable, hasard compté, memoryPorts()
        subjects.ts                        fabriques de brouillons, matière de démonstration
      domains/
        catalog/
          domain/subject.test.ts           règles d'une matière valide, forme du domaine, révision, texte enrichi, résumé
          infrastructure/wire.test.ts      refus du schéma avec fichier et message, passage au brouillon
          infrastructure/content-repository.test.ts  list() triée sans lire de chapitre, load() une fois, matière introuvable ou invalide
        progress/
          domain/progress.test.ts          table de maîtrise, record, currentFor, masteryIn
          infrastructure/progress-repository.test.ts  un magasin par matière, progression courante mémoïsée, statistiques périmées retirées
        session/
          domain/plan.test.ts              tirage, poids, mélange, générateur à graine
          domain/session.test.ts           commandes par politique, événements émis, session terminée
          domain/snapshot.test.ts          aller-retour à chaque étape, refus
          domain/view.test.ts              isCorrect, résultats, marques, aucun corrigé en correction différée
          infrastructure/session-repository.test.ts  restauration mémoïsée, session d'une autre matière, contenu modifié, session terminée
      shared/
        infrastructure/storage.test.ts     allers-retours des trois clés, données corrompues, versions, comportement du magasin versionné
      app/
        application.test.ts                chaque cas d'usage par createApplication(memoryPorts()), sans React
        stored-compat.test.ts              des chaînes écrites par l'ancienne app se relisent à l'identique
      content/
        real-content.test.ts               chaque dossier de content/ est une matière valide
        schemas.test.ts                    tools/content/schemas/*.json égalent ce qu'écrirait schema.ts ; réglages de l'éditeur
      design-system/
        layout-neutral-states.test.ts      une variante d'état ne change que l'apparence, jamais la boîte
        shape.test.ts                      aucun état ne passe à un rayon infini ; aucune courbe d'accélération ne dépasse
        stylesheet.ts                      lecture de src/index.css pour les tests suivants
        theme-contrast.test.ts             WCAG AA de chaque paire texte et fond, teintes mélangées, une teinte tous les 30 degrés
        theme-convention.test.ts           ordre shadcn, chaque variable en clair, sombre et @theme, gouttière stable
      project/
        no-em-dash.test.ts                 aucun tiret cadratin dans le dépôt
    e2e/                                   Playwright, sur l'application construite
      support.ts                           vérification axe, « pas de défilement horizontal », mesure de la mise en page, ouverture
      specs/
        exam.spec.ts                       navigation libre, navigateur, confirmation de fin, note sur 20
        home.spec.ts                       liste des matières, bannière de reprise, thème
        setup.spec.ts                      cases parentes, modes, nombre de questions, réinitialisation
        stability.spec.ts                  rien ne bouge ni ne défile à chaque ouverture, sélection, correction et question suivante
        training.spec.ts                   au clavier seulement : chiffres, Entrée, correction visible, résultats
```

## Sens des dépendances

```
main.tsx ──> app ──> pages ──> domains (surfaces application et components)
   │          │                    preferences ──> session ──> progress ──> catalog
   │          └──> components/layout ──> domains
   └──> domains/*/infrastructure, shared/infrastructure   (seul main.tsx connaît les adaptateurs)

dans un domaine :   components ──> application ──> domain <── infrastructure
partout :           domains, pages, app ──> shared ; tout ce qui rend ──> components/ui ──> lib
```

`eslint.config.js` refuse toute flèche dans l'autre sens ; le détail est dans
[architecture.md](architecture.md#la-règle-de-dépendance-et-son-application).

## Qui écrit quoi

| État                            | Seul écrivain                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| session stockée (`qcm.session`) | `session/application/use-cases.ts` par `SessionRepository`                                                               |
| progression d'une matière       | `session/application/use-cases.ts` par `ProgressRepository`                                                              |
| préférences (`qcm.settings`)    | `preferences/application/preferences.ts` : `chooseTheme`, et `rememberSetup` appelé par `startSession` via `SetupMemory` |
| classe `dark` de `<html>`       | `installTheme` dans `preferences/components/theme.ts`                                                                    |
| `--hue` sur `<html>`            | `useSeedHue` dans `catalog/components/hue.ts` ; `hueScope` pour une carte                                                |
| `location.hash`                 | les liens construits par `hrefOf` dans `app/route.ts`                                                                    |

## Les listes et leur source unique

| Liste                                    | Source                                                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| matières, sections, chapitres, questions | les dossiers et fichiers de `content/`                                                                                |
| modes                                    | `MODES` dans `session/domain/mode.ts` ; les libellés sont un `Record<Mode, ...>`, un nouveau mode échoue au typecheck |
| niveaux de maîtrise                      | l'union `Mastery` ; poids du tirage, décomptes et libellés sont des `Record<Mastery, ...>`                            |
| domaines (pour les règles de lint)       | `readdirSync("src/domains")` dans `eslint.config.js`                                                                  |
| sens entre domaines                      | `DIRECT_UPSTREAM` dans `eslint.config.js`, l'amont direct de chaque domaine ; l'amont complet en est déduit           |
| tokens de couleur                        | `src/index.css` ; `shadcn/no-raw-colors` refuse le reste                                                              |
| variantes et tailles                     | l'appel `cva` de chaque primitive ; les messages de lint les citent depuis le fichier                                 |
| clés, versions et formes stockées        | les `stored-*.ts` de l'infrastructure de chaque domaine                                                               |
| JSON Schemas du contenu                  | générés depuis `catalog/infrastructure/wire.ts` ; un test échoue s'ils sont périmés                                   |
