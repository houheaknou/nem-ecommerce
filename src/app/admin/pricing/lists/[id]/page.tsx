import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { getPriceList, getTiersByVariant, listPricingVariants } from "@/features/pricing/queries";
import { getI18n } from "@/i18n/server";
import { TierEditor } from "../../tier-editor";
import { PriceListSettings } from "./price-list-settings";

export default async function PriceListPage({ params }: PageProps<"/admin/pricing/lists/[id]">) {
  const { id } = await params;
  await pageGuard("price.edit");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ a }, list, variants, tiers] = await Promise.all([getI18n(), getPriceList(id), listPricingVariants(), getTiersByVariant(id)]);
  if (!list) notFound();
  return (
    <>
      <PageHeader backHref="/admin/pricing" title={list.name} description={a.pricing.customerListsHint} />
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {variants.filter((v) => v.isActive || tiers[v.id]).map((v) => (
            <TierEditor key={v.id} variant={v} initial={tiers[v.id] ?? []} priceListId={list.id} />
          ))}
        </div>
        <PriceListSettings list={list} />
      </div>
    </>
  );
}
