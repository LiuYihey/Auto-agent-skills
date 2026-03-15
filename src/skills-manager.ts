import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const DEFAULT_SKILLS_DIR = path.join(os.homedir(), ".autoskills", "personal-skills");

export function getSkillsDir(): string {
  return process.env.AUTOSKILLS_DIR || DEFAULT_SKILLS_DIR;
}

export interface SkillMeta {
  name: string;
  description: string;
  version: string;
  tags: string[];
  created: string;
  updated: string;
}

export interface Skill {
  meta: SkillMeta;
  content: string;
  filePath: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const metaBlock = match[1];
  const body = match[2];
  const meta: Record<string, unknown> = {};

  for (const line of metaBlock.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value: unknown = line.slice(idx + 1).trim();

    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim());
    }
    meta[key] = value;
  }

  return { meta, body };
}

function buildFrontmatter(meta: SkillMeta): string {
  const tags = `[${meta.tags.join(", ")}]`;
  return [
    "---",
    `name: ${meta.name}`,
    `description: ${meta.description}`,
    `version: ${meta.version}`,
    `tags: ${tags}`,
    `created: ${meta.created}`,
    `updated: ${meta.updated}`,
    "---",
  ].join("\n");
}

export function listSkills(): { name: string; description: string; path: string }[] {
  const dir = getSkillsDir();
  ensureDir(dir);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const skills: { name: string; description: string; path: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(dir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;

    const raw = fs.readFileSync(skillFile, "utf-8");
    const { meta } = parseFrontmatter(raw);
    skills.push({
      name: (meta.name as string) || entry.name,
      description: (meta.description as string) || "",
      path: skillFile,
    });
  }

  return skills;
}

export function getSkill(name: string): Skill | null {
  const dir = getSkillsDir();
  const skillFile = path.join(dir, name, "SKILL.md");
  if (!fs.existsSync(skillFile)) return null;

  const raw = fs.readFileSync(skillFile, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  return {
    meta: {
      name: (meta.name as string) || name,
      description: (meta.description as string) || "",
      version: (meta.version as string) || "1.0.0",
      tags: (meta.tags as string[]) || [],
      created: (meta.created as string) || "",
      updated: (meta.updated as string) || "",
    },
    content: body,
    filePath: skillFile,
  };
}

function runNpxSkillsAdd(skillDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["autoskill", "add", skillDir, "-y"], {
      stdio: "pipe",
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npx skills add failed (code ${code}): ${stderr || stdout}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to run npx skills add: ${err.message}`));
    });
  });
}

export function createSkill(
  name: string,
  description: string,
  title: string,
  whenToUse: string,
  instructions: string,
  tags: string[] = []
): string {
  const dir = getSkillsDir();
  const skillDir = path.join(dir, name);

  if (fs.existsSync(skillDir)) {
    throw new Error(`Skill "${name}" already exists. Use update_skill to modify it.`);
  }

  ensureDir(skillDir);

  const now = new Date().toISOString().slice(0, 10);
  const fullDescription = whenToUse
    ? `${description} Use when: ${whenToUse}`
    : description;
  const meta: SkillMeta = {
    name,
    description: fullDescription,
    version: "1.0.0",
    tags,
    created: now,
    updated: now,
  };

  const content = [
    buildFrontmatter(meta),
    "",
    `# ${title}`,
    "",
    instructions,
    "",
  ].join("\n");

  const skillFile = path.join(skillDir, "SKILL.md");
  fs.writeFileSync(skillFile, content, "utf-8");

  createSymlinkForSkill(name);

  return skillFile;
}

export function updateSkill(
  name: string,
  updates: {
    description?: string;
    title?: string;
    whenToUse?: string;
    instructions?: string;
    tags?: string[];
  }
): string {
  const dir = getSkillsDir();
  const skillFile = path.join(dir, name, "SKILL.md");

  if (!fs.existsSync(skillFile)) {
    throw new Error(`Skill "${name}" not found.`);
  }

  const raw = fs.readFileSync(skillFile, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  const now = new Date().toISOString().slice(0, 10);
  const currentVersion = (meta.version as string) || "1.0.0";
  const versionParts = currentVersion.split(".").map(Number);
  versionParts[2] = (versionParts[2] || 0) + 1;

  const baseDescription = updates.description || (meta.description as string) || "";
  const newDescription = updates.whenToUse
    ? `${baseDescription} Use when: ${updates.whenToUse}`
    : baseDescription;

  const newMeta: SkillMeta = {
    name: (meta.name as string) || name,
    description: newDescription,
    version: versionParts.join("."),
    tags: updates.tags || (meta.tags as string[]) || [],
    created: (meta.created as string) || now,
    updated: now,
  };

  let newBody = body;

  if (updates.title || updates.instructions) {
    const titleMatch = body.match(/^# .+$/m);
    const currentTitle = titleMatch ? titleMatch[0].slice(2) : name;

    const instrMatch = body.match(/## Instructions\r?\n([\s\S]*?)$/) ||
      body.match(/^(?!#)([\s\S]+)$/m);
    const currentInstr = instrMatch ? instrMatch[1].trim() : body.trim();

    newBody = [
      "",
      `# ${updates.title || currentTitle}`,
      "",
      updates.instructions || currentInstr,
      "",
    ].join("\n");
  }

  const content = buildFrontmatter(newMeta) + "\n" + newBody;
  fs.writeFileSync(skillFile, content, "utf-8");
  return skillFile;
}

export function deleteSkill(name: string): boolean {
  const dir = getSkillsDir();
  const skillDir = path.join(dir, name);

  if (!fs.existsSync(skillDir)) return false;

  fs.rmSync(skillDir, { recursive: true, force: true });
  return true;
}

function findSkillInPlugins(baseDir: string, skillName: string): string[] {
  const results: string[] = [];
  const pluginsDir = path.join(baseDir, "plugins");
  
  if (!fs.existsSync(pluginsDir)) return results;
  
  try {
    const pluginEntries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of pluginEntries) {
      if (!entry.isDirectory()) continue;
      
      // Check common subdirectories in plugins
      const possiblePaths = [
        path.join(pluginsDir, entry.name, "skills", skillName),
        path.join(pluginsDir, entry.name, "agents", skillName),
        path.join(pluginsDir, entry.name, skillName),
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          results.push(p);
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return results;
}

function readSkillNameFromSkillMd(skillMdPath: string): string | null {
  try {
    const content = fs.readFileSync(skillMdPath, "utf-8");
    const match = content.match(/^name:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function findSkillByScanningSkillMd(baseDir: string, skillName: string): string | null {
  const queue: string[] = [baseDir];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    let entries: fs.Dirent[] = [];

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    const skillMd = path.join(current, "SKILL.md");
    if (fs.existsSync(skillMd)) {
      const parsedName = readSkillNameFromSkillMd(skillMd);
      const dirName = path.basename(current);
      if (parsedName === skillName || dirName === skillName) {
        return current;
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      queue.push(path.join(current, entry.name));
    }
  }

  return null;
}

function resolveSkillSourceDir(baseDir: string, skillName: string): string | null {
  const rootSkillMd = path.join(baseDir, "SKILL.md");
  if (fs.existsSync(rootSkillMd)) {
    const parsedName = readSkillNameFromSkillMd(rootSkillMd);
    if (parsedName === skillName) {
      return baseDir;
    }
  }

  const directCandidates = [
    path.join(baseDir, skillName),
    path.join(baseDir, "skills", skillName),
    path.join(baseDir, "src", skillName),
    path.join(baseDir, "packages", skillName),
    path.join(baseDir, "plugins", skillName),
    path.join(baseDir, "agents", skillName),
    ...findSkillInPlugins(baseDir, skillName),
  ];

  for (const candidate of directCandidates) {
    if (!fs.existsSync(candidate)) continue;
    if (fs.existsSync(path.join(candidate, "SKILL.md"))) {
      return candidate;
    }
  }

  return findSkillByScanningSkillMd(baseDir, skillName);
}

export interface PublicSkillResult {
  package: string;
  url: string;
  installs: number;
}

function parseInstallCount(installStr: string): number {
  const clean = installStr.toLowerCase().replace(/,/g, '');
  if (clean.endsWith('k')) {
    return parseFloat(clean.slice(0, -1)) * 1000;
  }
  if (clean.endsWith('m')) {
    return parseFloat(clean.slice(0, -1)) * 1000000;
  }
  return parseInt(clean, 10) || 0;
}

export function searchPublicSkills(query: string): Promise<PublicSkillResult[]> {
  return new Promise((resolve) => {
    const proc = spawn("npx", ["skills", "find", query], {
      stdio: "pipe",
      shell: true,
    });

    let stdout = "";
    proc.stdout?.on("data", (data) => { stdout += data.toString(); });
    proc.stderr?.on("data", (data) => { stdout += data.toString(); });

    proc.on("close", () => {
      const results: PublicSkillResult[] = [];
      // Strip ANSI escape codes, normalize line endings
      const clean = stdout.replace(/\x1B\[[0-9;]*[mGKHFJA-Za-z]/g, "").replace(/\r/g, "");
      const lines = clean.split("\n").filter(l => l.trim() !== "");
      for (let i = 0; i < lines.length; i++) {
        // Match: owner/repo@skill-name [N installs] or [N.K installs]
        const pkgMatch = lines[i].match(/^([\w.-]+\/[\w.-]+@[\w./ -]+?)\s+(\d+(?:\.\d+)?[KkMm]?)\s+installs?$/);
        if (pkgMatch) {
          const pkg = pkgMatch[1].trim();
          const installCount = parseInstallCount(pkgMatch[2]);
          // Next non-empty line may be └ https://...
          const nextLine = lines[i + 1] ? lines[i + 1].trim().replace(/^[└\\]\s*/, "") : "";
          const url = nextLine.startsWith("https://") ? nextLine : `https://skills.sh/${pkg.replace("@", "/")}`;
          results.push({ package: pkg, url, installs: installCount });
        }
      }
      // Sort by install count descending (highest first)
      results.sort((a, b) => b.installs - a.installs);
      resolve(results);
    });
  });
}

export function installPublicSkill(pkg: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parts = pkg.split("@");
    let repoPath: string;
    let skillName: string;
    
    if (parts.length === 2) {
      repoPath = parts[0];
      skillName = parts[1];
    } else if (parts.length === 1) {
      repoPath = parts[0];
      skillName = repoPath.split("/").pop() || repoPath;
    } else {
      return reject(new Error(`Invalid package format: ${pkg}. Expected format: owner/repo[@skill-name]`));
    }

    // Use SSH URL for GitHub repositories to leverage local SSH configuration
    const repoUrl = `git@github.com:${repoPath}.git`;

    const tempDir = path.join(os.tmpdir(), `skills-install-${Date.now()}`);
    
    // Use spawn to execute git clone via SSH
    const cloneProc = spawn("git", ["clone", repoUrl, tempDir], {
      stdio: "ignore",
      shell: true,
    });

    cloneProc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Failed to clone repository: ${repoUrl}`));
      }

      try {
        // Find the skill directory
        let sourceSkillDir = tempDir;
        if (parts.length === 2) {
          // Look for the specific skill directory
          const specificDir = path.join(tempDir, skillName);
          if (fs.existsSync(specificDir) && fs.statSync(specificDir).isDirectory()) {
            sourceSkillDir = specificDir;
          } else {
            // Search recursively
            const findSkillDir = (dir: string): string | null => {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith(".")) {
                  if (entry.name === skillName) {
                    return path.join(dir, entry.name);
                  }
                  const found = findSkillDir(path.join(dir, entry.name));
                  if (found) return found;
                }
              }
              return null;
            };
            const found = findSkillDir(tempDir);
            if (found) {
              sourceSkillDir = found;
            } else {
              throw new Error(`Skill ${skillName} not found in repository ${repoPath}`);
            }
          }
        }

        const targetDir = path.join(getSkillsDir(), skillName);
        
        // Remove existing if any
        if (fs.existsSync(targetDir)) {
          fs.rmSync(targetDir, { recursive: true, force: true });
        }
        
        // Copy the specific skill directory
        copyDir(sourceSkillDir, targetDir);
        
        // Clean up temp dir
        fs.rmSync(tempDir, { recursive: true, force: true });

        // Create symlink in .agents/skills
        createSymlinkForSkill(skillName);

        resolve(targetDir);
      } catch (err: any) {
        reject(new Error(`Installation failed: ${err.message}`));
      }
    });

    cloneProc.on("error", (err) => reject(new Error(`Failed to run git clone: ${err.message}`)));
  });
}

function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function getAgentsSkillsDir(): string {
  return process.env.AGENTS_SKILLS_DIR || path.join(os.homedir(), ".agents", "skills");
}

export function listGlobalSkills(): string[] {
  const dir = getAgentsSkillsDir();
  if (!fs.existsSync(dir)) return [];
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const skills: string[] = [];
  
  for (const entry of entries) {
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      skills.push(entry.name);
    }
  }
  
  return skills;
}

export interface LocalSkillResult {
  name: string;
  path: string;
  score?: number;
}

export function searchLocalSkills(query: string): LocalSkillResult[] {
  const dir = getAgentsSkillsDir();
  if (!fs.existsSync(dir)) return [];
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: LocalSkillResult[] = [];
  
  // Escape regex specials
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use word boundary to avoid false positive substring matches (e.g. "cat" in "category")
  const wordRegex = new RegExp(`\\b${safeQuery}\\b`, 'i');
  const substringRegex = new RegExp(safeQuery, 'i');
  
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    
    const skillName = entry.name;
    const skillPath = path.join(dir, skillName);
    const skillMd = path.join(skillPath, "SKILL.md");
    
    let score = 0;
    
    // 1. Direct name match (highest priority)
    if (wordRegex.test(skillName)) {
      score += 10;
    } else if (substringRegex.test(skillName)) {
      score += 5;
    }
    
    // 2. Content match (metadata only)
    if (fs.existsSync(skillMd)) {
      try {
        const content = fs.readFileSync(skillMd, "utf-8");
        
        // Match in frontmatter (description, tags) has medium priority
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch && wordRegex.test(frontmatterMatch[1])) {
          score += 3;
        }
      } catch {
        // Ignore read errors
      }
    }
    
    if (score > 0) {
      results.push({ name: skillName, path: skillPath, score });
    }
  }
  
  // Sort by score descending so the most relevant skill comes first
  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  return results;
}

export function createSymlinkForSkill(skillName: string): void {
  const skillsDir = getSkillsDir();
  const agentsDir = getAgentsSkillsDir();
  const target = path.join(skillsDir, skillName);
  const linkPath = path.join(agentsDir, skillName);

  if (!fs.existsSync(target)) return;
  if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });
  if (fs.existsSync(linkPath)) return;

  try {
    fs.symlinkSync(target, linkPath, "junction");
  } catch {
    try { fs.symlinkSync(target, linkPath, "dir"); } catch { /* ignore */ }
  }
}
