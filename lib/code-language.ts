import hljs from "highlight.js";

const DETECTION_SUBSET = [
  "bash",
  "c",
  "cpp",
  "css",
  "dockerfile",
  "go",
  "html",
  "ini",
  "java",
  "javascript",
  "json",
  "markdown",
  "plaintext",
  "python",
  "rust",
  "shell",
  "sql",
  "toml",
  "typescript",
  "xml",
  "yaml"
] as const;

const NORMALIZED_LANGUAGE_ALIASES: Record<string, string> = {
  cjs: "javascript",
  console: "bash",
  docker: "dockerfile",
  html: "html",
  js: "javascript",
  jsx: "jsx",
  plaintext: "plaintext",
  py: "python",
  shell: "bash",
  shellscript: "bash",
  sh: "bash",
  text: "plaintext",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  xml: "html",
  yml: "yaml",
  zsh: "bash"
};

const DISPLAY_LANGUAGE_ALIASES: Record<string, string> = {
  javascript: "javascript",
  jsx: "jsx",
  plaintext: "text",
  typescript: "typescript",
  tsx: "tsx"
};

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").trim();
}

function isLikelyJson(value: string) {
  if (!/^[\[{]/.test(value)) {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function isLikelyHtml(value: string) {
  return /<!DOCTYPE html>|<\/?[a-z][\w:-]*[^>]*>/i.test(value);
}

function isLikelyDockerfile(value: string) {
  return /^(FROM|RUN|COPY|ADD|WORKDIR|CMD|ENTRYPOINT|ENV|ARG|EXPOSE|USER|LABEL|VOLUME)\b/m.test(
    value
  );
}

function isLikelyBash(value: string) {
  return /^#!.*\b(?:bash|sh|zsh)\b/.test(value) || /^\s*(?:\$ |\w+=|if \[|fi$|echo |curl |npm |pnpm |yarn |python3? )/m.test(value);
}

function isLikelyPython(value: string) {
  return /^\s*(?:def |class |from \w+ import |import \w+|async def |@[\w.]+)/m.test(value) || /\b(?:None|True|False|self)\b/.test(value);
}

function isLikelyTypeScript(value: string) {
  return /\b(?:interface|type)\s+[A-Z]\w*/.test(value) || /:\s*(?:string|number|boolean|Record|Promise|Readonly|Array|unknown|never|void)\b/.test(value) || /\b(?:implements|enum|as const)\b/.test(value);
}

function isLikelyJavaScript(value: string) {
  return /^\s*(?:const |let |var |function |export |import )/m.test(value) || /=>/.test(value);
}

function isLikelyYaml(value: string) {
  return /^---\n/.test(value) || /^(?:[A-Za-z0-9_-]+):(?:\s|$)/m.test(value);
}

function isLikelySql(value: string) {
  return /^\s*(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/im.test(value);
}

function isLikelyGo(value: string) {
  return /^\s*package\s+\w+/m.test(value) || /^\s*func\s+\w+/m.test(value);
}

function isLikelyRust(value: string) {
  return /\bfn\s+\w+\s*\(/.test(value) || /\blet\s+mut\b/.test(value) || /\bimpl\b/.test(value);
}

function isLikelyCpp(value: string) {
  return /#include\s*<iostream>|std::|cout\s*<</.test(value);
}

function isLikelyC(value: string) {
  return /#include\s*<stdio\.h>|printf\s*\(|scanf\s*\(|int\s+main\s*\(/.test(value);
}

export function normalizeCodeLanguage(language: string | null | undefined) {
  const normalized = normalizeWhitespace(String(language ?? "")).toLowerCase();

  if (!normalized) {
    return "plaintext";
  }

  return NORMALIZED_LANGUAGE_ALIASES[normalized] ?? normalized;
}

export function formatCodeLanguageLabel(language: string | null | undefined) {
  const normalized = normalizeCodeLanguage(language);
  return DISPLAY_LANGUAGE_ALIASES[normalized] ?? normalized;
}

export function detectCodeLanguage(code: string) {
  const normalizedCode = normalizeWhitespace(code);

  if (!normalizedCode) {
    return "plaintext";
  }

  if (isLikelyJson(normalizedCode)) {
    return "json";
  }

  if (isLikelyHtml(normalizedCode)) {
    return "html";
  }

  if (isLikelyDockerfile(normalizedCode)) {
    return "dockerfile";
  }

  if (isLikelyBash(normalizedCode)) {
    return "bash";
  }

  if (isLikelyPython(normalizedCode)) {
    return "python";
  }

  if (isLikelyTypeScript(normalizedCode)) {
    return "typescript";
  }

  if (isLikelyJavaScript(normalizedCode)) {
    return "javascript";
  }

  if (isLikelyYaml(normalizedCode)) {
    return "yaml";
  }

  if (isLikelySql(normalizedCode)) {
    return "sql";
  }

  if (isLikelyGo(normalizedCode)) {
    return "go";
  }

  if (isLikelyRust(normalizedCode)) {
    return "rust";
  }

  if (isLikelyCpp(normalizedCode)) {
    return "cpp";
  }

  if (isLikelyC(normalizedCode)) {
    return "c";
  }

  const detected = hljs.highlightAuto(normalizedCode, [...DETECTION_SUBSET]).language;
  return normalizeCodeLanguage(detected);
}
