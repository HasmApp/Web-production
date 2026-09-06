import { useEffect, useRef, useState } from 'react';
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
    title: 'Every product deserves its best destination',
    intro:
      'HASM connects inventory supply with verified business demand, then routes every opportunity through the right public, private, or recycling channel',
    browse: 'Browse the marketplace',
    requestStock: 'Request stock',
    company: 'List company inventory',
    trust: 'Built for companies managing real inventory',
    brandMark: 'HASM',
    brandLine: 'Where supply finds its demand',
    verifiedTitle: 'A trusted company for both sides',
    verifiedSub: 'Sell stock securely — buy through a verified party',
    supply: 'Supply',
    supplyText: 'Add your company stock to the platform',
    demand: 'Demand',
    demandText: 'Tell us what your company needs to buy',
    intelligence: 'HASM handles the rest',
    intelligenceText: 'Organizing the stock and finding the right fit happens inside HASM — not in public',
    routesTitle: 'One data layer — the right route for every item',
    routesText:
      'HASM is not only a marketplace — it is the infrastructure between inventory systems, demand signals, and approved distribution channels',
    private: 'Private channel',
    privateText: 'Confidential inventory shown only to selected, approved buyers',
    public: 'Open B2B marketplace',
    publicText: 'Approved public listings available for business discovery and inquiry',
    recovery: 'Recycling',
    recoveryText: 'A responsible destination for expired or non-sellable inventory',
    howTitle: 'You share the stock — HASM handles the rest',
    step1: 'Add what you have or need',
    step1Text: 'Send the stock you want to sell, or what your company wants to buy',
    step2: 'HASM prepares it',
    step2Text: 'We organize the opportunity inside our system',
    step3: 'You get the outcome',
    step3Text: 'A secure sale or a trusted purchase, through one party',
    ctaTitle: 'Turn inventory into intelligence',
    ctaText: 'Discover approved public B2B inventory in the HASM marketplace',
  },
  ar: {
    eyebrow: 'بنية تحتية ذكية لمخزون الأعمال',
    title: 'كل منتج يستحق الوجهة الأنسب',
    intro:
      'تربط حسم بين المعروض من المخزون واحتياجات الشركات الموثوقة، ثم توجه كل فرصة عبر القناة العامة أو الخاصة أو مسار التدوير الأنسب',
    browse: 'استعرض السوق',
    requestStock: 'طلب مخزون',
    company: 'أضف مخزون شركتك',
    trust: 'مصممة للشركات التي تدير مخزونًا حقيقيًا',
    brandMark: 'حسم',
    brandLine: 'حيث يجد العرض طلبه',
    verifiedTitle: 'جهة موثوقة للطرفين',
    verifiedSub: 'بِع مخزونك بأمان — واشترِ عبر طرف موثّق',
    supply: 'المعروض',
    supplyText: 'أضف مخزون شركتك إلى المنصة',
    demand: 'الطلب',
    demandText: 'أخبرونا بما تريد شركتكم شراءه',
    intelligence: 'حسم تتولى الباقي',
    intelligenceText: 'ترتيب المخزون وإيجاد التوافق يتم داخل حسم — وليس علنًا',
    routesTitle: 'طبقة بيانات واحدة — والمسار الأنسب لكل منتج',
    routesText:
      'حسم ليست مجرد سوق، بل البنية التي تربط أنظمة المخزون وإشارات الطلب وقنوات التوزيع المعتمدة',
    private: 'القناة الخاصة',
    privateText: 'مخزون سري لا يظهر إلا للمشترين المختارين والمعتمدين',
    public: 'سوق الأعمال المفتوح',
    publicText: 'منتجات معتمدة للعرض العام والاكتشاف والتواصل بين الشركات',
    recovery: 'إعادة التدوير',
    recoveryText: 'وجهة مسؤولة للمخزون المنتهي أو غير القابل للبيع',
    howTitle: 'أنتم تشاركون المخزون — حسم تتولى الباقي',
    step1: 'أضيفوا ما لديكم أو ما تحتاجونه',
    step1Text: 'أرسلوا المخزون الذي تريدون بيعه، أو ما تريد شركتكم شراءه',
    step2: 'حسم تجهّزه',
    step2Text: 'نرتّب الفرصة داخل نظامنا',
    step3: 'تصلون للنتيجة',
    step3Text: 'بيع آمن أو شراء موثوق، عبر جهة واحدة',
    ctaTitle: 'حوّل المخزون إلى معرفة',
    ctaText: 'اكتشف مخزون الأعمال المعتمد للعرض العام في سوق حسم',
  },
};

