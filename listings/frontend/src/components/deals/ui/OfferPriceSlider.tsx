'use client';

import { useMemo, useState } from 'react';

interface OfferPriceSliderProps {
  /** Τιμή αγγελίας (κεντρική τιμή) */
  listingPrice: number;
  /** Τρέχουσα τιμή που έχει επιλέξει ο χρήστης */
  value: number;
  /** Callback όταν αλλάζει η τιμή */
  onChange: (value: number) => void;
  /** Ασθενής/disabled state */
  disabled?: boolean;
  /** buyer: χαμηλή τιμή = κόκκινο, ψηλή = πράσινο. seller: χαμηλή = πράσινο, ψηλή = κόκκινο */
  variant?: 'buyer' | 'seller';
}

// Ζώνες τιμών: τιμή ως % της listing (0 = listing, -1 = -15%, 1 = +15%)
type Zone = 'red' | 'yellow' | 'gray' | 'green';

function getZoneAndMessageBuyer(percentFromListing: number): { zone: Zone; message: string } {
  if (percentFromListing <= -0.10) return { zone: 'red', message: 'Πολύ μικρή πιθανότητα αποδοχής' };
  if (percentFromListing <= -0.03) return { zone: 'red', message: 'Μικρή πιθανότητα αποδοχής' };
  if (percentFromListing <= -0.01) return { zone: 'yellow', message: 'Χαμηλή πιθανότητα αποδοχής' };
  if (percentFromListing >= -0.005 && percentFromListing <= 0.005) return { zone: 'gray', message: 'Ουδέτερη πιθανότητα αποδοχής' };
  if (percentFromListing <= 0.05) return { zone: 'yellow', message: 'Καλή πιθανότητα αποδοχής' };
  if (percentFromListing <= 0.10) return { zone: 'green', message: 'Πολύ καλή πιθανότητα αποδοχής' };
  return { zone: 'green', message: 'Εξαιρετική πιθανότητα αποδοχής' };
}

function getZoneAndMessageSeller(percentFromListing: number): { zone: Zone; message: string } {
  // Για seller: χαμηλή τιμή = εύκολο για buyer να δεχτεί (πράσινο), ψηλή = δύσκολο (κόκκινο)
  if (percentFromListing <= -0.10) return { zone: 'green', message: 'Πολύ πιθανό να δεχτεί ο αγοραστής' };
  if (percentFromListing <= -0.03) return { zone: 'green', message: 'Πολύ καλή πιθανότητα αποδοχής' };
  if (percentFromListing <= -0.01) return { zone: 'yellow', message: 'Καλή πιθανότητα αποδοχής' };
  if (percentFromListing >= -0.005 && percentFromListing <= 0.005) return { zone: 'gray', message: 'Ουδέτερη πιθανότητα αποδοχής' };
  if (percentFromListing <= 0.05) return { zone: 'yellow', message: 'Χαμηλή πιθανότητα αποδοχής' };
  if (percentFromListing <= 0.10) return { zone: 'red', message: 'Μικρή πιθανότητα αποδοχής' };
  return { zone: 'red', message: 'Πολύ μικρή πιθανότητα αποδοχής' };
}

const zoneBgColors: Record<Zone, string> = {
  red: 'bg-red-50 border-red-200',
  yellow: 'bg-amber-50 border-amber-200',
  gray: 'bg-gray-50 border-gray-200',
  green: 'bg-emerald-50 border-emerald-200',
};

