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

