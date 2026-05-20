export const DEPARTMENTS = [
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

export type Department = (typeof DEPARTMENTS)[number];

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

