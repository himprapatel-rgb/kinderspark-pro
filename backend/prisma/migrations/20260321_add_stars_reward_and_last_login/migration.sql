-- Migration: 20260321_add_stars_reward_and_last_login
-- Adds configurable star rewards to Homework and last login tracking to Student

-- Add starsReward to Homework (default 5 stars per completion)
ALTER TABLE "Homework" ADD COLUMN "starsReward" INTEGER NOT NULL DEFAULT 5;

-- Add lastLoginAt to Student (nullable, updated on PIN login)
ALTER TABLE "Student" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
