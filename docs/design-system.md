# Design system

Le design system est `src/components/ui` plus le thème `src/index.css`. Il ne connaît rien de l'application : les
composants des domaines et les pages placent ses composants, ils ne les stylent pas. Le lint en fait une règle (voir la
dernière section).

## Les tokens

### Où ils sont déclarés

Tout est dans `src/index.css`, le fichier que `components.json` désigne (`tailwind.css`). Il suit l'ordre de shadcn,
que `tests/unit/design-system/theme-convention.test.ts` vérifie :

1. `@layer ui-sdk;` (exigé par UI SDK, avant tout import) puis les imports : `tailwindcss`, `tw-animate-css`,
   `shadcn/tailwind.css`, les polices Roboto Flex et Roboto Mono ;
2. `@custom-variant dark (&:is(.dark *));` ;
3. `@theme inline` : chaque couleur exposée à Tailwind sous la forme `--color-<nom>: var(--<nom>)`, l'échelle de rayons,
   les polices, deux courbes d'accélération et deux animations ;
4. `:root, [data-hue]` : les valeurs du thème clair ;
5. `.dark, .dark [data-hue]` : les valeurs du thème sombre ;
6. `@layer base` : bordures et contour par défaut, gouttière de défilement, fond et police du `body`, neutralisation du
   verrouillage de Radix, curseur des boutons, mouvement réduit.

