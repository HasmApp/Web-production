import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginUser } from '../services/api.js';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorMessage } from '../utils/apiErrorMessage.js';
import { logoUrl } from '../assets/branding.js';
import CurrencyIcon from '../components/common/CurrencyIcon.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, tf, lang } = useLanguage();
  const from = location.state?.from?.pathname || '/';

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      await loginUser(phone);
      navigate('/otp', { state: { phone, from } });
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'failedSendOtp'));
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
            {t('loginHeroTitle1')}<br />{t('loginHeroTitle2')}
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed">
            {t('loginHeroBody')}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { stat: t('loginStatProductsValue'), label: t('loginStatProducts') },
              { stat: t('loginStatLive'), label: t('statPriceDrops') },
              { stat: <CurrencyIcon size={26} color="#ffffff" />, label: t('statSavingsDaily') },
            ].map(({ stat, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="text-white font-extrabold text-2xl flex items-center justify-center min-h-[2rem]">{stat}</div>
                <p className="text-primary-100 text-sm">{label}</p>
              </div>
            ))}
          </div>
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

          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{t('welcomeBack')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {t('phoneDesc')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{t('sendCode')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            {t('newToHasm')}{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              {t('createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
