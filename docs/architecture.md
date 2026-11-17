# Architecture

Ce document décrit le code tel qu'il est, et pourquoi il a cette forme. L'arborescence fichier par fichier est dans
[module-map.md](module-map.md), le design system dans [design-system.md](design-system.md), le vocabulaire dans
[ubiquitous-language.md](ubiquitous-language.md).

## Le problème

Une application de révision par QCM, sans serveur : les questions sont des fichiers JSON dans `content/`, la progression
vit dans le `localStorage` du navigateur. Elle doit pouvoir accueillir de nouvelles matières sans toucher au code.

La première version fonctionnait et ses idées tenaient (un cœur pur, un seul chemin d'écriture, la session stockée sous
forme d'instantané, les réponses identifiées par leur choix et non par leur position). Sa forme, elle, ne tenait pas :

- des dossiers nommés d'après les noms du premier croquis (`content`, `progress`, `session`, `persistence`, `study`),
  sans couches ni frontières qu'un lecteur DDD reconnaisse ;
- un thème à deux vocabulaires (`--md-*`, `bg-surface-high`, `text-title`) avec les noms de shadcn en alias, et une
  échelle typographique maison qui avait déjà produit un bogue dans la fusion des classes ;
- des composants vendorisés restylés depuis les écrans par `className`, quatre contrôles qui écrivaient leurs `role=` et
  leurs touches fléchées à la main à côté d'une bibliothèque de comportement installée, dix-huit composants d'écran
  dans un seul dossier ;
- une interface où des éléments bougeaient : révéler une réponse ajoutait une ligne sous chaque choix annoté (12 à 24 px
  de décalage) et l'explication apparaissait sous les choix avec un défilement automatique (60 à 200 px).

Ce qui ne bouge pas : le comportement, le format des fichiers de contenu, les clés et formes stockées (la progression
déjà dans les navigateurs se relit sans migration), Bun, Vite, React 19, Tailwind v4, shadcn/ui, `motion`, le port 5180.

## La structure : un dossier par domaine

```
src/
  main.tsx          racine de composition : le seul fichier qui connaît les adaptateurs
  index.css         le thème
  app/              ce qui relie les domaines : la façade Application, son fournisseur React, l'aiguillage
  domains/
    catalog/        matières, chapitres, questions
    progress/       maîtrise de chaque question
    session/        une session de révision : tirage, déroulé, correction
    preferences/    thème et dernier réglage
  pages/            un fichier par écran, qui compose les composants des domaines
  components/ui/    le design system, qui ne connaît rien de l'application
  components/layout/ la coquille : barre du haut, erreur, chargement
  shared/           ce que plusieurs domaines utilisent sans le posséder
  lib/              cn et le typage des variables CSS
```

Le premier niveau sous `src/domains` est le métier : on ouvre le dossier, on voit les quatre domaines, et tout ce qui
concerne l'un d'eux est dans le sien. Chaque domaine se découpe en couches, chacune dans son dossier :

| Dossier           | Ce qu'il contient                                                             | Ce qu'il importe                                                                                         |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `domain/`         | le modèle en TypeScript pur, ses règles et ses ports (les dépôts)             | la couche `domain` des domaines en amont                                                                 |
| `application/`    | les cas d'usage, et la surface que React a le droit de lire                   | la couche `domain` du domaine et de ceux en amont, `shared/application`                                  |
| `infrastructure/` | les adaptateurs : schémas des fichiers et du stockage, dépôts sur le stockage | `domain` et `application` du domaine, `domain` en amont, `shared/application` et `shared/infrastructure` |
| `components/`     | les composants React du domaine                                               | `application` du domaine, `application` et `components` en amont, `shared`, le design system             |

Un domaine n'a que les couches dont il a du code. Chaque couche a une entrée, son `index.ts` : on importe
`@/domains/session/application`, jamais `@/domains/session/application/use-cases`. À l'intérieur d'une couche, les
fichiers se lisent entre eux par un chemin relatif ; un chemin relatif ne sort jamais d'une couche.

`shared/` est rangé de la même façon, par nature : `shared/application` (TypeScript pur : `Clock`, `Random`,
`Readable`), `shared/infrastructure` (l'hôte de stockage, le magasin versionné, l'horloge système et le hasard
cryptographique) et `shared/components` (la boîte de confirmation, les formats en français, `useReadable`). Il
n'importe aucun domaine.

`main.tsx` crée les adaptateurs du navigateur, l'application (`createApplication(ports)`), installe le thème, puis rend
`<App />` dans un `ApplicationProvider`. Les tests de l'application remplacent seulement les ports (`memoryPorts()` dans
`tests/unit/support/memory-ports.ts`) : ni React, ni navigateur.

