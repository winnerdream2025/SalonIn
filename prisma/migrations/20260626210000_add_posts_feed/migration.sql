-- Phase 3: Social Feed & Posts

-- PostType enum
DO $$ BEGIN
  CREATE TYPE "PostType" AS ENUM ('PHOTO', 'VIDEO', 'BEFORE_AFTER', 'TEXT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Post
CREATE TABLE IF NOT EXISTS "Post" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "type"           "PostType" NOT NULL,
    "caption"        TEXT,
    "mediaUrls"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "beforeUrl"      TEXT,
    "afterUrl"       TEXT,
    "serviceId"      TEXT,
    "visibility"     "StoryVisibility" NOT NULL DEFAULT 'PUBLIC',
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "likesCount"     INTEGER NOT NULL DEFAULT 0,
    "commentsCount"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Post_userId_createdAt_idx"    ON "Post"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_createdAt_idx"           ON "Post"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_visibility_createdAt_idx" ON "Post"("visibility", "createdAt" DESC);
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostLike
CREATE TABLE IF NOT EXISTS "PostLike" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");
CREATE INDEX IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId");
CREATE INDEX IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment
CREATE TABLE IF NOT EXISTS "Comment" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "parentId"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx"         ON "Comment"("parentId");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hashtag
CREATE TABLE IF NOT EXISTS "Hashtag" (
    "id"        TEXT NOT NULL,
    "tag"       TEXT NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Hashtag_tag_key"      ON "Hashtag"("tag");
CREATE INDEX IF NOT EXISTS "Hashtag_postCount_idx"       ON "Hashtag"("postCount" DESC);

-- PostHashtag
CREATE TABLE IF NOT EXISTS "PostHashtag" (
    "postId"    TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    CONSTRAINT "PostHashtag_pkey" PRIMARY KEY ("postId", "hashtagId")
);
CREATE INDEX IF NOT EXISTS "PostHashtag_hashtagId_idx" ON "PostHashtag"("hashtagId");
ALTER TABLE "PostHashtag" ADD CONSTRAINT "PostHashtag_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostHashtag" ADD CONSTRAINT "PostHashtag_hashtagId_fkey"
    FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StoryHighlight
CREATE TABLE IF NOT EXISTS "StoryHighlight" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "coverUrl"  TEXT,
    "storyIds"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryHighlight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StoryHighlight_userId_idx" ON "StoryHighlight"("userId");
ALTER TABLE "StoryHighlight" ADD CONSTRAINT "StoryHighlight_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
