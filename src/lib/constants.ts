// Top-level departments shown in the picker.
export const DEPARTMENTS_TOP = [
  'Technology',
  'Marketing',
  'Commercial',
  'HR',
  'Finance',
  'Business Support',
  'Content Center',
  'Customer Experience',
  'Supply Chain',
  'NS Home',
  'التصنيع',
  'قطاع الجمله',
] as const;

// Hierarchical groups: parent -> children. Children are themselves valid selectable values.
// Supports nested groups (a child can be a parent in this map).
export const DEPARTMENT_GROUPS: Record<string, readonly string[]> = {
  'Business Support': [
    'Business Support / الشئون الهندسية',
    'Business Support / الشئون القانونية',
    'Business Support / الشئون الإدارية',
  ],
  'Business Support / الشئون الإدارية': [
    'Business Support / الشئون الإدارية / الأمن',
    'Business Support / الشئون الإدارية / النظافة',
    'Business Support / الشئون الإدارية / الأدوات المكتبية',
    'Business Support / الشئون الإدارية / المخزن',
    'Business Support / الشئون الإدارية / الاستقبال',
  ],
};

// Flat list of every valid department value (top-level + all descendants).
// Use this for filter Set membership checks against saved values.
function flattenGroups(top: readonly string[], groups: Record<string, readonly string[]>): string[] {
  const out: string[] = [];
  const walk = (name: string) => {
    out.push(name);
    const kids = groups[name];
    if (kids) kids.forEach(walk);
  };
  top.forEach(walk);
  return out;
}

export const DEPARTMENTS = flattenGroups(DEPARTMENTS_TOP, DEPARTMENT_GROUPS) as readonly string[];

export type Department = string;

// Allowed Project Managers
export const PROJECT_MANAGERS = [
  'Rehab Ibrahim',
  'Farah Ashraf',
  'Anjie Magdy',
] as const;

// Allowed Project Owners (the 4 admins)
export const PROJECT_OWNERS = [
  'Karim Elbahey',
  'Rehab Ibrahim',
  'Farah Ashraf',
  'Anjie Magdy',
] as const;

// Users restricted to seeing only their own projects/tasks.
// Match by email (case-insensitive).
export const RESTRICTED_USER_EMAILS = [
  'osama.erian@nstextile-eg.com',
  'khaled.alnemr@nstextile-eg.com',
  'mohamed.hussein@nstextile-eg.com',
] as const;

export function isRestrictedEmail(email?: string | null) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return (RESTRICTED_USER_EMAILS as readonly string[]).includes(e);
}
