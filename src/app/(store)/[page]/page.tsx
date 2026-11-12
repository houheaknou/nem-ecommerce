import { notFound } from "next/navigation";
import { NemIllustration } from "@/components/brand/nem-illustration";
import { getI18n } from "@/i18n/server";
import { getSetting } from "@/features/settings/queries";

/**
 * Simple content pages linked from the nav/footer.
 */
const PAGES = {
  about: {
    km: { title: "អំពីយើង", body: "យើងជាអាជីវកម្មគ្រួសារនៅខេត្តបាត់ដំបង ដែលធ្វើណែមដោយដៃរៀងរាល់ថ្ងៃ តាមរូបមន្តដែលបន្សល់ទុកពីជំនាន់មុន។" },
    en: { title: "About us", body: "We are a family business in Battambang, hand-making nem every day from a recipe passed down through generations." },
  },
  contact: {
    km: { title: "ទំនាក់ទំនង", body: "ទាក់ទងមកយើងតាមទូរស័ព្ទ Facebook ឬ Telegram — យើងឆ្លើយតបរហ័ស។" },
    en: { title: "Contact us", body: "Reach us by phone, Facebook or Telegram — we reply quickly." },
  },
  privacy: {
    km: { title: "គោលការណ៍ឯកជនភាព និងលក្ខខណ្ឌ", body: "យើងប្រើព័ត៌មានរបស់អ្នក (ឈ្មោះ លេខទូរស័ព្ទ អាសយដ្ឋាន) តែសម្រាប់ដំណើរការការកម្ម៉ង់ និងការដឹកជញ្ជូនប៉ុណ្ណោះ ហើយមិនលក់ ឬចែករំលែកជាមួយភាគីទីបីឡើយ លើកលែងតែក្រុមហ៊ុនដឹកជញ្ជូន។" },
    en: { title: "Privacy & Terms", body: "We use your details (name, phone, address) only to process and deliver your orders, and never sell or share them with third parties other than the delivery provider." },
  },
} as const;

export default async function ContentPage({ params }: PageProps<"/[page]">) {
  const { page } = await params;
  const entry = PAGES[page as keyof typeof PAGES];
  if (!entry) notFound();
  const [{ locale }, phone] = await Promise.all([getI18n(), getSetting("business.phone", "")]);
  const c = entry[locale];
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <NemIllustration className="mb-4 h-28 w-36" />
      <h1 className="mb-4 font-heading text-3xl font-black">{c.title}</h1>
      <p className="leading-relaxed text-foreground/85">{c.body}</p>
      {page === "contact" && phone && (
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground">
          {phone}
        </a>
      )}
    </div>
  );
}
