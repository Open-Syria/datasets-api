-- Make locality district and subdistrict references optional to match the
-- public data-geography locality contract.
ALTER TABLE "GeographyLocality" DROP CONSTRAINT "GeographyLocality_releaseId_districtId_fkey";
ALTER TABLE "GeographyLocality" DROP CONSTRAINT "GeographyLocality_releaseId_subdistrictId_fkey";

ALTER TABLE "GeographyLocality" ALTER COLUMN "districtId" DROP NOT NULL;
ALTER TABLE "GeographyLocality" ALTER COLUMN "subdistrictId" DROP NOT NULL;

ALTER TABLE "GeographyLocality" ADD CONSTRAINT "GeographyLocality_releaseId_districtId_fkey" FOREIGN KEY ("releaseId", "districtId") REFERENCES "GeographyDistrict"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GeographyLocality" ADD CONSTRAINT "GeographyLocality_releaseId_subdistrictId_fkey" FOREIGN KEY ("releaseId", "subdistrictId") REFERENCES "GeographySubdistrict"("releaseId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
