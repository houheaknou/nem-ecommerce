import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { getProductForEdit, listCategories } from "@/features/catalog/admin-queries";
import { getI18n } from "@/i18n/server";
import { ProductForm } from "../product-form";

/** /admin/products/new and /admin/products/<uuid> */
export default async function ProductEditPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const { can } = await pageGuard("product.edit");
  const canCost = can("cost.view");
  const isNew = id === "new";
  const [{ a, locale }, categories, product] = await Promise.all([
    getI18n(),
    listCategories(),
    isNew ? Promise.resolve(null) : /^[0-9a-f-]{36}$/.test(id) ? getProductForEdit(id, canCost) : Promise.resolve(null),
  ]);
  if (!isNew && !product) notFound();

  return (
    <>
      <PageHeader
        backHref="/admin/products"
        title={product ? (locale === "km" ? product.nameKm : product.nameEn) : a.catalog.newProduct}
      />
      <ProductForm
        product={product}
        categories={categories.map((c) => ({ id: c.id, name: locale === "km" ? c.nameKm : c.nameEn }))}
        canPrice={can("price.edit")}
        canCost={canCost}
      />
    </>
  );
}
