# Révision QCM

Une application de révision par QCM, qui tourne entièrement dans le navigateur. On choisit une matière, des chapitres,
un mode (entraînement corrigé, examen chronométré noté sur 20, ou ses erreurs à refaire), et la progression de chaque
question est gardée dans le `localStorage`. Une matière est un dossier de fichiers JSON dans `content/`, pas du code.

Vite, React 19, TypeScript, Tailwind v4, shadcn/ui, UI SDK et `motion`, avec Bun comme gestionnaire de paquets et
lanceur de tests.

## Lancer

```bash
bun install
bun run dev        # http://localhost:5180
```

`bun run build` produit `dist/`, `bun run preview` le sert sur le même port.

## Vérifier

```bash
bun run check
```

`check` enchaîne, et s'arrête au premier échec :

| Étape           | Commande seule          | Ce qu'elle vérifie                                                                        |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| lint            | `bun run lint`          | ESLint : frontières des domaines et des couches, règles `@shadcn/lint`, aucun commentaire |
| types           | `bun run typecheck`     | `tsc -b` en mode strict                                                                   |
| tests unitaires | `bun run test`          | `bun test` : domaines, application, stockage, contenu, design system                      |
| contenu         | `bun run content:check` | chaque matière de `content/`                                                              |
| build           | `vite build`            | le bundle de production                                                                   |
| bout en bout    | `bun run test:e2e`      | Playwright sur le build servi au port 5190, à 390, 360, 768 et 1400 px de large           |

La première fois, Playwright a besoin de son navigateur : `bunx playwright install chromium`.

Deux contrôles complètent la liste, et tournent aussi en CI : `bun run format:check` (Prettier, avec l'ordre des classes
Tailwind ; `bun run format` corrige) et `bun run knip` (fichiers, exports et dépendances inutilisés).

## Ajouter une matière

### 1. Un dossier

```
content/
  reseaux/                 le nom du dossier est l'identifiant de la matière (et son adresse : #/reseaux)
    subject.json
    ch01.json              un fichier par chapitre, nommé librement
    ch02.json
```

### 2. `subject.json`

```json
{ "title": "Réseaux", "hue": 150 }
```

`title` est obligatoire. `hue` (de 0 à 360) est la teinte d'où dérivent toutes les couleurs de la matière ; sans elle,
la teinte est calculée à partir du nom du dossier. L'application sait se passer de `subject.json` (le titre vient alors
du nom du dossier), mais `bun test` exige que chaque matière du dépôt en ait un.

### 3. Les chapitres

```json
{
  "id": "res-ch01",
  "title": "Le modèle OSI",
  "group": "Cours",
  "order": 1,
  "source": "D'où viennent les questions",
  "questions": [
    {
      "id": "res-ch01-q001",
      "type": "single",
      "prompt": "Question, avec du `code` entre accents graves",
      "code": "facultatif : un extrait sur plusieurs lignes",
      "choices": ["choix A", "choix B", "choix C", "choix D"],
      "answer": [0],
      "explanation": "Pourquoi cette réponse est la bonne.",
      "difficulty": 1
    }
  ]
}
```

- `id` d'un chapitre et `id` d'une question sont uniques dans toute la matière.
- `group` est la section où le chapitre apparaît. `order` est unique dans la matière ; les chapitres suivent cet ordre,
  et les sections suivent le plus petit `order` de leurs chapitres.
- `type` vaut `single` (exactement une bonne réponse) ou `multi` (au moins deux).
- `choices` contient de 3 à 5 choix, tous différents. `answer` liste les positions des bonnes réponses, à partir de 0,
  dans l'ordre où les choix sont écrits.
- L'application mélange les choix : aucun choix ne doit renvoyer à un autre ni à sa position (« les deux précédentes »).
- `difficulty` vaut 1 (facile), 2 (moyenne) ou 3 (difficile).
- Le texte entre accents graves devient du code ; un accent grave non refermé est une erreur.
- Corriger une question (énoncé, code, choix ou réponse) remet sa progression à « jamais vue ».

### 4. Validation pendant la saisie

`tools/content/schemas/chapter.schema.json` et `tools/content/schemas/subject.schema.json` sont générés depuis les
schémas zod de `src/domains/catalog/infrastructure/wire.ts`. `.vscode/settings.json` les associe aux fichiers de
`content/` : VS Code complète les champs et souligne les erreurs de forme pendant la saisie, sans rien ajouter aux
fichiers de contenu. Après une modification de `wire.ts`, `bun run content:schema` les régénère ; un test échoue s'ils
sont périmés.

### 5. Contrôle

```bash
bun run content:check
```

```
1 matière, 24 chapitres, 892 questions : aucun problème
```

Chaque problème s'affiche avec son fichier (par exemple `content/reseaux/ch01.json : res-ch01-q001 : la réponse 4 ne
désigne aucun des 4 choix`) et la commande sort en erreur. Les mêmes règles s'appliquent dans l'application, qui affiche
la liste au lieu de la matière, et dans `bun test`. Rechargez ensuite la page : la matière apparaît sur l'accueil.

## Où sont les choses

```
content/             les matières (données)
docs/                l'architecture et ses règles
public/              l'icône de l'application
src/
  main.tsx           la racine de composition : adaptateurs du navigateur, application, thème
  index.css          le thème
  app/               ce qui relie les domaines : la façade Application, son fournisseur React, l'aiguillage
  domains/           le métier, un dossier par domaine
    catalog/         matières, chapitres, questions ; lecture des fichiers de content/
    progress/        maîtrise de chaque question ; barre et légende de maîtrise
    session/         tirage, déroulé, correction ; parties du réglage, de la session et des résultats
    preferences/     thème et dernier réglage ; menu de thème
  pages/             un fichier par écran : accueil, réglage, session, résultats
  components/ui/     le design system (shadcn, UI SDK, primitives propres)
  components/layout/ la coquille de l'application, l'erreur, le chargement
  shared/            ce que plusieurs domaines utilisent sans le posséder : stockage, horloge, formats, confirmation
  lib/               cn et le typage des variables CSS
tests/
  unit/              bun test, rangés comme src/ (domains/, shared/, app/), plus design-system/, content/, project/
  e2e/               Playwright sur le build
tools/
  content/           content:check et content:schema, et les JSON Schemas générés pour l'éditeur (schemas/)
```

Playwright range ses traces dans `.playwright/`, ignoré par git, comme `dist/` et `node_modules/`.

Dans un domaine, chaque couche a son dossier : `domain/` (le modèle, en TypeScript pur, et ses ports), `application/`
(les cas d'usage et ce que React peut lire), `infrastructure/` (les adaptateurs : fichiers, `localStorage`) et
`components/` (React). Un domaine n'a que les couches dont il a besoin, et on l'importe par l'entrée d'une couche
(`@/domains/session/application`), jamais par un chemin interne.

## Documentation

- [docs/architecture.md](docs/architecture.md) : le problème, la structure par domaine, les quatre domaines, la règle de
  dépendance, les décisions et leurs raisons, ce qui est différé.
- [docs/module-map.md](docs/module-map.md) : chaque fichier, son rôle, qui écrit quoi.
- [docs/design-system.md](docs/design-system.md) : tokens, variantes, choix d'une primitive, « rien ne bouge », règles de
  lint.
- [docs/ubiquitous-language.md](docs/ubiquitous-language.md) : le vocabulaire du métier en français et en code.
- [AGENTS.md](AGENTS.md) : les consignes pour un agent de code.
