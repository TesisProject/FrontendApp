export const Role = {
  ADMIN:    'ADMIN',
  OPERATOR: 'OPERATOR',
  USER:     'USER',
} as const

export type Role = typeof Role[keyof typeof Role]
