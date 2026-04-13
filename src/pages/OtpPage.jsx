import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyOTP, loginUser, getMe } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { apiErrorMessage } from '../utils/apiErrorMessage.js';
import { logoUrl } from '../assets/branding.js';

const OTP_LENGTH = 6;

export default function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t, tf, lang } = useLanguage();
  const phone = location.state?.phone || '';
  const from = location.state?.from || '/';

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!phone) navigate('/login');
    inputRefs.current[0]?.focus();
  }, [phone, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const tick = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(tick);
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (next.every(Boolean)) handleVerify(next.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    const next = [...digits];
    text.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    if (text.length === OTP_LENGTH) handleVerify(text);
  };

  const handleVerify = async (code) => {
    setLoading(true);
    try {
      const data = await verifyOTP(phone, code);
      const userData = await getMe();
      login(userData, { access_token: data.access_token, refresh_token: data.refresh_token });
      toast.success(t('otpWelcome'));
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, lang, t, 'invalidOtp'));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await loginUser(phone);
      setResendCooldown(60);
      toast.success(t('codeResent'));
    } catch {
      toast.error(t('resendFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm min-w-0 mx-auto">
        <div className="mb-8 sm:mb-10 min-w-0">
          <img
            src={logoUrl}
            alt={t('brandName')}
            className="h-28 w-auto max-w-[min(520px,96vw)] sm:h-32 object-contain object-start dark:brightness-110 lg:h-20 lg:max-w-[min(360px,90vw)]"
          />
        </div>

        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-5 sm:mb-6">
          <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
          {t('otpEnterCode')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 sm:mb-8 leading-relaxed">
          {tf('otpSentLine', { n: OTP_LENGTH })}{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-300 break-all inline-block max-w-full" dir="ltr">
            {phone}
          </span>
        </p>

        <div
          dir="ltr"
          className="grid grid-cols-6 gap-1.5 sm:gap-2.5 mb-6 w-full min-w-0"
          onPaste={handlePaste}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              dir="ltr"
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`min-w-0 w-full h-10 min-h-[40px] sm:h-12 sm:min-h-0 text-center text-base sm:text-lg font-bold rounded-lg sm:rounded-xl border-2 transition-colors duration-200 bg-white dark:bg-gray-900 outline-none ${
                digit
                  ? 'border-primary text-primary'
                  : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
              } focus:border-primary`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => handleVerify(digits.join(''))}
          disabled={loading || digits.some((d) => !d)}
          className="btn-primary w-full py-3 text-sm sm:text-base min-h-[48px]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            t('verifyCode')
          )}
        </button>

        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between mt-6 min-w-0">
          <Link
            to="/login"
            className="flex items-center justify-center sm:justify-start gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0 rtl:rotate-180" /> {t('changeNumber')}
          </Link>
          {resendCooldown > 0 ? (
            <p className="text-sm text-gray-400 text-center sm:text-end">{tf('resendIn', { s: resendCooldown })}</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-primary font-semibold hover:underline text-center sm:text-end py-1"
            >
              {t('resendCode')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