Les tests suivent la même forme : `tests/unit/domains/<domaine>/<couche>/`, puis `tests/unit/shared`, `tests/unit/app`,
`tests/unit/design-system`, `tests/unit/content` et `tests/unit/project` ; les specs Playwright sont dans `tests/e2e`.
Les scripts lancés à la main ou par la CI (`content:check`, `content:schema`) et les JSON Schemas qu'ils écrivent sont
dans `tools/content`.

## Pourquoi par domaine

Une première organisation de cette refonte rangeait le code par couche au premier niveau :
`src/domain/{catalog,progress,session}`, `src/application`, `src/infrastructure`,
`src/presentation/{features,shell,shared}`. Les frontières étaient justes, mais un domaine était éparpillé dans quatre
arbres : pour comprendre la progression, il fallait ouvrir `domain/progress`, un morceau de `application/study.ts`,
`infrastructure/storage/progress-repository.ts` et `presentation/features/setup/mastery.tsx`. Le propriétaire l'a
refusée : ce qu'il reconnaît comme DDD, dans ses propres projets, c'est le domaine comme unité de premier niveau, qui
réunit son modèle, sa logique, son accès aux données et ses composants. C'est aussi la lecture la plus forte du DDD :
un contexte délimité est un module, pas une tranche de chaque couche. Elle a remplacé l'organisation par couches.

Ce qui faisait la valeur de l'organisation par couches est gardé, couche par couche, à l'intérieur de chaque domaine :
un modèle pur, des ports implémentés par des adaptateurs, des cas d'usage que React consomme par une seule surface, et
une règle de dépendance appliquée par le lint.

Les objections qui avaient fait écarter les dossiers par domaine ont chacune une réponse dans le code :

- **Les cas d'usage traversent les domaines** (valider une réponse touche la session et la progression). Un cas d'usage
  vit dans le domaine le plus en aval de ceux qu'il touche : `sendCommand` est dans `session/application` et écrit la
  progression par le port `ProgressRepository`, que `session` a le droit de connaître. Quand deux domaines ne peuvent pas
  se connaître, c'est `app/` qui les relie (voir le dernier réglage, plus bas).
- **Beaucoup de dossiers à un seul fichier.** Un domaine n'a que les couches dont il a besoin, et une couche à un
  fichier reste plus facile à trouver qu'un fichier perdu dans une couche commune.
- **Une règle de dépendance en matrice.** Elle n'est pas écrite à la main : `eslint.config.js` lit les domaines dans
  `src/domains`, et calcule les droits de chaque couche à partir d'une seule table, l'amont direct de chaque domaine.

## Quatre domaines

De l'amont vers l'aval : `catalog`, puis `progress`, puis `session`, puis `preferences`. Un domaine peut lire un domaine
en amont, jamais l'inverse.

**`catalog`** : ce qu'il y a à réviser. L'agrégat `Subject` (une matière) contient ses `Section`, ses `Chapter`, ses
`Question` indexées par identifiant, chaque question avec ses `Choice` et son corrigé (`AnswerKey`). Le texte est du
`RichText` : des segments de texte et de code, découpés aux accents graves. Les règles d'une matière valide (identifiants
uniques, ordre unique, positions de réponse existantes, une réponse pour `single` et au moins deux pour `multi`, choix
non répétés, accents graves refermés) sont du savoir métier et vivent dans `catalog/domain/subject.ts`, appliquées à des
`ChapterDraft` que l'infrastructure produit après validation du JSON. Chaque question porte une `Revision`, empreinte de
son énoncé, de son code, de ses choix et de son corrigé : corriger une question change sa révision. Le port
`SubjectRepository` est dans `catalog/domain/repository.ts`. Les identifiants sont des types marqués (`SubjectId`,
`ChapterId`, `QuestionId`, `ChoiceId`) créés par quatre fonctions de `ids.ts`, les seuls `as` du cœur. L'infrastructure
lit les fichiers (`wire.ts`, zod) et les rassemble par `import.meta.glob` (`vite-subject-repository.ts`) ; les
composants sont la carte d'une matière, le rendu du texte enrichi et la portée de teinte (`hue.ts`).

