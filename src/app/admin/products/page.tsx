import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { listAdminProducts } from "@/features/catalog/admin-queries";
import { getI18n } from "@/i18n/server";
import { ProductTable } from "./product-table";

export default async function ProductsAdminPage() {
  const { can } = await pageGuard("product.view");
  const [{ a }, products] = await Promise.all([getI18n(), listAdminProducts()]);
  return (
    <>
      <PageHeader title={a.catalog.products}>
        {can("product.edit") && (
          <Button asChild className="rounded-full">
            <Link href="/admin/products/new"><Plus className="size-4" />{a.catalog.newProduct}</Link>
          </Button>
        )}
      </PageHeader>
      <ProductTable products={products} canEdit={can("product.edit")} />
    </>
  );
}
