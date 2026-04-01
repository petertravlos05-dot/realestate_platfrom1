"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaMapMarkerAlt, FaLock, FaBalanceScale, FaHandHoldingUsd, FaShieldAlt, FaCalendarAlt, FaHandshake, FaFileSignature, FaStar, FaCheckCircle, FaHeart, FaRegHeart } from 'react-icons/fa';
import { getPropertyImageUrl } from '@/lib/utils/propertyImageUrl';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import AuthRequiredModal from '@/components/modals/AuthRequiredModal';
import { fetchFromBackend } from '@/lib/api/client';
import { searchGreekLocations } from '@/data/greekLocations';
import * as Sentry from '@sentry/nextjs';

const BuyerLandingPage = () => {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites');
        if (!res.ok) return;
        const data = await res.json();
        const ids = (Array.isArray(data) ? data : []).map((f: any) => f.propertyId || f.property?.id).filter(Boolean);
        setFavoriteIds(new Set(ids));
      } catch (e) {
        console.error('Fetch favorites:', e);
      }
    };
    fetchFavorites();
  }, [status]);

  // Hero search state
  const [searchArea, setSearchArea] = useState('');
  const [searchType, setSearchType] = useState<'sale' | 'rent'>('sale');
  const [searchPrice, setSearchPrice] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetchFromBackend('/properties');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const responseData = await response.json();
        const rawProperties = Array.isArray(responseData)
          ? responseData
          : (responseData.data || responseData.properties || []);
        const propertiesList = Array.isArray(rawProperties) ? rawProperties : [];
        const available = propertiesList.filter((p: any) => !(p.propertySold ?? p.isSold ?? p.isReserved ?? p.depositLocked));
        setProperties(available.slice(0, 6));
      } catch (error) {
        console.error('Error fetching properties:', error);
        Sentry.captureException(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const handleLocationInputChange = (v: string) => {
    setSearchArea(v);
    if (v.trim().length > 0) {
      const suggestions = searchGreekLocations(v, 8);
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (loc: string) => {
    setSearchArea(loc);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchArea.trim()) params.set('location', searchArea.trim());
    params.set('type', searchType);
    if (searchPrice.trim()) params.set('price', searchPrice.trim());
    router.push(`/properties?${params.toString()}`);
  };

  const getPropertyStatus = (property: any): { label: string; className: string } => {
    const isSoldOrRented = property.propertySold ?? property.isSold;
    const isReserved = property.isReserved ?? property.depositLocked;
    const a = property.amenities;
    const isRent = a && typeof a === 'object' && (a.listingType || a.transactionType || '').toString().toLowerCase() === 'rent';
    if (isSoldOrRented) return { label: isRent ? 'Ενοικιάστηκε' : 'Πουλημένο', className: 'bg-slate-700/90 text-white' };
    if (isReserved) return { label: 'Μη διαθεσίμο', className: 'bg-amber-600/90 text-white' };
    return { label: isRent ? 'Ενοικιάζεται' : 'Πωλείται', className: 'bg-emerald-600/90 text-white' };
  };

  const handlePropertyClick = (property: any) => {
    if (status === 'authenticated') {
      window.location.href = `/buyer/properties/${property.id}`;
    } else {
      setSelectedProperty(property);
      setShowAuthModal(true);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    if (status !== 'authenticated') {
      setShowAuthModal(true);
      return;
    }
    try {
      const isFav = favoriteIds.has(propertyId);
      if (isFav) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId }),
          credentials: 'include',
        });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId }),
          credentials: 'include',
        });
        setFavoriteIds((prev) => new Set([...prev, propertyId]));
      }
    } catch (err) {
      console.error('Toggle favorite:', err);
    }
  };

  const testimonials = [
    {
      name: 'Μαρία Κ.',
      role: 'Αγοράστρια',
      text: 'Επιτέλους δεν χρειάστηκε να τρέχω σε γραφεία. Έκανα την προσφορά μου από τον καναπέ, ο δικηγόρος έδωσε το ΟΚ, πληρώσαμε την προκαταβολή και το σπίτι έγινε δικό μας!',
      rating: 5
    },
    {
      name: 'Γιώργος Π.',
      role: 'Αγοραστής',
      text: 'Γλιτώνω χρήματα και χρόνο. Η διαφάνεια στα έγγραφα με έκανε να νιώθω ασφάλεια. Το 1% προμήθεια αντί για τα παλιά καπέλα των μεσάζοντων είναι διαφορετικό.',
      rating: 5
    },
    {
      name: 'Ελένη Μ.',
      role: 'Ενοικιάστρια',
      text: 'Ψηφιακά υπογραφές, έλεγχος από δικηγόρο πριν δώσω προκαταβολή, και το ακίνητο κλειδώθηκε αμέσως. Κανένα άγχος.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Section 1: Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center">
        <Image
          src="/images/hero-home.png"
          alt="Πολυτελής βίλα με πισίνα"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
          >
            Το νέο σας σπίτι, χωρίς τα παλιά προβλήματα.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Αναζητήστε, διαπραγματευτείτε και υπογράψτε συμβόλαια 100% ψηφιακά. Με νομικό έλεγχο και μόνο 1% προμήθεια. Η νέα εποχή στο Real Estate είναι εδώ.
          </motion.p>
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleHeroSearch}
            className="bg-white rounded-2xl shadow-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch"
          >
            <div ref={locationInputRef} className="flex-1 relative">
              <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
              <input
                type="text"
                placeholder="Περιοχή (π.χ. ζακ, αθήνα, θεσ)"
                value={searchArea}
                onChange={(e) => handleLocationInputChange(e.target.value)}
                onFocus={() => {
                  if (searchArea.trim()) {
                    const s = searchGreekLocations(searchArea, 8);
                    setLocationSuggestions(s);
                    setShowSuggestions(s.length > 0);
                  }
                }}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                autoComplete="off"
              />
              <AnimatePresence>
                {showSuggestions && locationSuggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-60 overflow-y-auto"
                  >
                    {locationSuggestions.map((loc) => (
                      <li key={loc}>
                        <button
                          type="button"
                          onClick={() => handleSuggestionSelect(loc)}
                          className="w-full text-left px-4 py-3 pl-11 hover:bg-blue-50 flex items-center gap-2 text-gray-700"
                        >
                          <FaMapMarkerAlt className="text-blue-600 text-sm" />
                          {loc}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'sale' | 'rent')}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-800 bg-white"
            >
              <option value="sale">Αγορά</option>
              <option value="rent">Ενοικίαση</option>
            </select>
            <input
              type="text"
              placeholder="Τιμή (€)"
              value={searchPrice}
              onChange={(e) => setSearchPrice(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-800 w-32"
            />
            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl font-semibold hover:from-blue-900 hover:to-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <FaSearch /> Αναζήτηση
            </button>
          </motion.form>
        </div>
      </section>

      {/* Section 2: Trust Bar */}
      <section className="py-4 bg-gray-100 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 md:gap-12">
          <span className="text-sm text-gray-600 font-medium">Διασύνδεση με:</span>
          <a href="https://gov.gr" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-800 font-semibold text-sm">
            gov.gr
          </a>
          <span className="text-gray-300">|</span>
          <a href="https://myaade.gov.gr" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-800 font-semibold text-sm">
            myAADE
          </a>
          <span className="hidden md:inline text-gray-300">|</span>
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <FaLock className="text-green-600" /> Ταυτοποιημένοι Ιδιοκτήτες (KYC)
          </span>
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <FaBalanceScale className="text-blue-600" /> Ελεγμένα Ακίνητα
          </span>
        </div>
      </section>

      {/* Section 3: Γιατί Εμείς */}
      <section className="py-24 bg-[#f5f0e8]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16"
          >
            Γιατί να κλείσετε το σπίτι σας μέσω της πλατφόρμας μας;
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FaHandHoldingUsd,
                title: 'Τέλος στις παράλογες προμήθειες',
                text: 'Ξεχάστε τις υπερβολικές χρεώσεις. Στην πλατφόρμα μας πληρώνετε μόνο 1% success fee (ή 1 ενοίκιο για μισθώσεις), αποκλειστικά εφόσον πέσουν οι υπογραφές. Καμία κρυφή χρέωση.',
                color: 'from-emerald-600 to-teal-600'
              },
              {
                icon: FaShieldAlt,
                title: '100% Ψηφιακή & Απλή Διαδικασία',
                text: 'Ξεμπερδέψτε με τη γραφειοκρατία από τον καναπέ σας. Κλείστε ραντεβού, κάντε επίσημες προσφορές και υπογράψτε ψηφιακά (gov.gr) μέσα από το προσωπικό σας Deal Room.',
                color: 'from-blue-700 to-indigo-700'
              },
              {
                icon: FaBalanceScale,
                title: 'Εγγυημένη Κατοχύρωση & Έλεγχος',
                text: 'Μόλις συμφωνήσετε, καταθέτετε την προκαταβολή με απόλυτη τραπεζική ασφάλεια. Το ακίνητο "κλειδώνει" για εσάς, ενώ οι δικηγόροι ελέγχουν τη νομιμότητά του πριν το τελικό συμβόλαιο.',
                color: 'from-slate-700 to-slate-800'
              }
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-6`}>
                  <card.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
                <p className="text-gray-600 leading-relaxed">{card.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Πώς Λειτουργεί */}
      <section className="py-24 bg-gradient-to-b from-[#faf6f0] to-[#f5f0e8]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16"
          >
            Πώς Λειτουργεί
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: FaCalendarAlt, title: 'Αναζήτηση & Ψηφιακό Ραντεβού', desc: 'Δείξε το ημερολόγιο', num: '1' },
              { icon: FaHandshake, title: 'Επίσημη Προσφορά με 1 Κλικ', desc: 'Κάνε Προσφορά', num: '2' },
              { icon: FaLock, title: 'Νομικός Έλεγχος & Κατοχύρωση', desc: 'Λουκέτο ασφαλείας προκαταβολής', num: '3' },
              { icon: FaFileSignature, title: 'Ψηφιακές Υπογραφές & Κλειδιά', desc: 'Ενσωμάτωση gov.gr', num: '4' }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-blue-800 text-white font-bold flex items-center justify-center mx-auto mb-4">{step.num}</div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-800 to-slate-700 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Showcase Ακινήτων */}
      <section className="py-24 bg-[#f5f0e8]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Επιλεγμένα Ακίνητα, έτοιμα για μεταβίβαση
            </h2>
          </motion.div>
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-800 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-600">Φόρτωση ακινήτων...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 mb-4">Δεν βρέθηκαν διαθέσιμα ακίνητα.</p>
              <Link href="/properties" className="text-blue-800 font-semibold hover:underline">
                Αναζήτηση ακινήτων →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties.slice(0, 6).map((property: any, i: number) => {
                  const status = getPropertyStatus(property);
                  return (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all group"
                    >
                      <div className="relative h-56">
                        <Image
                          src={getPropertyImageUrl(property.images?.[0])}
                          alt={property.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          {property.isVerified && (
                            <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">Verified Ιδιοκτήτης</span>
                          )}
                          <span className={`${status.className} text-xs font-bold px-2 py-1 rounded-full`}>{status.label}</span>
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            onClick={(e) => handleFavoriteClick(e, property.id)}
                            className="p-2 rounded-full bg-white/90 shadow-md text-red-500 hover:bg-red-50 hover:scale-110 transition-all duration-200"
                            title={favoriteIds.has(property.id) ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                            aria-label={favoriteIds.has(property.id) ? 'Αφαίρεση από αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                          >
                            {favoriteIds.has(property.id) ? <FaHeart className="w-4 h-4 fill-red-500 text-red-500" /> : <FaRegHeart className="w-4 h-4 text-red-500" />}
                          </button>
                          <span className="bg-white/90 px-3 py-2 rounded-lg font-bold">
                            {property.price?.toLocaleString()}€{(property.amenities && typeof property.amenities === 'object' && (property.amenities.listingType || property.amenities.transactionType || '').toString().toLowerCase() === 'rent') ? '/μήνα' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-800">{property.title}</h3>
                        <p className="text-gray-600 text-sm mb-4 flex items-center gap-1">
                          <FaMapMarkerAlt className="text-blue-700" />
                          {property.location || [property.city, property.street, property.number].filter(Boolean).join(', ') || 'Ελλάδα'}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-600 mb-4">
                          <span>{property.bedrooms || 0} υπνοδ.</span>
                          <span>{property.bathrooms || 0} μπάνια</span>
                          <span>{property.area}m²</span>
                        </div>
                        <button
                          onClick={() => handlePropertyClick(property)}
                          className="w-full py-3 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl font-semibold hover:from-blue-900 hover:to-slate-800 transition-all"
                        >
                          Προβολή Λεπτομερειών
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="text-center mt-10">
                <Link
                  href="/properties"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-blue-800 to-slate-700 text-white rounded-xl font-semibold hover:from-blue-900 hover:to-slate-800 transition-all shadow-lg"
                >
                  Δείτε όλα τα ακίνητα
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Section 6: Οικονομική Σύγκριση */}
      <section className="py-24 bg-gradient-to-b from-[#faf6f0] to-[#f5f0e8]">
        <div className="max-w-4xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12"
          >
            Δείτε πόσα γλιτώνετε μαζί μας
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left font-semibold text-gray-900">Σενάριο αγοράς 200.000€</th>
                    <th className="px-6 py-4 text-right font-semibold text-gray-900">Αμοιβή</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-6 py-4 text-gray-700">Παραδοσιακό Μεσιτικό</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">4.000€ + ΦΠΑ</td>
                  </tr>
                  <tr className="bg-emerald-50/50">
                    <td className="px-6 py-4 font-semibold text-emerald-800">Η Πλατφόρμα μας (1% Success Fee)</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">2.000€</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
              <p className="text-gray-800 font-medium text-center">
                <FaCheckCircle className="inline-block text-emerald-600 mr-2" />
                Γλιτώνετε 2.000€+ και έχετε ψηφιακή εξυπηρέτηση. Πληρώνετε μόνο αν πέσουν οι υπογραφές.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 7: Social Proof */}
      <section className="py-24 bg-[#f5f0e8]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16"
          >
            Τι λένε όσοι το δοκίμασαν
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <FaStar key={j} className="text-amber-400 w-5 h-5" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 italic">"{t.text}"</p>
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-blue-800">{t.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8: Bottom CTA - μόνο αν δεν είναι συνδεδεμένος */}
      {status === 'authenticated' ? null : (
        <section className="py-20 bg-gradient-to-r from-blue-900 to-slate-800">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Μην ψάχνετε απλά σπίτι. Αλλάξτε τον τρόπο που το αποκτάτε.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-white/80 mb-8"
            >
              Χωρίς χρέωση εγγραφής ή κρυφές συνδρομές
            </motion.p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/buyer/auth/register"
                className="inline-block px-10 py-4 bg-white text-blue-900 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-xl"
              >
                Δημιουργία Δωρεάν Λογαριασμού
              </Link>
              <Link
                href="/buyer/auth/login"
                className="inline-block px-10 py-4 bg-white/20 text-white border-2 border-white/60 rounded-xl font-bold text-lg hover:bg-white/30 transition-all"
              >
                Σύνδεση
              </Link>
            </div>
          </div>
        </section>
      )}

      <AuthRequiredModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} propertyTitle={selectedProperty?.title} />
    </div>
  );
};

export default BuyerLandingPage;
