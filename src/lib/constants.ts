export const DEPARTMENTS = [
  'Technology',
  'Marketing',
  'Commercial',
  'HR',
  'Finance',
  'Business Support',
  'Business Support / الشئون الهندسية',
  'Business Support / الشئون القانونية',
  'Business Support / الشئون الإدارية',
  'Business Support / الشئون الإدارية / الأمن',
  'Business Support / الشئون الإدارية / النظافة',
  'Business Support / الشئون الإدارية / الأدوات المكتبية',
  'Business Support / الشئون الإدارية / المخزن',
  'Business Support / الشئون الإدارية / الاستقبال',
  'Content Center',
  'Customer Experience',
  'Supply Chain',
  'NS Home',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

// Hierarchical structure of Business Support sub-departments.
// Useful for grouped UI (tree/accordion) without changing how values are stored.
export const BUSINESS_SUPPORT_TREE = {
  'الشئون الهندسية': [],
  'الشئون القانونية': [],
  'الشئون الإدارية': [
    'الأمن',
    'النظافة',
    'الأدوات المكتبية',
    'المخزن',
    'الاستقبال',
  ],
} as const;

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