**Couleurs.** Les variables de shadcn (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`,
`accent`, `destructive`, `border`, `input`, `ring`, `chart-1` à `chart-5`, `sidebar-*`), chacune avec son `-foreground`
quand shadcn en prévoit un, et quatre ajouts : `destructive-foreground`, `tertiary` et `tertiary-foreground`, `success`
et `success-foreground`, `overlay` (fond des fenêtres modales). Les valeurs sont en `oklch`.

Les niveaux de maîtrise utilisent les tons de graphique : `chart-1` maîtrisée, `chart-2` en cours, `chart-3` à revoir,
`chart-4` jamais vue (la table est dans `domains/progress/components/mastery.tsx`).

**Teinte d'une matière.** Toutes les couleurs dérivent de `--hue`, une propriété enregistrée par `@property` (valeur
initiale 265) et animée sur `:root`. `useSeedHue` (`domains/catalog/components/hue.ts`) pose la teinte de la matière
ouverte sur `<html>`. Pour une carte qui doit garder sa propre teinte au milieu d'une autre (une carte de matière, la
bannière de reprise), `hueScope(hue)` pose `data-hue` et `--hue` sur l'élément : comme `[data-hue]` redéclare les mêmes
variables, la carte se recolore sans classe particulière.

**Panneaux teintés.** Pas de tokens de conteneur : une surface teintée est la couleur de base avec une transparence,
comme dans les composants de shadcn (`bg-primary/15`, `bg-success/15`, `bg-destructive/10`, avec une valeur un peu plus
forte en sombre).

**Rayons.** L'échelle multiplicative de shadcn sur `--radius: 1rem` (`rounded-sm` à `rounded-4xl`). Une forme de pilule
est un rayon fini plus grand que la moitié de la hauteur (`rounded-3xl` sur un bouton de 56 px), jamais `rounded-full`
sur un élément dont le rayon change d'état : on n'anime pas vers un rayon infini.

**Typographie.** L'échelle de Tailwind telle quelle (aucun `--text-*` déclaré), Roboto Flex pour le texte, Roboto Mono
pour le code ; la largeur variable de Roboto Flex se règle par `font-stretch-*`.

**Mouvement.** `ease-standard` et `ease-emphasized` (courbes de Material 3, sans dépassement), `animate-shape-morph`
(indicateur de chargement) et `animate-wave` (barre de progression ondulée). Une seule utilité propre, `mask-wave`, un
masque SVG que Tailwind ne sait pas nommer. Les ressorts de `motion` sont dans `components/ui/motion-tokens.ts`.

### Ajouter un token, à la manière de shadcn

1. Déclarer la variable et son `-foreground` dans `:root, [data-hue]` **et** dans `.dark, .dark [data-hue]`, en
   `oklch`, en partant de `var(--hue)` si elle doit suivre la teinte de la matière :

   ```css
   :root,
   [data-hue] {
     --warning: oklch(0.55 0.13 70);
     --warning-foreground: oklch(1 0 0);
   }
   ```

2. L'exposer dans `@theme inline` :

   ```css
   @theme inline {
     --color-warning: var(--warning);
     --color-warning-foreground: var(--warning-foreground);
   }
   ```

3. Ajouter son nom (et celui de son `-foreground`) à `ADDITIONS` dans
   `tests/unit/design-system/theme-convention.test.ts`.
4. Lancer `bun test tests/unit/design-system`. Le test de contraste trouve tout seul la nouvelle paire `-foreground` et
   toute transparence (`bg-warning/15`) utilisée par une variante de `components/ui`, et exige le niveau AA pour chaque teinte
   échantillonnée, en clair et en sombre.

`bg-warning`, `text-warning-foreground` et leurs variantes sont alors des classes connues ; `shadcn/no-raw-colors`
continue de refuser toute couleur qui n'est pas un token.

## Variantes et tailles

Les apparences vivent dans l'appel `cva` de chaque primitive. Un composant de domaine ou une page choisit une variante
et une taille ; il ne passe en `className` que de la mise en page (et l'espacement pour les parties prévues par les
contrats du lint).

| Composant           | Variantes                                                                     | Tailles et autres axes                                                                  |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Button`            | `default`, `secondary`, `tertiary`, `outline`, `ghost`, `destructive`, `link` | `default` (44 px), `lg` (56 px), `icon` (44 px), `tile` (navigateur d'examen)           |
| `Badge`             | `default`, `secondary`, `muted`, `success`, `destructive`, `outline`          | `default`, `lg` (minuteur)                                                              |
| `Card`              | `tone` : `default`, `popover`, `muted`, `primary`, `tertiary`, `success`      | `default`, `sm`, `lg` ; `interactive`                                                   |
| `Alert`             | `default`, `destructive`, `success`                                           |                                                                                         |
| `Item`              | `default`, `outline`, `muted`, `correct`, `wrong`, `missed`, `neutral`        | `default`, `sm`, `xs` ; `ItemMedia` : `default`, `icon`, `image`                        |
| `Choice`            | `tone` : `default`, `correct`, `wrong`, `missed`, `neutral`                   | `size` posé sur `ChoiceGroup` : `default`, `lg`                                         |
| `ChoiceMarker`      | suit le `tone` du `Choice`                                                    | forme déduite : `round` (choix unique), `square` (choix multiple), `tile` (taille `lg`) |
| `ChoiceDescription` | `display` : `visible`, `hidden` (lecteur d'écran seulement)                   |                                                                                         |
| `Progress`          | `variant` : `default`, `wavy` ; `tone` : `primary`, `success`, `destructive`  |                                                                                         |
| `ProgressRing`      |                                                                               | `default`, `lg`                                                                         |
| `StackedBar`        | `tone` des segments : `chart-1` à `chart-5`                                   | `default`, `lg`                                                                         |
| `ActionBar`         | `placement` : `sticky`, `fixed`                                               | `ActionBarPanel` : `tone` `neutral`, `success`, `destructive`                           |
| `AlertDialogAction` | les variantes de `Button`                                                     | `AlertDialogContent` : `size` `default`, `sm`                                           |
| `SheetContent`      |                                                                               | `side` : `top`, `right`, `bottom`, `left`                                               |
| `DropdownMenuItem`  | `default`, `destructive`                                                      | `inset`                                                                                 |

Une variante manque ? On l'ajoute dans le fichier du composant, pas à l'endroit où on l'utilise. Les messages du lint
listent les variantes et tailles existantes, lues dans ce fichier.

## Choisir une primitive

Une seule question : **est-ce que ça ouvre une couche ?**

| Ce que fait le composant                                                         | D'où il vient                              | Exemples ici                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| Ouvre une couche (focus piégé, défilement verrouillé, portail)                   | CLI shadcn, Radix                          | `alert-dialog`, `sheet`, `dropdown-menu`, `tooltip`                       |
| Statique, sans comportement                                                      | CLI shadcn                                 | `button`, `badge`, `card`, `alert`, `item`, `kbd`, `skeleton`, `progress` |
| Tient une valeur en place (sélection, cochage, ouverture d'un panneau sur place) | `components/ui` sur `@ui-sdk/react`        | `choice-group`, `checkbox`, `segmented-control`, `action-bar`             |
| Ni l'un ni l'autre : dessin ou mouvement                                         | `components/ui`, fichier propre avec `cva` | `progress-ring`, `stacked-bar`, `spinner`, `code`, `motion`               |

Le lint tient les deux bords : dans `components/ui`, les contrôles à valeur de Radix (`Checkbox`, `RadioGroup`,
`Select`, `Slider`, `Switch`, `Tabs`, `Toggle`, `ToggleGroup`) et les entrées « couche » de UI SDK (`alert-dialog`,
`dialog`, `drawer`, `hover-card`, `menu`, `menubar`, `popover`, `tooltip`, `trigger-menu`, `toast`) ne s'importent pas ;
hors de `components/ui`, ni Radix ni UI SDK ne s'importent.

**Ajouter une primitive shadcn.** `bunx --bun shadcn@latest add <nom>` l'installe dans `src/components/ui` avec le style
`radix-nova` et les icônes `lucide` figés dans `components.json`. Refuser l'écrasement d'un fichier déjà adapté
(`button.tsx` en premier lieu). Ensuite, les classes que l'on serait tenté de passer depuis un écran deviennent des
variantes dans le fichier, et `bun run lint` doit rester vert. La documentation d'un composant :
`bunx --bun shadcn@latest docs <nom>`.

**Écrire une primitive sur UI SDK.** Importer depuis l'entrée du composant (`@ui-sdk/react/radio`,
`@ui-sdk/react/checkbox`...), styler depuis les attributs d'état (`data-checked`, `data-disabled`, `data-readonly`,
`data-starting-style`...) et les variables CSS des parties, nommer chaque contrôle (`aria-label` ou `aria-labelledby`),
ne jamais écrire de `role=` de widget à la main.

## Rien ne bouge

Aucune interaction ne déplace un élément déjà affiché ni ne fait défiler la page : ni sélectionner, ni révéler une
réponse, ni ouvrir une boîte de dialogue, une feuille ou un menu, ni passer à la question suivante, à aucune largeur.

### Les règles

1. **Une variante d'état ne change que l'apparence.** Dans chaque `cva`, une variante qui représente un état (tonalité,
   coché, marque, sélection) peut changer les couleurs, la couleur des bordures, les ombres, l'opacité, le rayon, la
   visibilité d'une icône par opacité et échelle. Jamais la boîte : remplissage, marge, écart, taille, épaisseur de
   bordure, taille ou graisse de police, interligne, `display`. Ce qui change la boîte appartient aux variantes de
   taille, qui ne changent pas pendant une interaction.
2. **Un choix a les mêmes emplacements dans tous ses états** : repère (`ChoiceMarker`), contenu (`ChoiceContent`,
   `ChoiceLabel`) et indicateur (`ChoiceIndicator`), qui occupe toujours sa place et dont l'icône apparaît en fondu. Le
   verdict d'un choix révélé (« Votre réponse, juste », « Votre réponse, fausse », « Bonne réponse, non choisie ») passe
   par l'icône, la couleur et un `ChoiceDescription display="hidden"`, lu par les lecteurs d'écran, pas par une ligne
   visible.
3. **L'explication ne pousse ni ne fait défiler la page.** Elle s'ouvre dans l'`ActionBarPanel`, en position absolue
   au-dessus de la barre d'action, par-dessus le contenu. La barre garde une hauteur constante ; le panneau se replie
   (`ActionBarPanelTrigger`) pour revoir les derniers choix. Aucun `scrollIntoView`, aucun défilement automatique.
4. **La gouttière est stable.** `html` a `overflow-y: scroll` et `scrollbar-gutter: stable`. Radix verrouille le
   défilement d'une couche en ajoutant un remplissage à droite au `body` ; la règle `html body[data-scroll-locked]`
   remet marge et remplissage à zéro et laisse le débordement visible, avec une spécificité qui l'emporte sur la règle
   injectée.
5. **Un texte qui change de longueur ne change pas la taille de son conteneur.** Les deux versions sont empilées dans la
   même cellule de grille, l'une invisible (`col-start-1 row-start-1` et `invisible`) : « Tout sélectionner » et « Tout
   désélectionner », la description d'un mode et son message de vivier vide, le compteur du navigateur d'examen.
6. **Les fonds modaux utilisent `--overlay`**, un token, pour que `no-raw-colors` passe aussi dans `components/ui`.

Une seule exception, voulue : changer d'écran (de l'accueil à une matière, du réglage à la session, de la session aux
résultats) remonte en haut de la page à la fin de la transition (`ScreenTransition`). C'est une nouvelle page, pas une
interaction dans la page.

### Les tests qui les tiennent

- `tests/unit/design-system/layout-neutral-states.test.ts` génère chaque variante d'état de `Choice`, `ChoiceMarker`,
  `ChoiceIndicator`, `Button`, `Badge`, `Card` et `ActionBarPanel`, à chaque taille, et refuse toute classe ajoutée qui
  ne soit pas une classe d'apparence.
- `tests/unit/design-system/theme-convention.test.ts` vérifie la gouttière et la neutralisation du verrouillage.
- `tests/unit/design-system/shape.test.ts` refuse un état qui passe à un rayon infini ou en part, et toute courbe
  d'accélération qui dépasse.
- `tests/e2e/specs/stability.spec.ts` mesure, avec une vraie barre de défilement de 15 px (Chromium lancé sans
  `--hide-scrollbars`), la boîte de chaque élément `data-testid` de l'en-tête et du contenu avant et après chaque
  interaction : choisir des chapitres, un mode, un nombre ; ouvrir et fermer le menu de thème et chaque boîte de
  confirmation ; sélectionner, révéler, replier la correction, passer à la question suivante ; ouvrir le navigateur
  d'examen et changer de question. Tolérance : 0,5 px, et aucun défilement. Il tourne sur quatre projets : 390, 360,
  768 et 1400 px. Un dernier test vérifie qu'aucun écran ne déborde en largeur.

Un élément que l'on veut voir mesuré prend un `data-testid`.

## Ce que vérifie `@shadcn/lint`

Les six règles sont en erreur sur `src/**/*.{ts,tsx}`, sans liste d'exceptions ni commentaire de désactivation. Leur
configuration est dans `eslint.config.js`.

| Règle                           | Ce qu'elle refuse                                               | Réglage ici                                                                               |
| ------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `shadcn/no-restyle`             | restyler un composant par `className`                           | seule la mise en page est permise (`allow: ["layout"]`), plus trois contrats              |
| `shadcn/no-raw-colors`          | une couleur qui n'est pas un token (`bg-pink-500`, `#fff`)      | défaut                                                                                    |
| `shadcn/no-arbitrary-values`    | une valeur arbitraire (`p-[13px]`)                              | permise pour la mise en page seulement                                                    |
| `shadcn/no-inline-styles`       | un `style` en ligne                                             | défaut ; seules des propriétés personnalisées (`--progress`, `--hue`) passent par `style` |
| `shadcn/no-unknown-classes`     | une classe que Tailwind ne sait pas générer                     | défaut ; lit les tokens de `src/index.css`                                                |
| `shadcn/require-static-classes` | une classe que le linter ne peut pas lire (`` `bg-${color}` ``) | défaut                                                                                    |

Les trois contrats de `no-restyle` :

- `Card` et les parties `*Content`, `*Header`, `*Footer`, `*Group` acceptent la mise en page et l'espacement : leur
  espacement appartient à la page ;
- `Reveal` et `Stagger` (les enveloppes de mouvement) acceptent la mise en page et l'espacement ;
- `Skeleton` accepte la mise en page et le rayon : sa forme est celle de ce qu'il remplace.

Dans `src/components/ui`, `no-restyle`, `no-arbitrary-values` et `require-static-classes` sont éteintes, comme le
documente `@shadcn/lint` : c'est là que les apparences sont définies. `no-raw-colors`, `no-inline-styles` et
`no-unknown-classes` y restent actives. Les messages d'erreur sont réécrits pour pointer vers la bonne correction
(« Use a variant (...) or add one in <fichier> »), et la note commune renvoie à ce document.

Les autres contrats de `eslint.config.js` (domaines, couches, points d'entrée, bibliothèques, stockage, horloge,
rôles de widget, commentaires) sont décrits dans
[architecture.md](architecture.md#la-règle-de-dépendance-et-son-application).