**`progress`** : ce que l'on sait déjà. `Progress` associe à chaque question une `QuestionStat` (vue combien de fois,
série de bonnes réponses, dernier résultat, date, révision). La maîtrise (`Mastery`) se déduit : jamais vue, à revoir
(dernière réponse fausse), en cours, maîtrisée (deux bonnes réponses de suite). `record` applique des `Verdict`,
`currentFor` écarte les statistiques dont la révision ne correspond plus à la question, `masteryIn` compte. La vue
d'ensemble d'une matière (`overviewOf`, `SubjectOverview`) est le modèle de lecture de ce domaine : les décomptes de
maîtrise par chapitre, par section et en tout. Le port `ProgressRepository` est à côté ; l'adaptateur garde un magasin
par matière. Les composants sont la barre et la légende de maîtrise, avec leurs libellés.

**`session`** : une session de révision. `planSession` fait le tirage (`SessionPlan`) : vivier selon le mode, tirage
pondéré par la maîtrise (une question ratée pèse 6, une nouvelle 4, une en cours 2, une maîtrisée de 1 à 2 selon son
ancienneté), puis mélange des questions et de leurs choix, avec un générateur à graine. L'agrégat `Session` reçoit des
commandes (`toggle`, `confirm`, `goTo`, `expire`) par `handle`, qui rend la nouvelle session et des événements du domaine
(`answer-judged`, `session-finished`). Les trois modes sont une table de politiques (`MODES` : correction immédiate ou
différée, vivier complet ou erreurs seulement, navigation linéaire ou libre, temps par question). `viewOf` produit le
modèle de lecture (`QuestionView` ou `ResultsView`), `snapshotOf` et `restore` font le mémento stocké. La couche
`application` porte les cas d'usage (`use-cases.ts`), l'objet `Study` qu'un écran reçoit pour une matière (`study.ts`) et
les ports dont ils ont besoin (`ports.ts`). Les composants sont rangés par moment : `setup/` (chapitres, mode, nombre),
`question/` (la question, ses réponses, la barre d'action, le minuteur, le navigateur, les raccourcis, les
confirmations), `results/` (score, scores par chapitre, correction), plus la bannière de reprise et les libellés des
modes.

**`preferences`** : le thème choisi et le dernier réglage (nombre de questions et mode). Comme le dernier réglage nomme
un `Mode`, ce domaine est en aval de `session`, et rien ne dépend de lui. Le domaine déclare `Preferences` et le port
`PreferencesStore` ; l'application expose `PreferencesSource` (ce que le menu de thème lit, avec `chooseTheme`) et
`rememberSetup` ; l'infrastructure garde la clé `qcm.settings` ; les composants installent la classe `dark` et
affichent le menu de thème.

Le démarrage d'une session retient le réglage, mais `session` ne peut pas connaître `preferences`. `session` déclare
donc le port dont il a besoin, `SetupMemory` (`remember(setup)`), dans `SessionPorts`, et `app/application.ts` le
branche sur `rememberSetup(ports.preferences, setup)`. Le cas d'usage reste le seul écrivain du dernier réglage, sans
flèche vers l'aval.

## La règle de dépendance et son application

Les dépendances vont des domaines en aval vers les domaines en amont, et, dans un domaine, des composants et de
l'infrastructure vers l'application, puis vers le modèle. Le design system ne dépend de rien d'applicatif.
`eslint.config.js` en fait des erreurs, sans liste d'exceptions :

- **Domaines.** La liste des domaines est lue dans `src/domains` au chargement de la configuration. Une seule table,
  `DIRECT_UPSTREAM`, dit l'amont direct de chacun (`progress` : `catalog` ; `session` : `progress` ; `preferences` :
  `session`) ; la configuration en déduit l'amont complet, refuse un nom qui n'est pas un dossier et refuse un cycle. Un
  domaine qui n'est pas dans la table n'a pas d'amont : il ne peut importer aucun autre domaine.
