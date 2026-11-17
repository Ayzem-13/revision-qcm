# Langage omniprésent

L'interface est en français, le code en anglais. Ce glossaire fait le lien : chaque terme du métier, l'identifiant qui
le porte dans le code, le domaine où il vit, et son sens. Les domaines sont les dossiers de `src/domains` (`catalog`,
`progress`, `session`, `preferences`), plus `app` (ce qui les relie) et `shared` (ce que plusieurs domaines utilisent
sans le posséder). Les champs des fichiers de contenu sont en `code` quand ils diffèrent de l'identifiant.

## Catalogue (`src/domains/catalog`)

| Terme                 | Identifiant                                                          | Domaine | Sens                                                                        |
| --------------------- | -------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| matière               | `Subject`, `SubjectId`                                               | catalog | l'agrégat : un dossier de `content/`, ses sections, chapitres et questions  |
| résumé de matière     | `SubjectSummary`                                                     | catalog | titre, teinte et nombre de chapitres, connus sans charger les questions     |
| manifeste             | `SubjectManifest` (fichier `subject.json`)                           | catalog | titre et teinte facultatifs d'une matière                                   |
| teinte                | `hue`                                                                | catalog | angle de 0 à 360 d'où dérivent les couleurs de la matière                   |
| section               | `Section` (champ `group`)                                            | catalog | groupe de chapitres, ordonné par le plus petit `order` de ses chapitres     |
| chapitre              | `Chapter`, `ChapterId`                                               | catalog | un fichier de contenu : titre, source, questions                            |
| brouillon de chapitre | `ChapterDraft`, `QuestionDraft`                                      | catalog | un chapitre lu et validé dans sa forme, pas encore vérifié avec ses voisins |
| question              | `Question`, `QuestionId`                                             | catalog | énoncé, code facultatif, choix, corrigé, explication, difficulté            |
| type de question      | `kind` : `single`, `multi` (champ `type`)                            | catalog | une seule bonne réponse, ou au moins deux                                   |
| énoncé                | `prompt`                                                             | catalog | le texte de la question                                                     |
| extrait de code       | `code`                                                               | catalog | un bloc de code sur plusieurs lignes affiché sous l'énoncé                  |
| choix                 | `Choice`, `ChoiceId`                                                 | catalog | une réponse proposée, identifiée par sa position dans le fichier            |
| corrigé               | `AnswerKey`, `Question.answer` (champ `answer`, brouillon `correct`) | catalog | l'ensemble des choix justes                                                 |
| explication           | `explanation`                                                        | catalog | pourquoi la bonne réponse est la bonne                                      |
| difficulté            | `Difficulty` : 1, 2, 3                                               | catalog | Facile, Moyenne, Difficile                                                  |
| texte enrichi         | `RichText`, `Span` (`text`, `code`), `toRichText`                    | catalog | du texte où les passages entre accents graves sont du code                  |
| révision              | `Revision`                                                           | catalog | empreinte d'une question ; elle change quand on corrige la question         |
| problème de contenu   | `ContentIssue`                                                       | catalog | un fichier et un message en français                                        |
| matière invalide      | `InvalidSubject`                                                     | catalog | l'erreur qui porte tous les problèmes d'une matière                         |
| assemblage            | `assembleSubject`, `inspectDrafts`, `summarise`                      | catalog | vérifier les brouillons ensemble, puis construire la matière                |

## Progression (`src/domains/progress`)

