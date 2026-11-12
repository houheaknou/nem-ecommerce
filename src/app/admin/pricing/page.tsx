import { PageHeader } from "@/components/admin/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageGuard } from "@/features/auth/guard";
import { getTiersByVariant, listCustomerPriceLists, listPricingVariants, listPromotions } from "@/features/pricing/queries";
import { getI18n } from "@/i18n/server";
import { TierEditor } from "./tier-editor";
import { PriceListsPanel } from "./price-lists-panel";
import { PromotionsPanel } from "./promotions-panel";

export default async function PricingPage() {
  await pageGuard("price.edit");
  const [{ a }, variants, tiers, lists, promotions] = await Promise.all([
    getI18n(),
    listPricingVariants(),
    getTiersByVariant(null),
    listCustomerPriceLists(),
    listPromotions(),
  ]);
  return (
    <>
      <PageHeader title={a.pricing.title} />
      <Tabs defaultValue="wholesale">
        <TabsList className="mb-4 rounded-full">
          <TabsTrigger value="wholesale" className="rounded-full">{a.pricing.wholesaleTiers}</TabsTrigger>
          <TabsTrigger value="customers" className="rounded-full">{a.pricing.customerLists}</TabsTrigger>
          <TabsTrigger value="promotions" className="rounded-full">{a.pricing.promotions}</TabsTrigger>
        </TabsList>
        <TabsContent value="wholesale" className="space-y-3">
          <p className="text-sm text-muted-foreground">{a.pricing.wholesaleHint}</p>
          <div className="grid gap-3 xl:grid-cols-2">
            {variants.map((v) => (
              <TierEditor key={v.id} variant={v} initial={tiers[v.id] ?? []} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="customers">
          <PriceListsPanel lists={lists} />
        </TabsContent>
        <TabsContent value="promotions">
          <PromotionsPanel promotions={promotions} variants={variants} />
        </TabsContent>
      </Tabs>
    </>
  );
}