- **Couches.** Chaque couche de chaque domaine reçoit une liste d'entrées `@/` permises, et tout le reste est refusé,
  avec un message qui donne la liste. `domain/` : la couche `domain` des domaines en amont, rien d'autre.
  `application/` : la couche `domain` du domaine et de l'amont, `@/shared/application`. `infrastructure/` : `domain` et
  `application` du domaine, `domain` de l'amont, `@/shared/application`, `@/shared/infrastructure`. `components/` :
  `application` du domaine, `application` et `components` de l'amont, `@/shared/application`, `@/shared/components`,
  `@/components/ui/*`, `@/lib/*`. Un composant ne lit donc jamais le modèle ni l'infrastructure : la surface
  `application` de chaque domaine est sa langue publiée vers React.
- **Points d'entrée.** On importe une couche de domaine ou une nature de `shared` par son entrée
  (`@/domains/<domaine>/<couche>`, `@/shared/<nature>`), jamais un fichier interne. Un chemin relatif reste dans sa
  couche : depuis la racine d'une couche il ne remonte pas (`..`), depuis un sous-dossier il remonte d'un niveau au plus.
- **Le reste de `src`.** `shared/application` n'importe rien ; `shared/infrastructure` importe `shared/application` ;
  `shared/components` importe `shared/application` et le design system ; aucun n'importe un domaine. `pages/` importe
  les surfaces `application` et `components` des domaines, `shared`, le design system, `@/app/provider` et
  `@/app/route`, et n'importe pas une autre page. `components/layout/` importe les mêmes surfaces, ni `app` ni les
  pages. `app/` importe les surfaces `application` et `components`, les pages et la coquille, jamais une
  infrastructure : seul `main.tsx` connaît les adaptateurs. `components/ui` n'importe que lui-même et `@/lib/*` ; `lib`
  n'importe rien. Un dossier de `src` qui n'est pas dans cette liste (une couche inconnue dans un domaine, par
  exemple) n'a le droit d'importer rien de `@/`.
- **Bibliothèques.** Radix, UI SDK, `motion` et `class-variance-authority` ne s'importent que dans `components/ui`.
  `zod` ne s'importe que dans une infrastructure (et les outils). Les couches `domain` et `application`, et
  `shared/application`, n'importent ni React, ni `lucide-react`, ni aucune de ces bibliothèques ; une infrastructure
  n'importe rien qui rende. Dans `components/ui`, les contrôles à valeur de Radix (`Checkbox`, `RadioGroup`, `Select`,
  `Slider`, `Switch`, `Tabs`, `Toggle`, `ToggleGroup`) et les entrées « couche » de UI SDK (dialogue, menu, popover,
  tooltip...) sont interdits : voir la quatrième décision.
- **Effets ambiants.** `localStorage`, `sessionStorage` et `indexedDB` ne sont permis que dans `shared/infrastructure`.
  Les couches `domain` et `application` et `shared/application` n'appellent ni `Date.now` ni `Math.random` : elles
  passent par les ports `Clock` et `Random`, ou reçoivent `now` et un `Rng` en paramètre.
- **Comportement des contrôles.** Hors de `components/ui`, un `role=` de widget (radio, checkbox, menu, dialog, tab...)
  ou un `onKeyDown` est une erreur : le comportement clavier appartient aux primitives. Les raccourcis globaux de la
  session passent par un écouteur sur `window` dans `session/components/question/use-session-keys.ts`.
- **Typage.** Pas d'assertion non nulle, pas de cast (`consistent-type-assertions: never`), sauf dans
  `catalog/domain/ids.ts` et dans `components/ui` (code installé par la CLI).
- **Commentaires.** Une règle locale (`local/no-comments`) refuse tout commentaire, dans tout fichier `.js`, `.ts` et
  `.tsx`, `components/ui` compris, sans exception.

Les frontières reposent sur ESLint, pas sur des paquets séparés : c'est un compromis accepté (voir plus bas).

## Les décisions porteuses

### 1. Les dépôts rendent des agrégats, React reçoit des modèles de lecture

`Application` (`app/application.ts`) a quatre membres (`subjects`, `study(subjectId)`, `ongoingSubjectId`,
`preferences`) et `Study` (`session/application/study.ts`) en a onze (`get`, `subscribe`, `poolSizes`, `start`,
`replay`, `quit`, `toggle`, `confirm`, `goTo`, `expire`, `resetProgress`). Derrière eux : le tirage, la machine à états,
la correction, les résultats, la restauration, trois magasins, le versionnement, la synchronisation entre onglets,
l'horloge et le hasard.

