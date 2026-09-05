import { HelpCircle, Mail, Shield, Zap, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import BrandWordmark from '../brand/BrandWordmark.jsx';
import {
  termsOfServiceUrl,
  contactEmail,
  ministryOfCommerceLogoUrl,
  vatLogoUrl,
  commercialRegistrationNumber,
  vatRegistrationNumber,
} from '../../assets/branding.js';
import { BOTTOM_NAV_HEIGHT } from '../../design/shopTokens.js';

export default function ShopHomeFooter({ withBottomNav = false }) {
  const { t, tf } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer
      className="shop-home-footer mt-auto"
      style={
        withBottomNav
          ? {
              paddingBottom: `max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + ${BOTTOM_NAV_HEIGHT}px + 1rem))`,
            }
          : undefined
      }
    >
      <div className="shop-home-footer__content">
        <div className="shop-home-footer__left">
          <div className="shop-home-footer__logo-wrap">
            <BrandWordmark size="md" />
          </div>
          <p className="shop-home-footer__copyright">
            © {year} {t('footerRightsReserved')}.
          </p>
          <p className="shop-home-footer__tagline">{t('footerEmpoweringTagline')}</p>
          <a
            href={termsOfServiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shop-home-footer__terms"
          >
            {t('termsOfService')}
          </a>
        </div>

        <div className="shop-home-footer__middle">
          <div className="shop-home-footer__badge">
            <Shield size={16} className="shop-home-footer__badge-icon shop-home-footer__badge-icon--secure" />
            <span>{t('footerSecureReliable')}</span>
          </div>
          <div className="shop-home-footer__badge">
            <Zap size={16} className="shop-home-footer__badge-icon shop-home-footer__badge-icon--fast" />
            <span>{t('footerLightningFast')}</span>
          </div>
        </div>

        <div className="shop-home-footer__right">
          <a href="#" aria-label={t('footerGetSupport')} title={t('footerGetSupport')}>
            <HelpCircle size={20} />
          </a>
          <a href={`mailto:${contactEmail}`} aria-label={t('footerContactUs')} title={t('footerContactUs')}>
            <Mail size={20} />
          </a>
          <a
            href="https://hasm.io"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('footerVisitWebsite')}
            title={t('footerVisitWebsite')}
          >
            <Globe size={20} />
          </a>
        </div>
      </div>

      <div className="footer-compliance-grid shop-home-footer__compliance">
        <img
          src={ministryOfCommerceLogoUrl}
          alt={t('footerCrLogoAlt')}
          className="footer-compliance-logo-moc"
        />
        <img src={vatLogoUrl} alt={t('footerVatLogoAlt')} className="footer-compliance-logo-vat" />
        <p className="shop-home-footer__compliance-number">
          {tf('footerCommercialRegistration', { crNumber: commercialRegistrationNumber })}
        </p>
        <p className="shop-home-footer__compliance-number">
          {tf('footerVatRegistration', { vatNumber: vatRegistrationNumber })}
        </p>
      </div>
    </footer>
  );
}