export default function OfferPriceSlider({
  listingPrice,
  value,
  onChange,
  disabled = false,
  variant = 'buyer',
}: OfferPriceSliderProps) {
  const minPrice = Math.round(listingPrice * 0.85);
  const maxPrice = Math.round(listingPrice * 1.15);
  const range = maxPrice - minPrice;
  // Adaptive step: για ενοικίαση (μικρές τιμές) μικρό step, για πώληση μεγαλύτερο
  const step = listingPrice < 5000
    ? Math.max(25, Math.round(range / 50))
    : Math.max(1000, Math.round(range / 100));

  const percentFromListing = (value - listingPrice) / listingPrice;
  const { zone, message } = useMemo(
    () => (variant === 'seller' ? getZoneAndMessageSeller(percentFromListing) : getZoneAndMessageBuyer(percentFromListing)),
    [percentFromListing, variant]
  );

  // Buyer: red left, green right. Seller: green left, red right
  const gradient = variant === 'seller'
    ? `linear-gradient(to right, #047857 0%, #059669 28%, #f59e0b 35%, #9ca3af 45%, #9ca3af 55%, #f59e0b 65%, #dc2626 72%, #dc2626 100%)`
    : `linear-gradient(to right, #dc2626 0%, #dc2626 28%, #f59e0b 35%, #9ca3af 45%, #9ca3af 55%, #f59e0b 65%, #059669 72%, #047857 100%)`;

  const zoneColors: Record<Zone, string> = {
    red: 'text-red-700',
    yellow: 'text-amber-700',
    gray: 'text-gray-700',
    green: 'text-emerald-700',
  };

  const handleDecrease = () => {
    const newVal = Math.max(minPrice, value - step);
    onChange(newVal);
  };
  const handleIncrease = () => {
    const newVal = Math.min(maxPrice, value + step);
    onChange(newVal);
  };

  const [customInput, setCustomInput] = useState<string | null>(null);
  const isEditing = customInput !== null;
  const displayValue = isEditing ? customInput : value.toLocaleString('el-GR');

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setCustomInput(raw);
  };

  const handleCustomInputBlur = () => {
    if (customInput === null) return;
    const parsed = parseInt(customInput || '0', 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(minPrice, Math.min(maxPrice, parsed));
      onChange(clamped);
    } else {
      onChange(value);
    }
    setCustomInput(null);
  };

  const handleCustomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handlePriceClick = () => {
    if (disabled) return;
    setCustomInput(String(value));
  };

  return (
    <div className="space-y-4">
      {/* Κάρτα με τρέχουσα τιμή, πιθανότητα και κουμπιά +/- */}
      <div
        className={`rounded-xl border-2 p-3.5 transition-all duration-200 ${zoneBgColors[zone]}`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDecrease}
              disabled={disabled || value <= minPrice}
              className="w-10 h-10 rounded-lg bg-white/80 hover:bg-gray-100 border-2 border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold text-gray-700 select-none touch-manipulation"
              aria-label="Μείωση τιμής"
            >
              −
            </button>
            {isEditing ? (
              <div className="flex items-center gap-0.5">
                <span className="text-2xl font-bold text-gray-900">€</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customInput ?? ''}
                  onChange={handleCustomInputChange}
                  onBlur={handleCustomInputBlur}
                  onKeyDown={handleCustomInputKeyDown}
                  autoFocus
                  className="w-32 min-w-[120px] text-2xl font-bold text-gray-900 tabular-nums bg-white/80 border-2 border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={String(minPrice)}
                  aria-label="Εισαγωγή προσαρμοσμένης τιμής"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePriceClick}
                disabled={disabled}
                className="text-2xl font-bold text-gray-900 tabular-nums min-w-[100px] text-center py-1 px-2 rounded-lg hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-default"
                title="Κλικ για εισαγωγή προσαρμοσμένης τιμής"
              >
                €{displayValue}
              </button>
            )}
            <button
              type="button"
              onClick={handleIncrease}
              disabled={disabled || value >= maxPrice}
              className="w-10 h-10 rounded-lg bg-white/80 hover:bg-gray-100 border-2 border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold text-gray-700 select-none touch-manipulation"
              aria-label="Αύξηση τιμής"
            >
              +
            </button>
          </div>
          <span className={`text-sm font-semibold px-2.5 py-1 rounded-full bg-white/80 ${zoneColors[zone]}`}>
            {message}
          </span>
        </div>
      </div>

      {/* Gradient track */}
      <div className="relative flex items-center min-h-6">
        <div
          className="h-4 w-full rounded-full overflow-hidden shadow-inner absolute left-0 right-0 top-1/2 -translate-y-1/2"
          style={{ background: gradient }}
        />
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="relative w-full h-6 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-600
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:touch-manipulation
            [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
        />
      </div>

      {/* Υπογραφές min/max */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-gray-500 px-0.5">
          <span className="font-medium">€{minPrice.toLocaleString('el-GR')} (-15%)</span>
          <span className="text-gray-600 font-semibold">Τιμή αγγελίας</span>
          <span className="font-medium">€{maxPrice.toLocaleString('el-GR')} (+15%)</span>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Κλικ στην τιμή για εισαγωγή προσαρμοσμένου ποσού
        </p>
      </div>
    </div>
  );
}
