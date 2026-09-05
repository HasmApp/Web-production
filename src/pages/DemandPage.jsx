import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import DemandSection from '../components/demand/DemandSection.jsx';

export default function DemandPage() {
  const { t, lang } = useLanguage();

  useEffect(() => {
    document.title = t('demandDocumentTitle');
  }, [lang, t]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <DemandSection />
    </div>
  );
}
