import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe2,
  LockKeyhole,
  Recycle,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import CertifiedProductsBanner from '../components/shop/CertifiedProductsBanner.jsx';
import BrandWordmark from '../components/brand/BrandWordmark.jsx';
import warehouseBg from '../assets/landing-warehouse.png';

const COPY = {
  en: {
    eyebrow: 'B2B inventory intelligence infrastructure',
    title: 'Every product deserves its best destination.',
    intro:
      'HASM connects inventory supply with verified business demand, then routes every opportunity through the right public, private, or recovery channel.',
    browse: 'Browse the marketplace',
    company: 'List company inventory',
    trust: 'Built for companies managing real inventory',
    brandMark: 'HASM',
    brandLine: 'Where supply finds its demand.',
    verifiedTitle: 'A trusted company for both sides',
    verifiedSub: 'Sell stock securely. Buy through a verified party.',
    supply: 'Supply',
    supplyText: 'Add your company stock to the platform.',
    demand: 'Demand',
    demandText: 'Tell us what your company needs to buy.',
    intelligence: 'HASM handles the rest',
    intelligenceText: 'Organizing the stock and finding the right fit happens inside HASM — not in public.',
    routesTitle: 'One data layer. The right route for every item.',
    routesText:
      'HASM is not only a marketplace. It is the infrastructure between inventory systems, demand signals, and approved distribution channels.',
    private: 'Private channel',
    privateText: 'Confidential inventory shown only to selected, approved buyers.',
    public: 'Open B2B marketplace',
    publicText: 'Approved public listings available for business discovery and inquiry.',
    recovery: 'Recycling & recovery',
    recoveryText: 'A responsible destination for expired or non-sellable inventory.',
    howTitle: 'You share the stock. HASM handles the rest.',
    step1: 'Add what you have or need',
    step1Text: 'Send the stock you want to sell, or what your company wants to buy.',
    step2: 'HASM prepares it',
    step2Text: 'We organize the opportunity inside our system. That work is not shown to the other side.',
    step3: 'You get the outcome',
    step3Text: 'A secure sale or a trusted purchase, through one party.',
    ctaTitle: 'Turn inventory into intelligence.',
    ctaText: 'Discover approved public B2B inventory in the HASM marketplace.',
  },
  ar: {
    eyebrow: 'بنية تحتية ذكية لمخزون الأعمال',
    title: 'كل منتج يستحق الوجهة الأنسب.',
    intro:
      'تربط حسم بين المعروض من المخزون واحتياجات الشركات الموثوقة، ثم توجه كل فرصة عبر القناة العامة أو الخاصة أو مسار الاسترداد الأنسب.',
    browse: 'استعرض السوق',
    company: 'أضف مخزون شركتك',
    trust: 'مصممة للشركات التي تدير مخزونًا حقيقيًا',
    brandMark: 'حسم',
    brandLine: 'حيث يجد العرض طلبه.',
    verifiedTitle: 'جهة موثوقة للطرفين',
    verifiedSub: 'بِع مخزونك بأمان. واشترِ عبر طرف موثّق.',
    supply: 'المعروض',
    supplyText: 'أضف مخزون شركتك إلى المنصة.',
    demand: 'الطلب',
    demandText: 'أخبرونا بما تريد شركتكم شراءه.',
    intelligence: 'حسم تتولى الباقي',
    intelligenceText: 'ترتيب المخزون وإيجاد التوافق يتم داخل حسم — وليس علنًا.',
    routesTitle: 'طبقة بيانات واحدة. والمسار الأنسب لكل منتج.',
    routesText:
      'حسم ليست مجرد سوق، بل البنية التي تربط أنظمة المخزون وإشارات الطلب وقنوات التوزيع المعتمدة.',
    private: 'القناة الخاصة',
    privateText: 'مخزون سري لا يظهر إلا للمشترين المختارين والمعتمدين.',
    public: 'سوق الأعمال المفتوح',
    publicText: 'منتجات معتمدة للعرض العام والاكتشاف والتواصل بين الشركات.',
    recovery: 'إعادة التدوير والاسترداد',
    recoveryText: 'وجهة مسؤولة للمخزون المنتهي أو غير القابل للبيع.',
    howTitle: 'أنتم تشاركون المخزون. حسم تتولى الباقي.',
    step1: 'أضيفوا ما لديكم أو ما تحتاجونه',
    step1Text: 'أرسلوا المخزون الذي تريدون بيعه، أو ما تريد شركتكم شراءه.',
    step2: 'حسم تجهّزه',
    step2Text: 'نرتّب الفرصة داخل نظامنا. هذا العمل لا يظهر للطرف الآخر.',
    step3: 'تصلون للنتيجة',
    step3Text: 'بيع آمن أو شراء موثوق، عبر جهة واحدة.',
    ctaTitle: 'حوّل المخزون إلى معرفة.',
    ctaText: 'اكتشف مخزون الأعمال المعتمد للعرض العام في سوق حسم.',
  },
};

