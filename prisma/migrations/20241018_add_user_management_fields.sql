-- Add user management fields to users table
ALTER TABLE "users" ADD COLUMN "is_suspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "suspension_reason" TEXT;
ALTER TABLE "users" ADD COLUMN "is_approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "approval_reason" TEXT;

-- Add indexes for better query performance
CREATE INDEX "users_is_suspended_idx" ON "users"("is_suspended");
CREATE INDEX "users_is_approved_idx" ON "users"("is_approved");

