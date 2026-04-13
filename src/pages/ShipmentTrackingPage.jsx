import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Truck, CheckCircle, Clock, MapPin, ChevronLeft, RefreshCw } from 'lucide-react';
import { fetchShipmentByOrder, trackShipment } from '../services/api.js';
import { PageLoader } from '../components/common/LoadingSpinner.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { trackingEventLine } from '../utils/apiErrorMessage.js';

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

const STEP_TKEY = {
  pending: 'stepOrderPlaced',
  processing: 'statusProcessing',
  shipped: 'statusShipped',
  out_for_delivery: 'stepOutForDelivery',
  delivered: 'statusDelivered',
};

/** Raw API status → order status translation keys (avoid English slug in UI). */
const SHIPMENT_STATUS_TKEY = {
  pending: 'statusPending',
  confirmed: 'statusConfirmed',
  processing: 'statusProcessing',
  shipped: 'statusShipped',
  out_for_delivery: 'stepOutForDelivery',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
};

export default function ShipmentTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const [shipment, setShipment] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [shipData, trackData] = await Promise.allSettled([
        fetchShipmentByOrder(orderId),
        trackShipment(orderId),
      ]);
      if (shipData.status === 'fulfilled') setShipment(shipData.value);
      if (trackData.status === 'fulfilled') setTracking(trackData.value);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [orderId]);

  if (loading) return <PageLoader />;

  const status = shipment?.status || tracking?.status || 'pending';
  const currentStep = STATUS_STEPS.indexOf(status.toLowerCase());
  const trackingNumber = shipment?.tracking_number || tracking?.tracking_number || '—';
  const carrier = shipment?.carrier || tracking?.carrier || '—';
  const events = tracking?.events || tracking?.history || [];
  const dateLocale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-SA';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/orders')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t('backToOrders')}
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">{t('trackShipmentTitle')}</h1>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-ghost text-sm flex items-center gap-1.5 py-2 px-3"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      <div className="card p-5 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('trackingNumber')}</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm font-mono">{trackingNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('carrier')}</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{carrier}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('orderIdLabel')}</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm font-mono">
              #{orderId?.slice(-8).toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('statusLabel')}</p>
            <p className="font-bold text-primary text-sm">
              {SHIPMENT_STATUS_TKEY[status.toLowerCase()]
                ? t(SHIPMENT_STATUS_TKEY[status.toLowerCase()])
                : status.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-5">{t('deliveryProgress')}</h2>
        <div className="space-y-4">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            const labelKey = STEP_TKEY[step];
            return (
              <div key={step} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    done ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-300'
                  } ${active ? 'ring-4 ring-primary/20' : ''}`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 rounded-full ${done ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'}`} />
                  )}
                </div>
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${done ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {t(labelKey)}
                  </p>
                  {active && (
                    <p className="text-xs text-primary mt-0.5">{t('currentStatus')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {events.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-4">{t('trackingHistory')}</h2>
          <div className="space-y-3">
            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">
                    {trackingEventLine(
                      event.description || event.status || event.message,
                      lang,
                      t
                    )}
                  </p>
                  {(event.location || event.city) && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {event.location || event.city}
                    </p>
                  )}
                  {event.timestamp && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.timestamp).toLocaleString(dateLocale)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!shipment && !tracking && (
        <div className="card p-8 text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1} />
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{t('noTrackingYet')}</p>
          <p className="text-sm text-gray-400">{t('noTrackingDesc')}</p>
        </div>
      )}
    </div>
  );
}
