export const USER_ROLE = {
  MEMBER: "member",
  GROUP_COORDINATOR: "groupCoordinator",
  ADMIN: "admin",
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

export const LEGACY_USER_ROLE = {
  COORDINATOR: "coordinator",
  GROUP_COORDINATOR_SNAKE: "group_coordinator",
  GROUP_COORDINATOR_COMPACT: "groupcoordinator",
} as const;

export type LegacyUserRole =
  typeof LEGACY_USER_ROLE[keyof typeof LEGACY_USER_ROLE];

export const USER_ROLE_PRIORITY: readonly UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.GROUP_COORDINATOR,
  USER_ROLE.MEMBER,
];

export const GROUP_ROLE = {
  MEMBER: "member",
  COORDINATOR: "coordinator",
  TREASURER: "treasurer",
  SECRETARY: "secretary",
  CHAIRMAN: "chairman",
  ADMIN: "admin",
} as const;

export type GroupRole = typeof GROUP_ROLE[keyof typeof GROUP_ROLE];

export const ELEVATED_GROUP_ROLES: readonly GroupRole[] = [
  GROUP_ROLE.COORDINATOR,
  GROUP_ROLE.TREASURER,
  GROUP_ROLE.SECRETARY,
  GROUP_ROLE.ADMIN,
];