| Terme                      | Identifiant                                                           | Domaine  | Sens                                                                                                   |
| -------------------------- | --------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| progression                | `Progress`                                                            | progress | les statistiques de chaque question d'une matière                                                      |
| statistique d'une question | `QuestionStat`                                                        | progress | vue (`seen`), série (`streak`), dernier résultat (`lastCorrect`), date, révision                       |
| série                      | `streak`                                                              | progress | nombre de bonnes réponses consécutives                                                                 |
| maîtrise                   | `Mastery`                                                             | progress | `new` jamais vue, `missed` à revoir, `learning` en cours, `mastered` maîtrisée (série d'au moins deux) |
| décompte de maîtrise       | `MasteryCounts`, `masteryIn`                                          | progress | combien de questions à chaque niveau                                                                   |
| verdict                    | `Verdict`                                                             | progress | une réponse jugée juste ou fausse, à une date, pour une révision                                       |
| enregistrer                | `record`                                                              | progress | appliquer des verdicts à la progression                                                                |
| progression courante       | `currentFor`                                                          | progress | la progression sans les statistiques de questions modifiées depuis                                     |
| vue d'ensemble             | `SubjectOverview`, `SectionOverview`, `ChapterOverview`, `overviewOf` | progress | la matière avec ses décomptes de maîtrise par chapitre, par section et en tout                         |
| réinitialiser              | `resetProgress`                                                       | session  | toutes les questions de la matière redeviennent « jamais vues »                                        |

## Session (`src/domains/session`)

| Terme               | Identifiant                                              | Domaine | Sens                                                                                                                   |
| ------------------- | -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| mode                | `Mode` : `training`, `exam`, `redo`                      | session | Entraînement, Examen, Refaire mes erreurs                                                                              |
| politique d'un mode | `ModePolicy`, `MODES`                                    | session | correction `immediate` ou `deferred`, vivier `all` ou `mistakes`, navigation `linear` ou `free`, secondes par question |
| réglages de session | `SessionSetup`                                           | session | chapitres choisis, nombre de questions, mode                                                                           |
| demande de session  | `SessionRequest`                                         | session | les réglages et la matière                                                                                             |
| vivier              | `drawPool`, `PoolSizes`                                  | session | les questions éligibles d'un mode dans les chapitres choisis                                                           |
| poids du tirage     | `DRAW_WEIGHT`, `weightOf`                                | session | ratée 6, nouvelle 4, en cours 2, maîtrisée 1 à 2 selon son ancienneté                                                  |
| tirage              | `SessionPlan`, `planSession`                             | session | les questions retenues, l'ordre de leurs choix, le début et l'échéance                                                 |
| session             | `Session`, `begin`                                       | session | l'agrégat : le tirage, la sélection de chaque question, la question courante, l'étape                                  |
| étape               | `stage` : `answering`, `revealed`, `finished`            | session | en train de répondre, correction affichée, terminée                                                                    |
| fin                 | `Ending` : `completed`, `timeout`                        | session | terminée par l'utilisateur, ou temps écoulé                                                                            |
| sélection           | `Selection`                                              | session | les choix cochés pour une question                                                                                     |
| commande            | `SessionCommand` : `toggle`, `confirm`, `goTo`, `expire` | session | cocher un choix, valider, aller à une question, constater l'échéance                                                   |
| événement           | `SessionEvent` : `answer-judged`, `session-finished`     | session | une réponse a été jugée ; la session est finie                                                                         |
| action principale   | `PrimaryAction` : `reveal`, `next`, `finish`             | session | Valider ; Continuer ou Suivante ; Voir les résultats ou Terminer l'examen                                              |
| correction          | `isCorrect`                                              | session | une sélection est juste si elle égale exactement le corrigé                                                            |
| correction affichée | `feedback` de `QuestionView`                             | session | juste ou faux, et l'explication, en correction immédiate seulement                                                     |
| marque d'un choix   | `ChoiceMark` : `correct`, `wrong`, `missed`, `neutral`   | session | votre réponse juste, votre réponse fausse, bonne réponse non choisie, sans objet                                       |
| vue d'une question  | `QuestionView`, `ChoiceView`                             | session | ce que l'écran affiche, sans corrigé tant que le mode ne le révèle pas                                                 |
| résultats           | `ResultsView`, `markOutOf20`                             | session | score, note sur 20, durée, scores par chapitre, questions revues                                                       |
| score par chapitre  | `ChapterScore`                                           | session | bonnes réponses sur le total d'un chapitre                                                                             |
| question revue      | `ReviewedQuestion` : `correct`, `wrong`, `unanswered`    | session | une question de la session avec son issue et la marque de chaque choix                                                 |
| erreurs             | `mistakes` de `ResultsView`                              | session | les questions revues qui ne sont pas justes                                                                            |
| instantané          | `SessionSnapshot`, `snapshotOf`, `restore`               | session | la forme stockée d'une session, et son retour à l'agrégat                                                              |
| session en cours    | `OngoingSession`, `ongoingSubjectId`                     | session | la matière de la session stockée, si elle n'est pas terminée                                                           |

## Préférences (`src/domains/preferences`)

| Terme            | Identifiant                                       | Domaine     | Sens                                                                      |
| ---------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| préférences      | `Preferences` : `theme`, `lastCount`, `lastMode`  | preferences | thème choisi, derniers nombre et mode utilisés                            |
| thème            | `ThemePreference` : `system`, `light`, `dark`     | preferences | Système, Clair, Sombre                                                    |
| choisir le thème | `chooseTheme`, `PreferencesSource`                | preferences | ce que le menu de thème lit et appelle                                    |
| dernier réglage  | `rememberSetup` ; port `SetupMemory` de `session` | preferences | le nombre et le mode d'une session qui démarre, repris au réglage suivant |

## Application et éléments partagés (`src/app`, `src/shared`)

| Terme                      | Identifiant                                                           | Domaine | Sens                                                                                   |
| -------------------------- | --------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| application                | `Application`, `createApplication`                                    | app     | les matières, l'étude de chacune, la session en cours, les préférences                 |
| étude d'une matière        | `Study`, `StudyState`, `studyOf`                                      | session | ce qu'un écran lit et les actions qu'il déclenche, pour une matière                    |
| démarrer, rejouer, quitter | `start`, `replay`, `quit`                                             | session | nouvelle session ; même réglage, autre tirage ; abandon                                |
| ports                      | `Ports` (app), `SessionPorts` (session), `Clock` et `Random` (shared) | app     | ce que l'application attend du monde : dépôts, magasin de préférences, horloge, graine |
| valeur lisible             | `Readable`, `useReadable`                                             | shared  | une valeur et son abonnement, lus par React avec `useSyncExternalStore`                |
| magasin versionné          | `VersionedStore`, `StoreDefinition`                                   | shared  | une clé du `localStorage` avec version, migrations et repli                            |
| hôte de stockage           | `StorageHost`, `browserStorage`                                       | shared  | lire, écrire et surveiller une clé                                                     |
