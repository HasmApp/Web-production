import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { createDemand, getMyDemand } from '../services/api.js';

const INITIAL = {
  free_text: '',
  title: '',
  quantity: '',
  unit: 'carton',
  location: '',
  needed_by: '',
  target_price: '',
  company_name: '',
  contact: '',
};

const listFrom = (data) => data?.items || data?.demands || data?.results || (Array.isArray(data) ? data : []);

export default function DemandPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const [form, setForm] = useState(INITIAL);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = t('demandDocumentTitle');
  }, [lang, t]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    getMyDemand()
      .then((data) => active && setItems(listFrom(data)))
      .catch(() => {});
    return () => { active = false; };
  }, [isAuthenticated, saved]);

  useEffect(() => {
    if (!form.company_name && user?.company_name) {
      setForm((current) => ({ ...current, company_name: user.company_name }));
    }
  }, [user, form.company_name]);

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const onChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setSaved(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!form.free_text.trim() && !form.title.trim()) {
      setError(t('demandRequired'));
      return;
    }
    setBusy(true);
    try {
      await createDemand({
        title: form.title.trim() || form.free_text.trim().slice(0, 80),
        free_text: form.free_text.trim(),
        quantity: form.quantity ? Number(form.quantity) : null,
        unit: form.unit || null,
        location: form.location.trim() || null,
        country: 'Saudi Arabia',
        needed_by: form.needed_by || null,
        target_price: form.target_price ? Number(form.target_price) : null,
        currency: 'SAR',
        company_name: form.company_name.trim() || null,
        contact: form.contact.trim() || null,
        visibility: 'private',
        category: 'Food',
      });
      setForm({ ...INITIAL, company_name: form.company_name });
      setSaved(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, props = {}) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <input
        className="input"
        value={form[key]}
        onChange={onChange(key)}
        {...props}
      />
    </label>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('demandPageTitle')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('demandPageHelp')}</p>
      </header>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {saved && <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">{t('demandSubmitted')}</p>}

      <form onSubmit={submit} className="mb-10 space-y-5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('demandFreeText')}</span>
          <textarea
            className="input min-h-[110px]"
            value={form.free_text}
            onChange={onChange('free_text')}
            placeholder={t('demandFreeTextPlaceholder')}
            rows={4}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('title', t('demandProductName'))}
          {field('quantity', t('demandQuantity'), { type: 'number', min: '0' })}
          {field('unit', t('demandUnit'))}
          {field('location', t('demandLocation'))}
          {field('needed_by', t('demandNeededBy'), { type: 'date' })}
          {field('target_price', t('demandTargetPrice'), { type: 'number', min: '0', step: '0.01' })}
          {field('company_name', t('demandCompany'))}
          {field('contact', t('demandContact'))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {t('demandSubmit')}
          </button>
          <Link to="/marketplace" className="btn-ghost">{t('allProducts')}</Link>
        </div>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t('demandMyRequests')}</h2>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800">
          <table className="w-full text-start text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 font-medium">{t('demandProductName')}</th>
                <th className="px-3 py-2 font-medium">{t('demandQuantity')}</th>
                <th className="px-3 py-2 font-medium">{t('demandLocation')}</th>
                <th className="px-3 py-2 font-medium">{t('demandNeededBy')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">{item.title || item.free_text || '—'}</td>
                  <td className="px-3 py-2">{item.quantity ?? '—'} {item.unit || ''}</td>
                  <td className="px-3 py-2">{item.location || item.country || '—'}</td>
                  <td className="px-3 py-2">{item.needed_by || item.required_by || '—'}</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan="4" className="px-3 py-8 text-center text-gray-500">{t('demandNoRequests')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
