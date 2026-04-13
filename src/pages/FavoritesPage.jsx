import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { fetchProducts } from '../services/api.js';
import ProductCard from '../components/product/ProductCard.jsx';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const FAVORITES_KEY = 'hasm_favorites';

export default function FavoritesPage() {
  const { t, tf } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favIds = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        if (favIds.length === 0) { setLoading(false); return; }
        const all = await fetchProducts();
        const items = Array.isArray(all) ? all : all?.items || [];
        setProducts(items.filter((p) => favIds.includes(p._id) || favIds.includes(p.id)));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-red-500" fill="currentColor" />
        </div>
        <div>
          <h1 className="section-title">{t('favoritesTitle')}</h1>
          {!loading && products.length > 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">{tf('savedItemsCount', { n: products.length })}</p>
          )}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t('noFavoritesTitle')}
          description={t('noFavoritesDesc')}
          action={<Link to="/" className="btn-primary">{t('browseProducts')}</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
