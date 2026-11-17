import { readdirSync } from "node:fs";
import { plugin as shadcn } from "@shadcn/lint";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const CODE = ["**/*.{ts,tsx}"];
const UI = ["src/components/ui/**"];

const DOMAINS_DIR = "src/domains";
const LAYERS = ["domain", "application", "infrastructure", "components"];
const SHARED_KINDS = ["application", "infrastructure", "components"];
const DIRECT_UPSTREAM = {
  progress: ["catalog"],
  session: ["progress"],
  preferences: ["session"],
};

const DOMAINS = readdirSync(DOMAINS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const [domain, upstream] of Object.entries(DIRECT_UPSTREAM)) {
  for (const name of [domain, ...upstream]) {
    if (!DOMAINS.includes(name))
      throw new Error(`DIRECT_UPSTREAM names ${name}, which is not a folder of ${DOMAINS_DIR}.`);
  }
}

function upstreamOf(domain, path = []) {
  if (path.includes(domain)) throw new Error(`Domain cycle: ${[...path, domain].join(" -> ")}.`);
  const direct = DIRECT_UPSTREAM[domain] ?? [];
  return [...new Set(direct.flatMap((name) => [name, ...upstreamOf(name, [...path, domain])]))];
}

const UPSTREAM = Object.fromEntries(DOMAINS.map((domain) => [domain, upstreamOf(domain)]));

const packages = {
  react: ["react", "react-dom"],
  behaviour: ["radix-ui", "@radix-ui", "@ui-sdk"],
  motion: ["motion"],
  schema: ["zod"],
  variants: ["class-variance-authority"],
  icons: ["lucide-react"],
};

function forbid(group, message) {
  return { group, message };
}

function forbidPackages(names, message) {
  return { regex: `^(${names.join("|")})(/|$)`, message };
}

function entry(domain, layer) {
  return `domains/${domain}/${layer}`;
}

function only(allowed, unit) {
  const entries = allowed.map(({ path }) => path);
  const listed = allowed.map(({ label }) => label).join(", ") || "nothing";
  return {
    regex: `^@/(?!(?:${entries.join("|")})(?:/.*)?$)`,
    message: `${unit} may import from @/ only: ${listed}.`,
  };
}

function exact(path) {
  return { path, label: `@/${path}` };
}

function anyFile(folder) {
  return { path: `${folder}/[^/]+`, label: `@/${folder}/*` };
}

function anyDomain(layer) {
  return { path: `domains/[^/]+/${layer}`, label: `@/domains/<domain>/${layer}` };
}

const deep = {
  regex: "^@/(?:domains/[^/]+/[^/]+|shared/[^/]+)/",
  message:
    "Import a domain layer or a shared kind through its entry point: @/domains/<domain>/<layer>, @/shared/<kind>.",
};

const outward = {
  regex: "^(?!\\.\\./(?!.*\\.\\.(?:/|$))).*\\.\\.(?:/|$)",
  message: "A relative import stays inside its layer folder. Leave a folder through an @/ entry point.",
};

const upward = {
  regex: "\\.\\.(?:/|$)",
  message: "A relative import stays inside its folder. Leave a folder through an @/ entry point.",
};

function imports(files, patterns, paths = []) {
  return {
    files,
    rules: { "no-restricted-imports": ["error", { paths, patterns: [deep, ...patterns] }] },
  };
}

const rendering = [
  ...packages.react,
  ...packages.behaviour,
  ...packages.motion,
  ...packages.variants,
  ...packages.icons,
];
const noSchema = forbidPackages(
  packages.schema,
  "Schemas of files and stored data belong to an infrastructure folder.",
);
const pureOnly = [forbidPackages(rendering, "This layer is plain TypeScript."), noSchema];
const noRendering = forbidPackages(rendering, "Adapters render nothing.");
const viaDesignSystem = forbidPackages(
  [...packages.behaviour, ...packages.motion, ...packages.variants],
  "Behaviour, motion and variants live in src/components/ui.",
);

const designSystem = [anyFile("components/ui"), anyFile("lib")];
const sharedPure = exact("shared/application");
const sharedReact = exact("shared/components");

function layerRules(domain, layer) {
  const upstream = UPSTREAM[domain];
  const unit = `src/domains/${domain}/${layer}`;
  const own = (name) => exact(entry(domain, name));
  const each = (name) => upstream.map((other) => exact(entry(other, name)));
  switch (layer) {
    case "domain":
      return [...pureOnly, only(each("domain"), unit)];
    case "application":
      return [...pureOnly, only([own("domain"), ...each("domain"), sharedPure], unit)];
    case "infrastructure":
      return [
        noRendering,
        only([own("domain"), own("application"), ...each("domain"), sharedPure, exact("shared/infrastructure")], unit),
      ];
    case "components":
      return [
        noSchema,
        viaDesignSystem,
        only(
          [own("application"), ...each("application"), ...each("components"), sharedPure, sharedReact, ...designSystem],
          unit,
        ),
      ];
  }
}

const domainImports = DOMAINS.flatMap((domain) =>
  LAYERS.flatMap((layer) => {
    const folder = `${DOMAINS_DIR}/${domain}/${layer}`;
    const rules = layerRules(domain, layer);
    return [imports([`${folder}/*`], [...rules, upward]), imports([`${folder}/*/**`], [...rules, outward])];
  }),
);