Les écrans reçoivent `SubjectOverview` (sections, chapitres, nombre de questions et décomptes de maîtrise) et
`SessionView`. Aucun des deux ne contient de corrigé : une `ChoiceView` a une `mark` qui reste `null` tant que la
politique du mode ne la révèle pas. Un composant ne peut pas lire `Question.answer` : les surfaces `application` ne
publient pas `Question`, et le lint interdit aux composants les couches `domain`. La correction d'une question revue
aux résultats vient de la vue, pas d'un calcul dans le composant.

Le chemin d'écriture d'une session est une seule fonction, `sendCommand` (`session/application/use-cases.ts`) : lire la
session (`SessionRepository.of`), appliquer la commande (`handle`), enregistrer (`save`), puis verser les verdicts des
événements `answer-judged` dans la progression (`ProgressRepository.update` avec `record`). Un seul écrivain par état ;
le tableau est dans [module-map.md](module-map.md#qui-écrit-quoi).

L'identité des objets est garantie à chaque étage pour que `useSyncExternalStore` reçoive un instantané stable :

- `Study.get()` recalcule l'état seulement quand la session ou la progression rendue par les dépôts a changé d'identité ;
- `storedSessionRepository` ne relance `restore` que si l'instantané stocké ou la matière a changé ;
- `storedProgressRepository` ne relance `currentFor` que si la progression stockée ou la matière a changé ;
- le magasin versionné ne redécode que si la chaîne brute du `localStorage` a changé ;
- `createApplication` garde la promesse d'une `Study` par matière, et le dépôt de contenu la promesse de chaque matière ;
  les deux oublient une promesse rejetée, pour qu'un rechargement réessaie.

À l'ouverture d'une matière, une session en cours qui ne peut plus être restaurée (parce que le contenu a changé) est
écartée.

### 2. Le stockage garde les formes de l'ancienne application

Chaque domaine déclare sa clé, sa version, son schéma zod, son encodage et son repli dans son infrastructure :
`preferences/infrastructure/stored-settings.ts` (`qcm.settings`), `progress/infrastructure/stored-progress.ts`
(`qcm.progress.<matière>`), `session/infrastructure/stored-session.ts` (`qcm.session`).
`shared/infrastructure/versioned-store.ts` les enveloppe dans `{ v, data }` :

- une version plus ancienne passe par ses migrations ;
- une donnée illisible est mise de côté une fois sous `<clé>.corrupt`, puis remplacée par le repli ;
- une version plus récente (écrite par un build plus neuf dans un autre onglet) met le magasin en lecture seule : les
  changements restent en mémoire et ne l'écrasent pas ;
- une écriture qui échoue (quota, navigation privée) garde la valeur en mémoire ;
- l'événement `storage` propage les changements entre onglets.

`tests/unit/app/stored-compat.test.ts` relit des chaînes écrites par l'ancienne application.

### 3. Le thème est le fichier de shadcn, dans l'ordre et avec les noms de shadcn

`src/index.css` est le fichier désigné par `components.json`. Il suit l'ordre documenté (imports, `@custom-variant dark`,
`@theme inline`, `:root`, `.dark`, `@layer base`) et déclare les variables de shadcn plus quatre ajouts nommés à la
manière de shadcn : `--destructive-foreground`, `--tertiary` et `--success` (chacun avec son `-foreground`), et
`--overlay` pour le fond des fenêtres modales. Les rôles Material 3 de l'ancienne version sont devenus des valeurs, les
panneaux teintés utilisent l'idiome des composants shadcn (`bg-primary/15`, `bg-destructive/10`), l'échelle
typographique est celle de Tailwind. Une matière garde sa couleur par une portée conventionnelle : la teinte `--hue`
alimente les valeurs, et `[data-hue]` redéclare les mêmes variables. Le détail est dans
[design-system.md](design-system.md).

### 4. Une question choisit la bibliothèque de comportement : « est-ce que ça ouvre une couche ? »

