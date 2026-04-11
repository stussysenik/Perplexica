ALTER TABLE `messages` ADD COLUMN `parentId` text;
ALTER TABLE `messages` ADD COLUMN `branchIndex` integer DEFAULT 0;
ALTER TABLE `messages` ADD COLUMN `isCompacted` integer DEFAULT 0;
ALTER TABLE `messages` ADD COLUMN `compactSummary` text;
