import fs from "fs";
import path from "path";
import ts from "typescript";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const userRoleMap = {
  member: "USER_ROLE.MEMBER",
  groupCoordinator: "USER_ROLE.GROUP_COORDINATOR",
  admin: "USER_ROLE.ADMIN",
};

const groupRoleMap = {
  member: "GROUP_ROLE.MEMBER",
  coordinator: "GROUP_ROLE.COORDINATOR",
  treasurer: "GROUP_ROLE.TREASURER",
  secretary: "GROUP_ROLE.SECRETARY",
  chairman: "GROUP_ROLE.CHAIRMAN",
  admin: "GROUP_ROLE.ADMIN",
};

const groupSpecific = new Set([
  "coordinator",
  "treasurer",
  "secretary",
  "chairman",
]);

const userSpecific = new Set(["groupCoordinator"]);

const roleOperators = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile()) {
      if (full.endsWith(".ts") || full.endsWith(".tsx")) {
        files.push(full);
      }
    }
  }
  return files;
}

function isHasUserRoleArg(node) {
  const parent = node.parent;
  if (!parent || !ts.isCallExpression(parent)) return false;
  if (!parent.arguments.includes(node)) return false;
  const expr = parent.expression;
  if (ts.isIdentifier(expr) && expr.text === "hasUserRole") return true;
  if (ts.isPropertyAccessExpression(expr) && expr.name.text === "hasUserRole") {
    return true;
  }
  return false;
}

function arrayRoleKind(node) {
  const parent = node.parent;
  if (!parent || !ts.isArrayLiteralExpression(parent)) return null;
  const literals = parent.elements.filter(ts.isStringLiteralLike);
  if (literals.length === 0) return null;
  const values = new Set(literals.map((lit) => lit.text));
  for (const value of values) {
    if (groupSpecific.has(value)) return "group";
  }
  for (const value of values) {
    if (userSpecific.has(value)) return "user";
  }
  return null;
}

function getNodeName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  return null;
}

function classifyRoleByName(name) {
  const lower = name.toLowerCase();
  if (lower.includes("user")) return "user";
  if (lower.includes("member")) return "group";
  if (lower.includes("group")) return "group";
  if (lower.includes("membership")) return "group";
  if (lower.endsWith("role")) return "group";
  return null;
}

function isRoleComparison(node) {
  const parent = node.parent;
  if (!parent || !ts.isBinaryExpression(parent)) return null;
  if (!roleOperators.has(parent.operatorToken.kind)) return null;
  const other = node === parent.left ? parent.right : parent.left;
  const name = getNodeName(other);
  if (!name) return null;
  if (!/role/i.test(name)) return null;
  return classifyRoleByName(name);
}

function isRoleProperty(node) {
  const parent = node.parent;
  if (!parent || !ts.isPropertyAssignment(parent)) return false;
  const name = parent.name;
  let text = "";
  if (ts.isIdentifier(name)) text = name.text;
  if (ts.isStringLiteralLike(name)) text = name.text;
  if (!text) return false;
  return /role$/i.test(text);
}

function applyReplacements(code, replacements) {
  if (replacements.length === 0) return code;
  const ordered = replacements.sort((a, b) => b.start - a.start);
  let output = code;
  for (const rep of ordered) {
    output = output.slice(0, rep.start) + rep.text + output.slice(rep.end);
  }
  return output;
}

function ensureRoleImports(code, needsUserRole, needsGroupRole) {
  if (!needsUserRole && !needsGroupRole) return code;
  const needed = [];
  if (needsUserRole) needed.push("USER_ROLE");
  if (needsGroupRole) needed.push("GROUP_ROLE");

  const importRegex =
    /^import\s+{([^}]+)}\s+from\s+["']@\/lib\/roles["'];/m;
  const match = code.match(importRegex);
  if (match) {
    const existing = match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...existing, ...needed]));
    const replacement = `import { ${merged.join(", ")} } from "@/lib/roles";`;
    return code.replace(importRegex, replacement);
  }

  const importLines = code.match(/^import .*;$/gm) || [];
  if (importLines.length === 0) {
    return `import { ${needed.join(", ")} } from "@/lib/roles";\n${code}`;
  }

  const lastImport = importLines[importLines.length - 1];
  const idx = code.lastIndexOf(lastImport);
  if (idx === -1) return code;

  const insertAt = idx + lastImport.length;
  return (
    code.slice(0, insertAt) +
    `\nimport { ${needed.join(", ")} } from "@/lib/roles";` +
    code.slice(insertAt)
  );
}

function transformFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    original,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const replacements = [];
  let needsUserRole = false;
  let needsGroupRole = false;

  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      const value = node.text;
      let replacement = null;

      if (value in userRoleMap && isHasUserRoleArg(node)) {
        replacement = userRoleMap[value];
        needsUserRole = true;
      } else {
        const arrayKind = arrayRoleKind(node);
        if (arrayKind === "group" && value in groupRoleMap) {
          replacement = groupRoleMap[value];
          needsGroupRole = true;
        } else if (arrayKind === "user" && value in userRoleMap) {
          replacement = userRoleMap[value];
          needsUserRole = true;
        } else {
          const comparisonKind = isRoleComparison(node);
          if (comparisonKind === "group" && value in groupRoleMap) {
            replacement = groupRoleMap[value];
            needsGroupRole = true;
          } else if (comparisonKind === "user" && value in userRoleMap) {
            replacement = userRoleMap[value];
            needsUserRole = true;
          } else if (isRoleProperty(node) && value in groupRoleMap) {
            replacement = groupRoleMap[value];
            needsGroupRole = true;
          }
        }
      }

      if (replacement) {
        replacements.push({
          start: node.getStart(sourceFile),
          end: node.getEnd(),
          text: replacement,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (replacements.length === 0) return false;

  let updated = applyReplacements(original, replacements);
  updated = ensureRoleImports(updated, needsUserRole, needsGroupRole);

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    return true;
  }
  return false;
}

function run() {
  const files = walk(srcRoot);
  let changed = 0;
  for (const file of files) {
    if (transformFile(file)) changed += 1;
  }
  console.log(`role-constants codemod updated ${changed} file(s).`);
}

run();
