-- This unapplied migration used to retire hali-yikama. The current catalog
-- contract includes all 11 active categories. Preserve the administrator's
-- current decision; never silently deactivate a category during an upgrade.
select 1;
