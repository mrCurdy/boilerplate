/** Ordered from least to most privileged. Add new roles here; rank follows array order. */
export const ROLES = ['user', 'moderator', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export const roleRank = (role: Role): number => ROLES.indexOf(role);

/** True when `role` is at least as privileged as `min`. */
export const hasRole = (role: Role | undefined | null, min: Role): boolean =>
  !!role && roleRank(role) >= roleRank(min);
