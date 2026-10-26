-- trigram matching for product search (Supabase keeps extensions in the "extensions" schema;
-- creating it here also lets the migration run on a plain PostgreSQL database)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product" USING GIN ("name" extensions.gin_trgm_ops);