Ce qui ouvre une couche (boîte de dialogue, feuille, menu, infobulle) ou ce qui est statique (bouton, badge, carte,
alerte, squelette) s'installe par la CLI shadcn et garde Radix. Ce qui tient une valeur en place (réponses, modes,
contrôle segmenté, cases à cocher avec case parente, panneau repliable de la barre d'action) est construit dans
`components/ui` sur `@ui-sdk/react`. Les quatre contrôles écrits à la main sont devenus trois primitives :
`ChoiceGroup` (réponses et modes ; `locked` correspond à la lecture seule de UI SDK, focalisable mais non modifiable),
`SegmentedControl` (nombre de questions, filtre des résultats) et `Checkbox` avec `CheckboxGroup` et une case parente
(l'état mixte d'une section n'est plus calculé à la main). Le navigateur d'examen n'est pas un contrôle de sélection :
c'est une liste de `Button size="tile"` avec `aria-current`.

Les deux moitiés de la règle sont dans le lint (voir plus haut), et la règle de choix est détaillée dans
[design-system.md](design-system.md#choisir-une-primitive).

### 5. Rien ne bouge

Exigence du propriétaire : « si des éléments bougent sur une UI, en responsive ou dès qu'une modale apparaît, l'UI est
mal faite ». Six règles en découlent :

1. une variante qui représente un état ne change que l'apparence, jamais la boîte ;
2. un choix a les mêmes emplacements dans tous ses états, et son verdict passe par l'icône, la couleur et une
   description pour lecteur d'écran, pas par une ligne visible en plus ;
3. l'explication ne pousse ni ne fait défiler la page : elle s'ouvre vers le haut depuis la barre d'action, par-dessus
   le contenu, à toutes les largeurs ; la barre garde une hauteur constante et le panneau se replie ; aucun
   `scrollIntoView` ;
4. la gouttière de la barre de défilement est stable, et la compensation que Radix ajoute au verrouillage du défilement
   est neutralisée ;
5. une spec de bout en bout mesure tout cela ;
6. un token `--overlay` pour les fonds modaux.

Les mécanismes et les tests sont décrits dans [design-system.md](design-system.md#rien-ne-bouge).

### 6. Le contenu est validé à deux frontières

Deux frontières, toutes deux dans une infrastructure : le JSON des fichiers (`catalog/infrastructure/wire.ts`, zod,
messages en français) et le JSON stocké (les `stored-*.ts` de chaque domaine). Les règles d'une matière valide restent
dans le domaine. Le même code sert l'application, `bun run content:check` et les tests, et les JSON Schemas de
`tools/content/schemas/` sont générés depuis les schémas zod pour que l'éditeur valide pendant la saisie. Les outils
importent `wire.ts` directement, et non l'entrée de l'infrastructure : celle-ci contient aussi l'adaptateur Vite
(`import.meta.glob`), qui n'a pas de sens hors du build.

## La décision de synthèse

Deux conceptions ont été proposées pour cette refonte. La synthèse a pris la seconde comme base et lui a greffé une
partie de la première :

- **Base : la conception à couches nommées.** Elle reste la plus proche de ce que le propriétaire a demandé
  nommément : les couches et les primitives statiques arrivent par `shadcn add` et restent Radix, le projet reste un
  projet shadcn qu'un développeur shadcn reconnaît, et UI SDK prend exactement les contrôles qui étaient écrits à la
  main. Son croquis avait été typé et passé au lint avec les six règles `@shadcn/lint` en erreur, et un exemple fautif
  avait prouvé que chaque règle et chaque frontière se déclenchent. Le routeur est différé avec un déclencheur nommé.
- **Greffe : « rien ne bouge ».** Les six règles de la section précédente viennent de la première conception et
  remplacent ce que la base disait sur les mêmes points (son panneau de correction qui défilait jusqu'à l'explication et
  sa barre basse).
- **Écarté de la première conception** : retirer Radix et écrire chaque primitive interactive sur UI SDK (qui est une
  bêta 0.1, et `shadcn add` cesserait d'être la façon dont une primitive arrive ; gardé seulement comme repli si la
  neutralisation du verrouillage de Radix avait échoué) ; la fusion de `progress` dans `session` ; TanStack Router dès
  maintenant.
- **Questions tranchées** : les flèches dans un groupe de réponses sélectionnent en se déplaçant, comme des boutons
  radio natifs ; Playwright sert le build sur le port 5190, pour ne jamais gêner le serveur de développement sur 5180.

La base rangeait ses couches au premier niveau de `src`. Une fois le code écrit, le propriétaire a demandé l'inverse :
le domaine au premier niveau, les couches dedans (voir « Pourquoi par domaine »). Le code a été déplacé et ses
frontières réécrites pour la nouvelle arborescence, sans changer de logique : le comportement, le stockage, le contenu,
le design system et l'intention des tests sont restés les mêmes.

Point de départ mesuré, pour mémoire : avec la configuration d'adoption de `@shadcn/lint`, l'ancien code avait 138
constats (79 restylages, 25 valeurs arbitraires, 25 noms de classe dynamiques, 9 styles en ligne). Il en a zéro, les six
règles étant en erreur.

## Écarts entre le plan et le code

Là où l'implémentation s'est écartée du plan, c'est le code qui fait foi ; ces écarts sont voulus :

- **La barre d'action remplace la barre basse et le panneau de correction.** `components/ui/action-bar.tsx`
  (`ActionBar`, `ActionBarRow`, `ActionBarStatus`, `ActionBarPrimary`, `ActionBarPanel`, `ActionBarPanelTrigger`) est
  construit sur le `Collapsible` de UI SDK. Il sert à la session (`placement="sticky"`, avec le panneau de correction) et
  au réglage sur petit écran (`placement="fixed"`). Les fichiers prévus `bottom-bar.tsx`, `feedback-panel.tsx` et
  `session-actions.tsx` n'existent pas ; la session les remplace par
  `session/components/question/session-action-bar.tsx`.
- **`item.tsx` et `separator.tsx` sont gardés.** La correction des résultats
  (`session/components/results/review-card.tsx`) affiche chaque choix dans un `Item`, avec des variantes par marque, et
  `item.tsx` importe `Separator`.
- **Les boutons font 44 px au minimum** (`h-11`, `size-11`), la cible tactile recommandée.
- **Pas d'agrandissement ni de réduction à l'appui.** L'appui change seulement le rayon (`active:rounded-md`), ce qui ne
  modifie pas la boîte.
- **`html` a `overflow-y: scroll`** en plus de `scrollbar-gutter: stable`, et `body[data-scroll-locked]` ne reçoit ni
  marge ni remplissage à droite ni `overflow: hidden` : la neutralisation de Radix a réussi, le repli sur UI SDK n'a pas
  été nécessaire.
- **La luminosité de la palette a été ajustée** pour que le test de contraste passe pour toutes les teintes échantillonnées.
- **`src/lib/css-variables.d.ts`** étend le type de style de React aux propriétés personnalisées (`--progress`, `--hue`),
  ce qui évite tout cast quand une primitive passe une variable en `style`.
- **Les détails de mémoïsation de l'application et du stockage** sont ceux décrits dans la première décision.
- **Tests en plus du plan** : `tests/unit/domains/catalog/infrastructure/content-repository.test.ts`,
  `tests/unit/design-system/layout-neutral-states.test.ts`, `tests/e2e/specs/stability.spec.ts`, et quatre projets
  Playwright (390, 360, 768 et 1400 px) au lieu de deux.
- **Les exports sans importeur ont été retirés** lors de la clôture (détectés par `knip`), sauf les parties des
  primitives installées par la CLI shadcn (voir `knip.json`), qui forment l'API documentée de ces composants.

## Compromis acceptés

- Dans chaque domaine qui a des composants, `application/index.ts` réexporte les types du modèle que React peut lire.
  Pour `catalog` et `progress`, qui n'ont pas de cas d'usage propre, cette entrée n'est faite que de réexports : c'est
  la langue publiée du domaine, en échange de composants qui ne peuvent physiquement pas importer le modèle.
- Un domaine en aval qui doit faire écrire un domaine dont il ne peut pas dépendre déclare un port (`SetupMemory`), et
  `app/` le branche : une indirection de plus, en échange d'un graphe de domaines sans cycle.
- La table `DIRECT_UPSTREAM` de `eslint.config.js` est écrite à la main : la direction entre domaines est une décision,
  pas un fait que l'arborescence peut dire. La liste des domaines, elle, vient des dossiers.
- Les pages lisent `useApplication` dans `app/provider.tsx`, et `app/app.tsx` affiche les pages : `app` et `pages` se
  connaissent dans les deux sens au niveau des dossiers, sans cycle entre modules (comme le magasin et les pages d'un
  projet React à domaines).
- Une petite dérive par rapport à la palette Material (teintes par transparence plutôt que conteneurs tonals, échelle
  typographique de Tailwind) en échange d'un thème sans vocabulaire propre.
- Les flèches dans un groupe de réponses sélectionnent en se déplaçant, comme des radios natives, là où l'ancienne
  version ne déplaçait que le focus, en échange de la suppression de toute gestion de touches maison.
- Deux bibliothèques de comportement dans `components/ui`, en échange de garder la bêta loin des pièges à focus et des
  verrous de défilement ; la frontière tient en une question et deux clôtures de lint.
- Des cas d'usage écrits comme des fonctions d'un même module (`session/application/use-cases.ts`) plutôt qu'une classe
  par fichier : neuf fichiers de dix lignes seraient des couches de transit.
- Des listes de sélecteurs `[data-hue]` dans un fichier qui reproduit sinon le modèle de shadcn, parce qu'une propriété
  personnalisée se résout là où elle est déclarée : une portée doit redéclarer les variables.
- Une ligne au-dessus des imports de `index.css` (`@layer ui-sdk;`), exigée par UI SDK.
- Les frontières reposent sur ESLint, pas sur des paquets.
- `@ui-sdk/react` est en `^0.1.0-beta.6` : une version bêta. Si une version casse `Radio`, `Checkbox`,
  `SegmentedControl` ou `Collapsible`, l'impact se limite à quatre fichiers de `components/ui`, et les specs Playwright le
  verraient.

## Alternatives écartées

- **Les couches au premier niveau** (`src/domain`, `src/application`, `src/infrastructure`, `src/presentation`). C'était
  l'organisation précédente de cette refonte : une règle de dépendance à une seule flèche et moins de dossiers, mais
  chaque domaine dispersé dans quatre arbres. Remplacée (voir « Pourquoi par domaine »).
- **Un `index.ts` par domaine qui réexporte toutes ses couches.** Une seule entrée par domaine serait plus courte, mais
  le modèle pur d'un domaine en aval importerait alors, à travers elle, les composants React et les schémas zod de
  l'amont. Une entrée par couche garde la pureté vraie, et pas seulement dans le lint.
- **UI SDK partout, Radix retiré.** Une seule bibliothèque est la règle la plus simple, mais elle déplace quatre couches
  qui marchent sur une bêta 0.1, et `bunx shadcn add` ne serait plus la façon dont une primitive arrive.
- **D'abord le registre** (« ce que shadcn livre, UI SDK pour le reste »). shadcn livre un groupe radio, un groupe de
  bascules et une case à cocher Radix : les contrôles écrits à la main y seraient passés, UI SDK n'aurait presque plus
  servi, et la case parente comme les groupes en lecture seule auraient été réécrits à la main.
- **Garder les tokens Material avec les noms shadcn en alias.** Deux vocabulaires, et `no-raw-colors` les aurait
  bénis tous les deux.
- **Des écrans qui reçoivent `Subject` et `Progress`** et calculent leurs décomptes : une application plus petite, mais
  le corrigé à une propriété près et la logique de comptage dans les composants.
- **L'état React comme foyer de la session** (`useReducer` et un effet de persistance) : deux copies et une double
  écriture en StrictMode.

## Choix de stack différés et leurs déclencheurs

- **TanStack Router** : à la troisième route, ou à une route avec des paramètres au-delà de la matière (lien direct vers
  une sélection de chapitres, page de statistiques). Deux routes ne le justifient pas ; `app/route.ts` fait trente
  lignes.
- **`vite-plugin-pwa`** (mise à jour sur invitation) : quand l'application sera servie depuis un hôte public. Un service
  worker qui fige un contenu périmé est pire que rien tant qu'elle tourne en local.
- **Un paquet par matière et IndexedDB** : quand une matière dépassera une cinquantaine de fichiers de chapitre, ou que
  la progression stockée approchera le quota de 5 Mo (792 questions coûtent environ 32 Ko). Les deux resteraient
  derrière `SubjectRepository` et `ProgressRepository`, rien d'autre ne bougerait.
- **Une couche de tests DOM** (`bun test` avec happy-dom et Testing Library) : quand `components/ui` gagnera une
  primitive avec une logique propre. Aujourd'hui la logique des contrôles appartient à UI SDK et est couverte de bout en
  bout.
- **L'outillage agent de UI SDK** (`createAgent`, WebMCP) et **l'internationalisation** : nommés, sans déclencheur en vue.

Délibérément absents : bibliothèque d'état, service worker, un fichier par cas d'usage, découpage en paquets.
