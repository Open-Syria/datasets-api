-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Enable geospatial support for future boundary and nearby queries.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "DatasetCategory" AS ENUM ('geography', 'education', 'transport', 'heritage', 'telecom');

-- CreateEnum
CREATE TYPE "DatasetReleaseStatus" AS ENUM ('planned', 'seed', 'released', 'deprecated');

-- CreateEnum
CREATE TYPE "RecordSourceStatus" AS ENUM ('pending_release', 'seed', 'released', 'deprecated');

-- CreateEnum
CREATE TYPE "LocalityKind" AS ENUM ('city', 'town', 'village', 'neighborhood', 'camp', 'locality', 'unknown');

-- CreateTable
CREATE TABLE "DatasetRelease" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "category" "DatasetCategory" NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT,
    "version" TEXT NOT NULL,
    "status" "DatasetReleaseStatus" NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "manifestSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetSource" (
    "releaseId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "license" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3),
    "fields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetSource_pkey" PRIMARY KEY ("releaseId","sourceId")
);

-- CreateTable
CREATE TABLE "GeographyGovernorate" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "iso31662" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "areaKm2" DOUBLE PRECISION,
    "population" JSONB,
    "sourceStatus" "RecordSourceStatus" NOT NULL,
    "sourceIds" JSONB,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeographyGovernorate_pkey" PRIMARY KEY ("releaseId","id")
);

-- CreateTable
CREATE TABLE "GeographyDistrict" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "governorateId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "areaKm2" DOUBLE PRECISION,
    "population" JSONB,
    "sourceStatus" "RecordSourceStatus" NOT NULL,
    "sourceIds" JSONB,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeographyDistrict_pkey" PRIMARY KEY ("releaseId","id")
);

-- CreateTable
CREATE TABLE "GeographySubdistrict" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "governorateId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "areaKm2" DOUBLE PRECISION,
    "population" JSONB,
    "sourceStatus" "RecordSourceStatus" NOT NULL,
    "sourceIds" JSONB,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeographySubdistrict_pkey" PRIMARY KEY ("releaseId","id")
);

-- CreateTable
CREATE TABLE "GeographyLocality" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "governorateId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "subdistrictId" TEXT NOT NULL,
    "kind" "LocalityKind" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "population" JSONB,
    "aliases" JSONB,
    "externalIds" JSONB,
    "sourceStatus" "RecordSourceStatus" NOT NULL,
    "sourceIds" JSONB,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeographyLocality_pkey" PRIMARY KEY ("releaseId","id")
);

-- CreateIndex
CREATE INDEX "DatasetRelease_datasetId_idx" ON "DatasetRelease"("datasetId");

-- CreateIndex
CREATE INDEX "DatasetRelease_slug_idx" ON "DatasetRelease"("slug");

-- CreateIndex
CREATE INDEX "DatasetRelease_category_idx" ON "DatasetRelease"("category");

-- CreateIndex
CREATE INDEX "DatasetRelease_status_idx" ON "DatasetRelease"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetRelease_datasetId_version_key" ON "DatasetRelease"("datasetId", "version");

-- CreateIndex
CREATE INDEX "DatasetSource_sourceId_idx" ON "DatasetSource"("sourceId");

-- CreateIndex
CREATE INDEX "GeographyGovernorate_releaseId_idx" ON "GeographyGovernorate"("releaseId");

-- CreateIndex
CREATE INDEX "GeographyGovernorate_id_idx" ON "GeographyGovernorate"("id");

-- CreateIndex
CREATE INDEX "GeographyGovernorate_nameEn_idx" ON "GeographyGovernorate"("nameEn");

-- CreateIndex
CREATE INDEX "GeographyGovernorate_sourceStatus_idx" ON "GeographyGovernorate"("sourceStatus");

-- CreateIndex
CREATE INDEX "GeographyDistrict_releaseId_idx" ON "GeographyDistrict"("releaseId");

-- CreateIndex
CREATE INDEX "GeographyDistrict_id_idx" ON "GeographyDistrict"("id");

