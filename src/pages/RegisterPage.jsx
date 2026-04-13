import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser } from '../services/api.js';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorMessage } from '../utils/apiErrorMessage.js';
import { logoUrl } from '../assets/branding.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t, tf, lang } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2 && phone.trim().length >= 9;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      await registerUser({ name: name.trim(), phone });
      navigate('/otp', { state: { phone, from: '/' } });
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary to-primary-400 p-12 flex-col justify-between">
        <div>
          <img
            src={logoUrl}
            alt={t('brandName')}
            className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto max-w-[min(440px,90vw)] object-contain object-start brightness-0 invert opacity-95"
          />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            {t('registerHeroTitle1')}<br />{t('registerHeroTitle2')}
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed">
            {t('registerHeroBody')}
          </p>
        </div>
        <p className="text-primary-200 text-sm">{tf('loginCopyright', { year })}</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-gray-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img
              src={logoUrl}
              alt={t('brandName')}
              className="h-28 w-auto max-w-[min(520px,96vw)] sm:h-32 object-contain object-start dark:brightness-110"
            />
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{t('createYourAccount')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {t('registerIntro')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('nameLabel')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rtl:left-auto rtl:right-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="input pl-9 rtl:pr-9 rtl:pl-4"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {t('phoneNumber')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400 rtl:left-auto rtl:right-3">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700 pr-2 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-2">+966</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('phoneExamplePlaceholder')}
                  className="input pl-20 rtl:pr-20 rtl:pl-4"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{t('register')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            {t('haveAccount')}{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
