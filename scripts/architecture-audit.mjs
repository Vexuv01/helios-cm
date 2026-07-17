import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const OUTPUT = path.join(
  ROOT,
  "docs",
  "architecture",
  "ARCHITECTURE_AUDIT.md"
);

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const STYLE_EXTENSIONS = new Set([".css"]);
const HEAVY_PACKAGES = [
  "xlsx",
  "pptxgenjs",
  "recharts",
  "@supabase/supabase-js",
];

const TARGET_FILES = [
  "src/pages/project-workspace/ConstructionWorkspace.jsx",
  "src/pages/project-workspace/ProjectWeekly.jsx",
  "src/pages/project-workspace/ProjectForecast.jsx",
  "src/pages/project-workspace/ProjectDashboard.jsx",
  "src/pages/Portfolio.jsx",
  "src/services/constructionEngine.service.js",
  "src/domain/reporting/executiveReportEngine.js",
  "src/features/reports/services/executiveReportService.js",
  "src/features/reports/services/executiveNotesService.js",
  "src/features/reports/renderers/weeklyManagementPptRenderer.js",
  "src/features/weekly/excel/weeklyExcelService.js",
  "src/features/forecast/excel/recoveryExcelService.js",
  "src/features/forecast/services/recoveryForecastService.js",
  "src/styles/construction-workspace.css",
  "src/styles/dashboard.css",
  "src/styles/forecast.css",
  "src/styles/executive-notes.css",
  "src/styles/portfolio.css",
];

