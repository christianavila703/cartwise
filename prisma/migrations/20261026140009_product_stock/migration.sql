-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0;

-- existing products: in stock -> 10 units, out of stock -> 0
UPDATE "Product" SET "stock" = CASE WHEN "isAvailable" THEN 10 ELSE 0 END;

-- "stock" is the source of truth; keep "isAvailable" in sync for every insert and update
CREATE OR REPLACE FUNCTION sync_product_availability() RETURNS trigger AS $$
BEGIN
  NEW."isAvailable" := NEW."stock" > 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_availability_from_stock
BEFORE INSERT OR UPDATE OF "stock", "isAvailable" ON "Product"
FOR EACH ROW EXECUTE FUNCTION sync_product_availability();

-- stock can never go negative, even if two orders race for the last unit
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_non_negative" CHECK ("stock" >= 0);
