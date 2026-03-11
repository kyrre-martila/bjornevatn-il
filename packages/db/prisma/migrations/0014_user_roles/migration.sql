CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'editor');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'editor';