const DUPLICATION_PATTERNS = [
  {
    label: "Supabase query",
    regex: /\.from\s*\(/g,
  },
  {
    label: "Promise.all",
    regex: /Promise\.all\s*\(/g,
  },
  {
    label: "Loading state",
    regex: /setLoading\s*\(/g,
  },
  {
    label: "Error state",
    regex: /setError\s*\(/g,
  },
  {
    label: "Alert gestione errori",
    regex: /window\.alert\s*\(/g,
  },
  {
    label: "Number normalization",
    regex: /Number\s*\(|parseFloat\s*\(|parseInt\s*\(/g,
  },
  {
    label: "Date construction",
    regex: /new Date\s*\(/g,
  },
  {
    label: "Locale date formatting",
    regex: /toLocaleDateString\s*\(/g,
  },
  {
    label: "Weekly status literals",
    regex: /\b(DRAFT|SUBMITTED|VALIDATED|APPROVED|LOCKED)\b/g,
  },
  {
    label: "Activity mapping",
    regex: /\.map\s*\(\s*\(?\s*(activity|item|row|entry)/g,
  },
  {
    label: "XLSX utilities",
    regex: /utils\.(json_to_sheet|aoa_to_sheet|sheet_to_json|book_new|book_append_sheet)/g,
  },
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git"
    ) {
      return [];
    }

    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/");
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function countMatches(content, regex) {
  return [...content.matchAll(regex)].length;
}

function extractImports(content) {
  const imports = [];

  const staticImportRegex =
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const regex of [
    staticImportRegex,
    dynamicImportRegex,
    requireRegex,
  ]) {
    for (const match of content.matchAll(regex)) {
      imports.push(match[1]);
    }
  }

  return [...new Set(imports)];
}

function resolveLocalImport(importer, importPath) {
  if (!importPath.startsWith(".")) return null;

  const basePath = path.resolve(path.dirname(importer), importPath);
  const candidates = [
    basePath,
    ...[...SOURCE_EXTENSIONS, ...STYLE_EXTENSIONS].map(
      (extension) => `${basePath}${extension}`
    ),
    ...[...SOURCE_EXTENSIONS, ...STYLE_EXTENSIONS].map((extension) =>
      path.join(basePath, `index${extension}`)
    ),
  ];

  const found = candidates.find(
    (candidate) =>
      fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  );

  return found ? relative(found) : null;
}

function markdownTable(headers, rows) {
  if (!rows.length) return "_Nessun dato rilevato._\n";

  const header = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (row) =>
        `| ${row
          .map((value) => String(value).replaceAll("|", "\\|"))
          .join(" | ")} |`
    )
    .join("\n");

  return `${header}\n${separator}\n${body}\n`;
}

const allFiles = walk(SRC);
const sourceFiles = allFiles.filter((file) =>
  SOURCE_EXTENSIONS.has(path.extname(file))
);
const styleFiles = allFiles.filter((file) =>
  STYLE_EXTENSIONS.has(path.extname(file))
);

const sourceRecords = sourceFiles.map((filePath) => {
  const content = read(filePath);
  const imports = extractImports(content);

  return {
    filePath,
    relativePath: relative(filePath),
    content,
    lines: countLines(content),
    imports,
    localImports: imports
      .map((importPath) => resolveLocalImport(filePath, importPath))
      .filter(Boolean),
    externalImports: imports.filter(
      (importPath) => !importPath.startsWith(".")
    ),
  };
});

const styleRecords = styleFiles.map((filePath) => {
  const content = read(filePath);

  return {
    filePath,
    relativePath: relative(filePath),
    content,
    lines: countLines(content),
  };
});

const targetRows = TARGET_FILES.map((target) => {
  const absolutePath = path.join(ROOT, target);

  if (!fs.existsSync(absolutePath)) {
    return [target, "MANCANTE", "-", "-"];
  }

  const content = read(absolutePath);
  const imports = extractImports(content);

  return [
    target,
    countLines(content),
    imports.length,
    Buffer.byteLength(content, "utf8"),
  ];
});

const largestSourceRows = [...sourceRecords]
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 30)
  .map((record) => [
    record.relativePath,
    record.lines,
    record.imports.length,
    Buffer.byteLength(record.content, "utf8"),
  ]);

const largestCssRows = [...styleRecords]
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 20)
  .map((record) => [
    record.relativePath,
    record.lines,
    Buffer.byteLength(record.content, "utf8"),
  ]);

const heavyImportRows = [];

for (const record of sourceRecords) {
  for (const heavyPackage of HEAVY_PACKAGES) {
    const matches = record.imports.filter(
      (importPath) =>
        importPath === heavyPackage ||
        importPath.startsWith(`${heavyPackage}/`)
    );

    for (const matchedImport of matches) {
      const isDynamic = record.content.includes(
        `import("${matchedImport}")`
      ) || record.content.includes(`import('${matchedImport}')`);

      heavyImportRows.push([
        record.relativePath,
        matchedImport,
        isDynamic ? "dinamico" : "statico",
      ]);
    }
  }
}

const inboundDependencies = new Map();

for (const record of sourceRecords) {
  for (const importedFile of record.localImports) {
    if (!inboundDependencies.has(importedFile)) {
      inboundDependencies.set(importedFile, []);
    }

    inboundDependencies.get(importedFile).push(record.relativePath);
  }
}

const mostImportedRows = [...inboundDependencies.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 30)
  .map(([file, importers]) => [
    file,
    importers.length,
    importers.slice(0, 6).join("<br>"),
  ]);

const targetDependencyRows = sourceRecords
  .filter((record) => TARGET_FILES.includes(record.relativePath))
  .flatMap((record) =>
    record.imports.map((importPath) => [
      record.relativePath,
      importPath,
      importPath.startsWith(".") ? "locale" : "package",
    ])
  );

const duplicationRows = DUPLICATION_PATTERNS.map(({ label, regex }) => {
  const occurrences = sourceRecords
    .map((record) => ({
      file: record.relativePath,
      count: countMatches(record.content, regex),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return [
    label,
    occurrences.reduce((total, item) => total + item.count, 0),
    occurrences
      .slice(0, 8)
      .map((item) => `${item.file} (${item.count})`)
      .join("<br>"),
  ];
});

const directSupabaseRows = sourceRecords
  .filter(
    (record) =>
      record.content.includes(".from(") ||
      record.content.includes("supabase.")
  )
  .map((record) => [
    record.relativePath,
    countMatches(record.content, /\.from\s*\(/g),
    record.relativePath.includes("/repositories/")
      ? "repository"
      : record.relativePath.includes("/services/")
        ? "service"
        : record.relativePath.includes("/pages/")
          ? "page"
          : "altro",
  ])
  .sort((a, b) => Number(b[1]) - Number(a[1]));

const reactRiskRows = sourceRecords
  .filter(
    (record) =>
      record.relativePath.endsWith(".jsx") ||
      record.relativePath.endsWith(".tsx")
  )
  .map((record) => {
    const useStateCount = countMatches(record.content, /\buseState\s*\(/g);
    const useEffectCount = countMatches(record.content, /\buseEffect\s*\(/g);
    const useCallbackCount = countMatches(
      record.content,
      /\buseCallback\s*\(/g
    );
    const handlerCount = countMatches(
      record.content,
      /\b(?:function|const)\s+handle[A-Z]\w*/g
    );

    return {
      file: record.relativePath,
      lines: record.lines,
      useStateCount,
      useEffectCount,
      useCallbackCount,
      handlerCount,
      score:
        record.lines +
        useStateCount * 20 +
        useEffectCount * 30 +
        useCallbackCount * 10 +
        handlerCount * 10,
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 25)
  .map((record) => [
    record.file,
    record.lines,
    record.useStateCount,
    record.useEffectCount,
    record.useCallbackCount,
    record.handlerCount,
    record.score,
  ]);

const cssSelectorMap = new Map();

for (const record of styleRecords) {
  const selectorRegex = /(?:^|\})\s*([^@}{][^{]+)\s*\{/gm;

  for (const match of record.content.matchAll(selectorRegex)) {
    const selectorGroup = match[1]
      .trim()
      .replace(/\s+/g, " ");

    for (const selector of selectorGroup.split(",")) {
      const normalizedSelector = selector.trim();

      if (
        !normalizedSelector ||
        normalizedSelector.startsWith("from ") ||
        normalizedSelector.startsWith("to ") ||
        /^\d+%$/.test(normalizedSelector)
      ) {
        continue;
      }

      if (!cssSelectorMap.has(normalizedSelector)) {
        cssSelectorMap.set(normalizedSelector, new Set());
      }

      cssSelectorMap.get(normalizedSelector).add(record.relativePath);
    }
  }
}

const duplicatedCssRows = [...cssSelectorMap.entries()]
  .filter(([, files]) => files.size > 1)
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 50)
  .map(([selector, files]) => [
    selector,
    files.size,
    [...files].join("<br>"),
  ]);

const summary = {
  sourceFiles: sourceRecords.length,
  styleFiles: styleRecords.length,
  sourceLines: sourceRecords.reduce(
    (total, record) => total + record.lines,
    0
  ),
  styleLines: styleRecords.reduce(
    (total, record) => total + record.lines,
    0
  ),
  staticHeavyImports: heavyImportRows.filter(
    (row) => row[2] === "statico"
  ).length,
  directSupabaseFiles: directSupabaseRows.length,
  duplicatedCssSelectors: duplicatedCssRows.length,
};

const report = `# HELIOS CM Enterprise — Architecture Audit

_Generato automaticamente il ${new Date().toISOString()}._

## 1. Riepilogo quantitativo

${markdownTable(
  ["Metrica", "Valore"],
  [
    ["File sorgente JS/JSX/TS/TSX", summary.sourceFiles],
    ["File CSS", summary.styleFiles],
    ["Righe sorgente complessive", summary.sourceLines],
    ["Righe CSS complessive", summary.styleLines],
    ["Import pesanti statici", summary.staticHeavyImports],
    ["File con accesso diretto Supabase", summary.directSupabaseFiles],
    [
      "Selettori CSS duplicati tra file",
      summary.duplicatedCssSelectors,
    ],
  ]
)}

## 2. File prioritari

${markdownTable(
  ["File", "Righe", "Import", "Byte"],
  targetRows
)}

## 3. File sorgente più grandi

${markdownTable(
  ["File", "Righe", "Import", "Byte"],
  largestSourceRows
)}

## 4. Componenti React con maggiore complessità indicativa

Lo score è solamente diagnostico: righe + peso di state, effect, callback e handler.

${markdownTable(
  [
    "File",
    "Righe",
    "useState",
    "useEffect",
    "useCallback",
    "Handler",
    "Score",
  ],
  reactRiskRows
)}

## 5. Import pesanti

${markdownTable(
  ["File", "Package", "Tipo import"],
  heavyImportRows
)}

## 6. Dipendenze dei file prioritari

${markdownTable(
  ["File", "Dipendenza", "Tipo"],
  targetDependencyRows
)}

## 7. Moduli locali più importati

${markdownTable(
  ["Modulo", "Importazioni", "Importato da"],
  mostImportedRows
)}

## 8. Accessi Supabase rilevati

Gli accessi presenti direttamente nelle pagine o in servizi applicativi sono candidati alla separazione in repository.

${markdownTable(
  ["File", "Query .from()", "Layer attuale"],
  directSupabaseRows
)}

## 9. Indicatori di duplicazione

${markdownTable(
  ["Pattern", "Occorrenze", "File principali"],
  duplicationRows
)}

## 10. CSS più grandi

${markdownTable(
  ["File", "Righe", "Byte"],
  largestCssRows
)}

## 11. Selettori CSS presenti in più file

${markdownTable(
  ["Selettore", "Numero file", "File"],
  duplicatedCssRows
)}

## 12. Interpretazione architetturale

Questo documento raccoglie segnali quantitativi. Prima di ogni estrazione o spostamento di codice sarà necessario verificare:

1. responsabilità effettiva del modulo;
2. contratti dati in ingresso e uscita;
3. dipendenze da Supabase, Auth e RLS;
4. utilizzo del Construction Snapshot;
5. eventuali calcoli duplicati nel Reporting Engine;
6. compatibilità con i dati esistenti;
7. impatto sul caricamento iniziale e sui chunk Vite.
`;

fs.writeFileSync(OUTPUT, report);

console.log("✅ Architecture audit generato:");
console.log(relative(OUTPUT));
console.log("");
console.log("Riepilogo:");
console.table(summary);