export default function LandingPage() {
  const { lang } = useLanguage();
  const c = COPY[lang] || COPY.en;
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    document.title =
      lang === 'ar'
        ? 'حسم | ذكاء المخزون وسوق الأعمال'
        : 'HASM | B2B Inventory Intelligence';
    const description =
      lang === 'ar'
        ? 'منصة حسم لربط مخزون الشركات بالطلب الموثوق وقنوات التصفية المناسبة.'
        : 'HASM connects business inventory with verified demand and the right liquidation channel.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [lang]);

  const routes = [
    { icon: LockKeyhole, title: c.private, text: c.privateText },
    { icon: Globe2, title: c.public, text: c.publicText },
    { icon: Recycle, title: c.recovery, text: c.recoveryText },
  ];
  const steps = [
    { title: c.step1, text: c.step1Text },
    { title: c.step2, text: c.step2Text },
    { title: c.step3, text: c.step3Text },
  ];

  return (
    <div className="bg-[#F8F7FA] text-[#241B35] dark:bg-[#17121F] dark:text-white">
      <section className="relative isolate overflow-hidden bg-[#2F2446] text-white">
        <img
          src={warehouseBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#2F2446]/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#241B35]/88 via-[#2F2446]/62 to-[#2F2446]/28 rtl:bg-gradient-to-l" />
        <div className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1.2fr_.8fr] lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
              <ShieldCheck className="h-4 w-4" />
              {c.eyebrow}
            </p>
            <h1 className="text-balance text-5xl font-black leading-[1.08] sm:text-6xl lg:text-7xl">
              {c.title}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
              {c.intro}
            </p>
            <CertifiedProductsBanner
              variant="hero"
              className="mt-7"
              title={c.verifiedTitle}
              subtitle={c.verifiedSub}
            />
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-[#2F2446] transition hover:bg-[#F1EDF5]"
              >
                {c.browse}
                <Arrow className="h-4 w-4" />
              </Link>
              <a
                href="https://dashboard.hasm.io"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                <Building2 className="h-4 w-4" />
                {c.company}
              </a>
            </div>
          </div>

          <div className="border-s border-white/20 ps-8 sm:ps-10">
            <p className="text-sm text-white/50">{c.trust}</p>
            <div className="mt-10 flex items-start justify-between gap-4">
              <div className="max-w-[9.5rem]">
                <p className="text-lg font-semibold">{c.supply}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{c.supplyText}</p>
              </div>
              <div className="flex min-w-0 flex-1 items-center self-center px-1">
                <span className="h-px flex-1 bg-white/35" />
                <span className="mx-2 h-2.5 w-2.5 rotate-45 bg-white" />
                <span className="h-px flex-1 bg-white/35" />
              </div>
              <div className="max-w-[9.5rem] text-end">
                <p className="text-lg font-semibold">{c.demand}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{c.demandText}</p>
              </div>
            </div>
            <div className="mt-12">
              <BrandWordmark invert size="md" />
            </div>
            <p className="mt-3 text-sm text-white/55">{c.brandLine}</p>
            <p className="mt-6 max-w-sm text-sm leading-6 text-white/45">{c.intelligenceText}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black leading-tight sm:text-5xl">{c.routesTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-[#5F566C] dark:text-white/60">{c.routesText}</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {routes.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-[#DED9E5] bg-white p-7 dark:border-white/10 dark:bg-white/5">
              <Icon className="h-7 w-7 text-[#2F2446] dark:text-white" />
              <h3 className="mt-8 text-2xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-[#6C6377] dark:text-white/60">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#E3DFE8] bg-white dark:border-white/10 dark:bg-[#211A2D]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
          <h2 className="max-w-3xl text-4xl font-black sm:text-5xl">{c.howTitle}</h2>
          <div className="mt-16 max-w-2xl space-y-10">
            {steps.map(({ title, text }) => (
              <div key={title} className="border-s border-[#DED9E5] ps-6 dark:border-white/15">
                <h3 className="text-2xl font-bold">{title}</h3>
                <p className="mt-3 leading-7 text-[#6C6377] dark:text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-[#2F2446] px-7 py-12 text-white sm:px-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-4xl font-black">{c.ctaTitle}</h2>
            <p className="mt-3 text-lg text-white/65">{c.ctaText}</p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-[#2F2446]"
          >
            {c.browse}
            <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
