import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Instagram, Mail, Phone } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import {
  logoUrl,
  linkedInCompanyUrl,
  instagramUrl,
  contactEmail,
  contactPhone,
  contactPhoneDisplay,
  termsOfServiceUrl,
} from '../../assets/branding.js';

const supplierFormNextUrl = () => {
  if (typeof window === 'undefined') return 'https://hasm.io/';
  return `${window.location.origin}${window.location.pathname}${window.location.search}#supplier-interest`;
};

export default function Footer() {
  const { t, tf, isRTL } = useLanguage();
  const year = new Date().getFullYear();
  const [supplierFormNext] = useState(supplierFormNextUrl);

  const onSupplierFormSubmit = (e) => {
    const form = e.currentTarget;
    const input = form.querySelector('input[name="phone"]');
    const phone = input?.value?.trim() ?? '';
    if (!phone) {
      e.preventDefault();
      input?.focus();
    }
  };

  const shopLinks = [
    { labelKey: 'footerCategoryAll', to: '/' },
    { labelKey: 'footerCategoryFashion', to: '/' },
    { labelKey: 'footerCategoryHomeLiving', to: '/' },
    { labelKey: 'footerCategoryElectronics', to: '/' },
    { labelKey: 'footerCategoryAutomotive', to: '/' },
  ];

  const accountLinks = [
    { labelKey: 'orders', to: '/orders' },
    { labelKey: 'favorites', to: '/favorites' },
    { labelKey: 'liveAuctions', to: '/auctions' },
    { labelKey: 'profile', to: '/profile' },
  ];

  return (
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center mb-5" aria-label={t('brandName')}>
              <img
                src={logoUrl}
                alt=""
                className="h-16 sm:h-20 md:h-[5.25rem] w-auto max-w-[min(400px,88vw)] object-contain object-start brightness-110"
              />
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              {t('footerTagline')}
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[
                { Icon: Linkedin,  label: t('footerSocialLinkedIn'), href: linkedInCompanyUrl },
                { Icon: Instagram, label: 'Instagram',               href: instagramUrl },
                { Icon: Mail,      label: 'Email',                   href: `mailto:${contactEmail}` },
                { Icon: Phone,     label: contactPhoneDisplay,        href: `tel:${contactPhone}` },
              ].map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary transition-colors flex items-center justify-center text-gray-400 hover:text-white"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">{t('footerShop')}</h4>
            <ul className="space-y-2 text-sm">
              {shopLinks.map(({ labelKey, to }) => (
                <li key={labelKey}>
                  <Link to={to} className="hover:text-white transition-colors">{t(labelKey)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">{t('footerAccount')}</h4>
            <ul className="space-y-2 text-sm">
              {accountLinks.map(({ labelKey, to }) => (
                <li key={labelKey}>
                  <Link to={to} className="hover:text-white transition-colors">{t(labelKey)}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section
          id="supplier-interest"
          className="mt-12 w-full max-w-md"
          dir={isRTL ? 'rtl' : 'ltr'}
          aria-labelledby="footer-supplier-heading"
        >
            <h3
              id="footer-supplier-heading"
              className="mb-2 text-start text-sm font-semibold text-white sm:text-base"
            >
              {t('footerSupplierTitle')}
            </h3>
            <p className="mb-4 max-w-xl text-start text-sm leading-relaxed text-gray-400">
              {t('footerSupplierLead')}
            </p>
            <form
              action="https://formsubmit.co/info@hasm.io"
              method="POST"
              noValidate
              onSubmit={onSupplierFormSubmit}
              dir="ltr"
              className="w-full max-w-md"
              aria-label={t('footerSupplierFormAria')}
            >
              <input type="hidden" name="_next" value={supplierFormNext} />
              <input type="hidden" name="_subject" value={t('footerSupplierEmailSubject')} />
              <input type="hidden" name="_template" value="table" />
              {/* EN: phone then Send (right). AR: row-reverse → Send left of phone; DOM tel before button for tab order */}
              <div
                className={`flex w-full flex-nowrap items-center justify-start gap-2 ${
                  isRTL ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder={t('footerSupplierPlaceholder')}
                  aria-label={t('footerSupplierPhoneAria')}
                  className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:min-w-[200px]"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  {t('footerSupplierSend')}
                </button>
              </div>
            </form>
        </section>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>{tf('copyrightLine', { year })}</p>
          <a
            href={termsOfServiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            {t('termsOfService')}
          </a>
        </div>
      </div>
    </footer>
  );
}
