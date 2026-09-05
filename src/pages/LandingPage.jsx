import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  Database,
  GitMerge,
  Globe2,
  LockKeyhole,
  Recycle,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const COPY = {
  en: {
    eyebrow: 'B2B inventory intelligence infrastructure',
    title: 'Every product deserves its best destination.',
    intro:
      'HASM connects inventory supply with verified business demand, then routes every opportunity through the right public, private, or recovery channel.',
    browse: 'Browse the marketplace',
    company: 'List company inventory',
    trust: 'Built for companies managing real inventory',
    supply: 'Supply',
    supplyText: 'Connect ERP, WMS, and inventory systems—or add stock manually and by Excel.',
    demand: 'Demand',
    demandText: 'Capture what companies consume, purchase, and need through structured requests and bulk uploads.',
    intelligence: 'Intelligence & matching',
    intelligenceText: 'Compare product, quantity, location, timing, condition, price, and company policy.',
    routesTitle: 'One data layer. The right route for every item.',
    routesText:
      'HASM is not only a marketplace. It is the infrastructure between inventory systems, demand signals, and approved distribution channels.',
    private: 'Private channel',
    privateText: 'Confidential inventory shown only to selected, approved buyers.',
    public: 'Open B2B marketplace',
    publicText: 'Approved public listings available for business discovery and inquiry.',
    recovery: 'Recycling & recovery',
    recoveryText: 'A responsible destination for expired or non-sellable inventory.',
    howTitle: 'From fragmented data to a clear decision',
    step1: 'Bring the data',
    step1Text: 'API connections, manual entry, and reusable Excel imports.',
    step2: 'Understand the opportunity',
    step2Text: 'Lifecycle visibility identifies new, surplus, at-risk, dead, and expired stock.',
    step3: 'Match and route',
    step3Text: 'Connect compatible supply and demand while respecting each company’s policies.',
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
    supply: 'المعروض',
    supplyText: 'اربط أنظمة ERP وWMS والمخزون، أو أضف المنتجات يدويًا ومن خلال ملفات إكسل.',
    demand: 'الطلب',
    demandText: 'اجمع ما تستهلكه الشركات وتشتريه وتحتاجه عبر طلبات منظمة ورفع جماعي.',
    intelligence: 'الذكاء والمطابقة',
    intelligenceText: 'قارن المنتج والكمية والموقع والتوقيت والحالة والسعر وسياسات الشركة.',
    routesTitle: 'طبقة بيانات واحدة. والمسار الأنسب لكل منتج.',
    routesText:
      'حسم ليست مجرد سوق، بل البنية التي تربط أنظمة المخزون وإشارات الطلب وقنوات التوزيع المعتمدة.',
    private: 'القناة الخاصة',
    privateText: 'مخزون سري لا يظهر إلا للمشترين المختارين والمعتمدين.',
    public: 'سوق الأعمال المفتوح',
    publicText: 'منتجات معتمدة للعرض العام والاكتشاف والتواصل بين الشركات.',
    recovery: 'إعادة التدوير والاسترداد',
    recoveryText: 'وجهة مسؤولة للمخزون المنتهي أو غير القابل للبيع.',
    howTitle: 'من بيانات متفرقة إلى قرار واضح',
    step1: 'اجمع البيانات',
    step1Text: 'تكاملات API وإدخال يدوي واستيراد إكسل قابل لإعادة الاستخدام.',
    step2: 'افهم الفرصة',
    step2Text: 'توضح دورة الحياة المخزون الجديد والفائض والمعرض للخطر والراكد والمنتهي.',
    step3: 'طابق ووجّه',
    step3Text: 'اربط العرض بالطلب المتوافق مع احترام سياسات كل شركة.',
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

  const pillars = [
    { icon: Boxes, title: c.supply, text: c.supplyText },
    { icon: Search, title: c.demand, text: c.demandText },
    { icon: GitMerge, title: c.intelligence, text: c.intelligenceText },
  ];
  const routes = [
    { icon: LockKeyhole, title: c.private, text: c.privateText },
    { icon: Globe2, title: c.public, text: c.publicText },
    { icon: Recycle, title: c.recovery, text: c.recoveryText },
  ];
  const steps = [
    { icon: Upload, title: c.step1, text: c.step1Text },
    { icon: Database, title: c.step2, text: c.step2Text },
    { icon: GitMerge, title: c.step3, text: c.step3Text },
  ];

  return (
    <div className="bg-[#F8F7FA] text-[#241B35] dark:bg-[#17121F] dark:text-white">
      <section className="relative isolate overflow-hidden bg-[#2F2446] text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:64px_64px]" />
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

          <div className="rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm sm:p-8">
            <p className="mb-7 text-sm font-semibold uppercase tracking-[.15em] text-white/55">
              {c.trust}
            </p>
            <div className="space-y-7">
              {pillars.map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-white/40">0{index + 1}</span>
                      <h2 className="text-xl font-bold">{title}</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <div key={title}>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-[#897C99]">0{index + 1}</span>
                  <Icon className="h-6 w-6 text-[#2F2446] dark:text-white" />
                </div>
                <h3 className="mt-6 text-2xl font-bold">{title}</h3>
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
