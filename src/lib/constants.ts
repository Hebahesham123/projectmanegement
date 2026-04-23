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
