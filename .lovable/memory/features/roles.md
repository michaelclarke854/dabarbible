---
name: Role system and access control
description: Complete role hierarchy, RLS policies, feature gates, admin capabilities
type: feature
---

## Role Hierarchy
super_admin > admin > beta > personal/family_owner/community_admin > free > suspended

## Super Admin Lock
- michaelclarke854@gmail.com = permanent super_admin (DB trigger `enforce_super_admin_lock`)
- Cannot be revoked, cannot be assigned to others

## Feature Gates
- Unlimited questions: all roles except free/suspended
- Journal (full): all paid roles + beta + admin
- Scripture tab: all paid roles + beta + admin
- Free: 3 questions/day, no journal/scripture
- Suspended: redirected to /suspended, no access

## Admin Capabilities
- super_admin: full role changes, suspend/unsuspend, delete users
- admin: grant/revoke beta only

## Tables
- user_roles (app_role enum) — legacy, kept for backward compat
- profiles.role/plan — primary role storage
- role_change_log — audit trail
- beta_feedback — beta user feedback
- crisis_events — privacy-preserving crisis log
- system_prompts — versioned prompt management
- app_config — feature flags

## RLS Summary
- Reflections & saved verses: ZERO admin visibility
- Wisdom sessions: admins see flagged only
- Profiles: admins can view/update all
- Role change log: admin read only, service role insert