export default function LandingPage() {
  const { lang } = useLanguage();
  const c = COPY[lang] || COPY.en;
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight;
  const [heroShift, setHeroShift] = useState(0);
  const [flowSide, setFlowSide] = useState('supply');
  const [flowPaused, setFlowPaused] = useState(false);
  const [activeRoute, setActiveRoute] = useState(1);
  const [activeStep, setActiveStep] = useState(0);
  const routesRef = useRef(null);
  const howRef = useRef(null);
  const [routesVisible, setRoutesVisible] = useState(false);
  const [howVisible, setHowVisible] = useState(false);

  useEffect(() => {
    document.title = lang === 'ar'
      ? 'حسم | ذكاء المخزون وسوق الأعمال'
      : 'HASM | B2B Inventory Intelligence';
    const description =
      lang === 'ar'
        ? 'منصة حسم لربط مخزون الشركات بالطلب الموثوق والقناة المناسبة.'
        : 'HASM connects business inventory with verified demand and the right channel.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [lang]);

  useEffect(() => {
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motionOk) return undefined;
    const onScroll = () => setHeroShift(Math.min(window.scrollY * 0.18, 80));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motionOk) return undefined;
    const timer = setInterval(() => {
      if (flowPaused) return;
      setFlowSide((current) => (current === 'supply' ? 'demand' : 'supply'));
    }, 3200);
    return () => clearInterval(timer);
  }, [flowPaused]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setRoutesVisible(true);
      setHowVisible(true);
      return undefined;
    }
    const reveal = (el, setVisible) => {
      if (!el) return () => {};
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.16 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    };
    const stopRoutes = reveal(routesRef.current, setRoutesVisible);
    const stopHow = reveal(howRef.current, setHowVisible);
    const fallback = window.setTimeout(() => {
      setRoutesVisible(true);
      setHowVisible(true);
    }, 1800);
    return () => {
      stopRoutes();
      stopHow();
      window.clearTimeout(fallback);
    };
  }, []);

  const routes = [
    { icon: LockKeyhole, title: c.private, text: c.privateText, to: 'https://dashboard.hasm.io' },
    { icon: Globe2, title: c.public, text: c.publicText, to: '/marketplace' },
    { icon: Recycle, title: c.recovery, text: c.recoveryText, to: '/marketplace' },
  ];
  const steps = [
    { title: c.step1, text: c.step1Text },
    { title: c.step2, text: c.step2Text },
    { title: c.step3, text: c.step3Text },
  ];

  return (
    <div className="bg-[#F7F7F7] text-black dark:bg-neutral-950 dark:text-white">
      <section className="relative isolate overflow-hidden bg-black text-white">
        <img
          src={warehouseBg}
          alt=""
          className="absolute inset-0 h-[120%] w-full object-cover object-center will-change-transform"
          style={{ transform: `translateY(${heroShift}px) scale(1.08)` }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/62 to-black/28 rtl:bg-gradient-to-l" />
        <div className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1.2fr_.8fr] lg:px-10">
          <div className="max-w-3xl">
            <p className="landing-reveal landing-reveal-d1 mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
              <ShieldCheck className="h-4 w-4" />
              {c.eyebrow}
            </p>
            <h1 className="landing-reveal landing-reveal-d2 text-balance text-5xl font-black leading-[1.08] sm:text-6xl lg:text-7xl">
              {c.title}
            </h1>
            <p className="landing-reveal landing-reveal-d3 mt-7 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
              {c.intro}
            </p>
            <div className="landing-reveal landing-reveal-d4">
              <CertifiedProductsBanner
                variant="hero"
                className="mt-7"
                title={c.verifiedTitle}
                subtitle={c.verifiedSub}
              />
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/marketplace"
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-black transition hover:-translate-y-0.5 hover:bg-neutral-100"
                >
                  {c.browse}
                  <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
                <Link
                  to="/demand"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  {c.requestStock}
                </Link>
                <a
                  href="https://dashboard.hasm.io"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <Building2 className="h-4 w-4" />
                  {c.company}
                </a>
              </div>
            </div>
          </div>

          <div className="landing-reveal landing-reveal-d3 border-s border-white/20 ps-8 sm:ps-10">
            <p className="text-sm text-white/50">{c.trust}</p>
            <div
              className="mt-10 flex items-start justify-between gap-4"
              onMouseEnter={() => setFlowPaused(true)}
              onMouseLeave={() => setFlowPaused(false)}
            >
              <a
                href="https://dashboard.hasm.io"
                onMouseEnter={() => setFlowSide('supply')}
                onFocus={() => setFlowSide('supply')}
                className={`max-w-[9.5rem] text-start no-underline transition ${flowSide === 'supply' ? 'text-white' : 'text-white/45'}`}
              >
                <p className="text-lg font-semibold">{c.supply}</p>
                <p className="mt-2 text-sm leading-6">{c.supplyText}</p>
              </a>
              <div className="flex min-w-0 flex-1 items-center self-center px-1">
                <span className="landing-flow-line h-px flex-1 bg-white/35" />
                <span className={`mx-2 h-2.5 w-2.5 rotate-45 bg-white transition ${flowSide === 'demand' ? 'scale-125' : ''}`} />
                <span className="landing-flow-line h-px flex-1 bg-white/35" />
              </div>
              <Link
                to="/demand"
                onMouseEnter={() => setFlowSide('demand')}
                onFocus={() => setFlowSide('demand')}
                className={`max-w-[9.5rem] text-end no-underline transition ${flowSide === 'demand' ? 'text-white' : 'text-white/45'}`}
              >
                <p className="text-lg font-semibold">{c.demand}</p>
                <p className="mt-2 text-sm leading-6">{c.demandText}</p>
              </Link>
            </div>
            <div className="mt-12">
              <BrandWordmark invert size="md" />
            </div>
            <p className="mt-3 text-sm text-white/55">{c.brandLine}</p>
            <p className="mt-6 max-w-sm text-sm leading-6 text-white/45">{c.intelligenceText}</p>
          </div>
        </div>
      </section>

      <section ref={routesRef} className={`mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 ${routesVisible ? 'landing-reveal' : 'opacity-0'}`}>
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black leading-tight sm:text-5xl">{c.routesTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-[#5F566C] dark:text-white/60">{c.routesText}</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {routes.map(({ icon: Icon, title, text, to }, index) => {
            const selected = activeRoute === index;
            const inner = (
              <>
                <Icon className={`h-7 w-7 ${selected ? 'text-white' : 'text-black dark:text-white'}`} />
                <h3 className="mt-8 text-2xl font-bold">{title}</h3>
                <p className={`mt-3 leading-7 ${selected ? 'text-white/70' : 'text-[#6C6377] dark:text-white/60'}`}>{text}</p>
              </>
            );
            const className = `block rounded-2xl border p-7 text-start no-underline transition duration-200 hover:-translate-y-1 ${
              selected
                ? 'border-black bg-black text-white shadow-lg'
                : 'border-[#DED9E5] bg-white text-inherit dark:border-white/10 dark:bg-white/5'
            }`;
            if (to.startsWith('http')) {
              return (
                <a
                  key={title}
                  href={to}
                  className={className}
                  onMouseEnter={() => setActiveRoute(index)}
                  onFocus={() => setActiveRoute(index)}
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link
                key={title}
                to={to}
                className={className}
                onMouseEnter={() => setActiveRoute(index)}
                onFocus={() => setActiveRoute(index)}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#E3DFE8] bg-white dark:border-white/10 dark:bg-neutral-900">
        <div ref={howRef} className={`mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 ${howVisible ? 'landing-reveal' : 'opacity-0'}`}>
          <h2 className="max-w-3xl text-4xl font-black sm:text-5xl">{c.howTitle}</h2>
          <div className="mt-16 max-w-2xl space-y-4">
            {steps.map((step, index) => {
              const selected = activeStep === index;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  onMouseEnter={() => setActiveStep(index)}
                  className={`w-full border-s ps-6 text-start transition ${
                    selected
                      ? 'border-black dark:border-white'
                      : 'border-[#DED9E5] opacity-55 hover:opacity-80 dark:border-white/15'
                  }`}
                >
                  <p className="text-sm font-semibold text-black/35 dark:text-white/35">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold">{step.title}</h3>
                  <p className={`mt-3 overflow-hidden leading-7 text-[#6C6377] transition-all dark:text-white/60 ${
                    selected ? 'max-h-24' : 'max-h-0'
                  }`}>
                    {step.text}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-black px-7 py-12 text-white sm:px-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-4xl font-black">{c.ctaTitle}</h2>
            <p className="mt-3 text-lg text-white/65">{c.ctaText}</p>
          </div>
          <Link
            to="/marketplace"
            className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-black transition hover:-translate-y-0.5"
          >
            {c.browse}
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}