const sharedRules = {
  application: [...pureOnly, only([], "src/shared/application")],
  infrastructure: [noRendering, only([sharedPure], "src/shared/infrastructure")],
  components: [noSchema, viaDesignSystem, only([sharedPure, ...designSystem], "src/shared/components")],
};

const surfaces = [anyDomain("application"), anyDomain("components"), sharedPure, sharedReact, ...designSystem];

const valueControlsFromRadix = {
  name: "radix-ui",
  importNames: ["Checkbox", "RadioGroup", "Select", "Slider", "Switch", "Tabs", "Toggle", "ToggleGroup"],
  message: "A control that holds a value in place is built on @ui-sdk/react. Radix is for what opens a layer.",
};

const layersFromUiSdk = forbid(
  [
    "alert-dialog",
    "dialog",
    "drawer",
    "hover-card",
    "menu",
    "menubar",
    "popover",
    "tooltip",
    "trigger-menu",
    "toast",
  ].map((entry) => `@ui-sdk/react/${entry}`),
  "What opens a layer comes from the shadcn CLI (bunx shadcn add). @ui-sdk/react is for controls that hold a value in place.",
);

const storage = ["localStorage", "sessionStorage", "indexedDB"];
const storageProperties = ["window", "globalThis", "self"].flatMap((object) =>
  storage.map((property) => ({ object, property, message: "Browser storage belongs to src/shared/infrastructure." })),
);
const ambient = [
  { object: "Date", property: "now", message: "Use the Clock port (application) or a `now` parameter (domain)." },
  { object: "Math", property: "random", message: "Use the Random port (application) or an Rng parameter (domain)." },
];

const widgetRole =
  "JSXAttribute[name.name='role'][value.value=/^(radio|radiogroup|checkbox|group|listbox|option|menu|menuitem|dialog|alertdialog|tab|tablist|switch|slider|progressbar|separator|toolbar|tree)$/]";

const noComments = {
  meta: {
    type: "problem",
    schema: [],
    messages: { comment: "No comments: put the invariant in a type, a name, a table or a test." },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, messageId: "comment" });
        }
      },
    };
  },
};

export default defineConfig([
  { ignores: ["dist/**", "node_modules/**", "coverage/**", ".playwright/**"] },

  ...tseslint.configs.recommended,
  { ...reactHooks.configs.flat.recommended, files: CODE },

  {
    files: CODE,
    rules: {
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/domains/catalog/domain/ids.ts", ...UI],
    rules: { "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as" }] },
  },

  imports(["src/**"], [only([], "A folder outside the architecture of docs/architecture.md"), upward]),
  ...domainImports,
  ...SHARED_KINDS.map((kind) => imports([`src/shared/${kind}/**`], [...sharedRules[kind], upward])),
  imports(
    ["src/pages/**"],
    [
      noSchema,
      viaDesignSystem,
      only([...surfaces, exact("app/provider"), exact("app/route")], "src/pages"),
      { regex: "^\\.", message: "A page does not import another page. Share through a domain's components." },
    ],
  ),
  imports(["src/components/layout/**"], [noSchema, viaDesignSystem, only(surfaces, "src/components/layout"), upward]),
  imports(
    ["src/app/**"],
    [noSchema, viaDesignSystem, only([...surfaces, anyFile("pages"), anyFile("components/layout")], "src/app"), upward],
  ),
  imports(UI, [noSchema, layersFromUiSdk, only(designSystem, "src/components/ui"), upward], [valueControlsFromRadix]),
  imports(["src/lib/**"], [only([], "src/lib"), upward]),
  imports(["src/main.tsx"], [upward]),

  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/shared/infrastructure/**"],
    rules: {
      "no-restricted-globals": ["error", ...storage],
      "no-restricted-properties": ["error", ...storageProperties],
    },
  },
  {
    files: ["src/domains/*/domain/**", "src/domains/*/application/**", "src/shared/application/**"],
    rules: { "no-restricted-properties": ["error", ...storageProperties, ...ambient] },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: UI,
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: widgetRole, message: "A widget role belongs to a control in src/components/ui." },
        {
          selector: "JSXAttribute[name.name='onKeyDown']",
          message: "Keyboard behaviour belongs to a control in src/components/ui.",
        },
      ],
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { shadcn },
    settings: {
      shadcn: {
        note: "Looks are cva variants in src/components/ui and tokens in src/index.css. See docs/design-system.md.",
      },
    },
    rules: {
      "shadcn/no-restyle": [
        "error",
        {
          allow: ["layout"],
          contracts: [
            { pattern: "^Card$|(Content|Header|Footer|Group)$", allow: ["layout", "spacing"] },
            { pattern: "^(Reveal|Stagger)$", allow: ["layout", "spacing"] },
            { pattern: "^Skeleton$", allow: ["layout", "rounded"] },
          ],
          message: {
            spacing: "{{component}} owns its spacing. Use a size ({{sizes|none defined}}) or add one in {{file}}.",
            default: "{{component}} owns its look. Use a variant ({{variants|none defined}}) or add one in {{file}}.",
          },
        },
      ],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
      "shadcn/no-inline-styles": "error",
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
    },
  },
  {
    files: UI,
    rules: {
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off",
      "shadcn/require-static-classes": "off",
    },
  },

  { plugins: { local: { rules: { "no-comments": noComments } } } },
  {
    files: ["**/*.{js,ts,tsx}"],
    rules: { "local/no-comments": "error" },
  },
]);