-- CreateIndex
CREATE INDEX "GeographyDistrict_governorateId_idx" ON "GeographyDistrict"("governorateId");

-- CreateIndex
CREATE INDEX "GeographyDistrict_nameEn_idx" ON "GeographyDistrict"("nameEn");

-- CreateIndex
CREATE INDEX "GeographyDistrict_sourceStatus_idx" ON "GeographyDistrict"("sourceStatus");

-- CreateIndex
CREATE INDEX "GeographySubdistrict_releaseId_idx" ON "GeographySubdistrict"("releaseId");

-- CreateIndex
CREATE INDEX "GeographySubdistrict_id_idx" ON "GeographySubdistrict"("id");

-- CreateIndex
CREATE INDEX "GeographySubdistrict_governorateId_idx" ON "GeographySubdistrict"("governorateId");

-- CreateIndex
CREATE INDEX "GeographySubdistrict_districtId_idx" ON "GeographySubdistrict"("districtId");

-- CreateIndex
CREATE INDEX "GeographySubdistrict_nameEn_idx" ON "GeographySubdistrict"("nameEn");

-- CreateIndex
CREATE INDEX "GeographySubdistrict_sourceStatus_idx" ON "GeographySubdistrict"("sourceStatus");

-- CreateIndex
CREATE INDEX "GeographyLocality_releaseId_idx" ON "GeographyLocality"("releaseId");

-- CreateIndex
CREATE INDEX "GeographyLocality_id_idx" ON "GeographyLocality"("id");

-- CreateIndex
CREATE INDEX "GeographyLocality_governorateId_idx" ON "GeographyLocality"("governorateId");

-- CreateIndex
CREATE INDEX "GeographyLocality_districtId_idx" ON "GeographyLocality"("districtId");

-- CreateIndex
CREATE INDEX "GeographyLocality_subdistrictId_idx" ON "GeographyLocality"("subdistrictId");

-- CreateIndex
CREATE INDEX "GeographyLocality_kind_idx" ON "GeographyLocality"("kind");

-- CreateIndex
CREATE INDEX "GeographyLocality_nameEn_idx" ON "GeographyLocality"("nameEn");

-- CreateIndex
CREATE INDEX "GeographyLocality_sourceStatus_idx" ON "GeographyLocality"("sourceStatus");

-- AddForeignKey
ALTER TABLE "DatasetSource" ADD CONSTRAINT "DatasetSource_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "DatasetRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographyGovernorate" ADD CONSTRAINT "GeographyGovernorate_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "DatasetRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographyDistrict" ADD CONSTRAINT "GeographyDistrict_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "DatasetRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographyDistrict" ADD CONSTRAINT "GeographyDistrict_releaseId_governorateId_fkey" FOREIGN KEY ("releaseId", "governorateId") REFERENCES "GeographyGovernorate"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographySubdistrict" ADD CONSTRAINT "GeographySubdistrict_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "DatasetRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographySubdistrict" ADD CONSTRAINT "GeographySubdistrict_releaseId_governorateId_fkey" FOREIGN KEY ("releaseId", "governorateId") REFERENCES "GeographyGovernorate"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographySubdistrict" ADD CONSTRAINT "GeographySubdistrict_releaseId_districtId_fkey" FOREIGN KEY ("releaseId", "districtId") REFERENCES "GeographyDistrict"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographyLocality" ADD CONSTRAINT "GeographyLocality_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "DatasetRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographyLocality" ADD CONSTRAINT "GeographyLocality_releaseId_governorateId_fkey" FOREIGN KEY ("releaseId", "governorateId") REFERENCES "GeographyGovernorate"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographyLocality" ADD CONSTRAINT "GeographyLocality_releaseId_districtId_fkey" FOREIGN KEY ("releaseId", "districtId") REFERENCES "GeographyDistrict"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeographyLocality" ADD CONSTRAINT "GeographyLocality_releaseId_subdistrictId_fkey" FOREIGN KEY ("releaseId", "subdistrictId") REFERENCES "GeographySubdistrict"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
