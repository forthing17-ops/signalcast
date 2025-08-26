-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalRole" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "experienceLevel" TEXT,
    "currentChallenges" TEXT[],
    "formalityLevel" TEXT NOT NULL DEFAULT 'professional',
    "decisionFocusAreas" TEXT[],
    "interests" TEXT[],
    "techStack" TEXT[],
    "deliveryFrequency" TEXT NOT NULL DEFAULT 'daily',
    "contentDepth" TEXT NOT NULL DEFAULT 'detailed',
    "contentFormats" TEXT[],
    "curiosityAreas" TEXT[],
    "noveltyPreference" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preference_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preference_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrls" TEXT[],
    "topics" TEXT[],
    "createdBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourcePlatform" TEXT,
    "sourceMetadata" JSONB,
    "relevanceScore" DOUBLE PRECISION,
    "contentHash" TEXT,
    "knowledgeMetadata" JSONB,
    "vectorEmbedding" JSONB,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "rating" SMALLINT,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_rate_limits" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_knowledge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "lastInteraction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "knowledgeDepth" TEXT NOT NULL DEFAULT 'beginner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_similarity" (
    "id" TEXT NOT NULL,
    "contentId1" TEXT NOT NULL,
    "contentId2" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "comparisonType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_similarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_relationships" (
    "id" TEXT NOT NULL,
    "parentContentId" TEXT NOT NULL,
    "childContentId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_feedback_userId_contentId_key" ON "user_feedback"("userId", "contentId");

-- CreateIndex
CREATE INDEX "api_rate_limits_service_timestamp_idx" ON "api_rate_limits"("service", "timestamp");

-- CreateIndex
CREATE INDEX "api_rate_limits_service_windowStart_windowEnd_idx" ON "api_rate_limits"("service", "windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "user_knowledge_userId_idx" ON "user_knowledge"("userId");

-- CreateIndex
CREATE INDEX "user_knowledge_topic_idx" ON "user_knowledge"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "user_knowledge_userId_topic_key" ON "user_knowledge"("userId", "topic");

-- CreateIndex
CREATE INDEX "content_similarity_contentId1_idx" ON "content_similarity"("contentId1");

-- CreateIndex
CREATE INDEX "content_similarity_contentId2_idx" ON "content_similarity"("contentId2");

-- CreateIndex
CREATE INDEX "content_similarity_similarityScore_idx" ON "content_similarity"("similarityScore");

-- CreateIndex
CREATE UNIQUE INDEX "content_similarity_contentId1_contentId2_key" ON "content_similarity"("contentId1", "contentId2");

-- CreateIndex
CREATE INDEX "content_relationships_parentContentId_idx" ON "content_relationships"("parentContentId");

-- CreateIndex
CREATE INDEX "content_relationships_childContentId_idx" ON "content_relationships"("childContentId");

-- CreateIndex
CREATE INDEX "content_relationships_relationshipType_idx" ON "content_relationships"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "content_relationships_parentContentId_childContentId_relati_key" ON "content_relationships"("parentContentId", "childContentId", "relationshipType");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_history" ADD CONSTRAINT "preference_history_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_history" ADD CONSTRAINT "preference_history_preferences_fkey" FOREIGN KEY ("userId") REFERENCES "user_preferences"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_knowledge" ADD CONSTRAINT "user_knowledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_similarity" ADD CONSTRAINT "content_similarity_contentId1_fkey" FOREIGN KEY ("contentId1") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_similarity" ADD CONSTRAINT "content_similarity_contentId2_fkey" FOREIGN KEY ("contentId2") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_relationships" ADD CONSTRAINT "content_relationships_parentContentId_fkey" FOREIGN KEY ("parentContentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_relationships" ADD CONSTRAINT "content_relationships_childContentId_fkey" FOREIGN KEY ("childContentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
