import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { listCategories } from "@/features/catalog/admin-queries";
import { getI18n } from "@/i18n/server";
import { CategoryManager } from "./category-manager";

export default async function CategoriesPage() {
  await pageGuard("product.edit");
  const [{ a }, categories] = await Promise.all([getI18n(), listCategories()]);
  return (
    <>
      <PageHeader title={a.catalog.categories} />
      <CategoryManager categories={categories} />
    </>
  );
}
