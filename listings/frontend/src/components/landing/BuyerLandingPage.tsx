"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaCalendarAlt, FaCheckCircle, FaStar, FaUser, FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined, FaArrowRight, FaPlay, FaHeart, FaShare } from 'react-icons/fa';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import AuthRequiredModal from '@/components/modals/AuthRequiredModal';
import { fetchFromBackend } from '@/lib/api/client';

const BuyerLandingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const { data: session, status } = useSession();

  const [slides, setSlides] = useState([
    {
      image: '/images/hero-1.jpg',
      title: 'Βρείτε το Ιδανικό Ακίνητό Σας',
      subtitle: 'Ανακαλύψτε μοναδικές ευκαιρίες σε ακίνητα σε όλη την Ελλάδα',
      cta: 'Ξεκινήστε την Αναζήτησή σας'
    },
    {
      image: '/images/hero-2.jpg',
      title: 'Όμορφα Οικόπεδα',
      subtitle: 'Από την Ελλάδα και όλο τον κόσμο με τις καλύτερες τιμές',
      cta: 'Δείτε τα Οικόπεδα'
    },
    {
      image: '/images/hero-3.jpg',
      title: 'Επαγγελματική Υποστήριξη',
      subtitle: 'Στο πλευρό σας σε κάθε βήμα της διαδικασίας',
      cta: 'Μάθετε Περισσότερα'
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetchFromBackend('/properties');
        const data = await response.json();
        setProperties(data.slice(0, 6));
        
        // Δημιουργία τυχαίων slides από τις φωτογραφίες των ακινήτων
        const propertiesWithImages = data.filter((property: any) => 
          property.images && property.images.length > 0
        );
        
        if (propertiesWithImages.length > 0) {
          // Επιλογή τυχαίων ακινήτων για τα slides
          const shuffledProperties = propertiesWithImages
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
          
          const newSlides = shuffledProperties.map((property: any, index: number) => {
            const propertyTypeLabels: { [key: string]: string } = {
              'apartment': 'Διαμέρισμα',
              'house': 'Μονοκατοικία',
              'villa': 'Βίλα',
              'commercial': 'Επαγγελματικός Χώρος',
              'plot': 'Οικόπεδο'
            };
            
            const propertyTypeLabel = propertyTypeLabels[property.propertyType] || property.propertyType;
            
            return {
              image: property.images[0],
              title: property.title || 'Εξαιρετικό Ακίνητο',
              subtitle: `${propertyTypeLabel} σε ${property.city || 'Ελλάδα'} - ${property.price?.toLocaleString()}€`,
              cta: index === 0 ? 'Ξεκινήστε την Αναζήτησή σας' : 
                   index === 1 ? 'Δείτε τα Οικόπεδα' : 'Μάθετε Περισσότερα'
            };
          });
          
          setSlides(newSlides);
        } else {
          // Fallback στα default slides αν δεν υπάρχουν ακίνητα με φωτογραφίες
          setSlides([
            {
              image: '/images/hero-1.jpg',
              title: 'Βρείτε το Ιδανικό Ακίνητό Σας',
              subtitle: 'Ανακαλύψτε μοναδικές ευκαιρίες σε ακίνητα σε όλη την Ελλάδα',
              cta: 'Ξεκινήστε την Αναζήτησή σας'
            },
            {
              image: '/images/hero-2.jpg',
              title: 'Όμορφα Οικόπεδα',
              subtitle: 'Από την Ελλάδα και όλο τον κόσμο με τις καλύτερες τιμές',
              cta: 'Δείτε τα Οικόπεδα'
            },
            {
              image: '/images/hero-3.jpg',
              title: 'Επαγγελματική Υποστήριξη',
              subtitle: 'Στο πλευρό σας σε κάθε βήμα της διαδικασίας',
              cta: 'Μάθετε Περισσότερα'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handlePropertyClick = (property: any) => {
    if (status === 'authenticated') {
      // Αν ο χρήστης είναι συνδεδεμένος, πάμε στη σελίδα λεπτομερειών
      window.location.href = `/buyer/properties/${property.id}`;
    } else {
      // Αν δεν είναι συνδεδεμένος, εμφανίζουμε το modal
      setSelectedProperty(property);
      setShowAuthModal(true);
    }
  };

  const testimonials = [
    {
      name: 'Γιώργος Παπαδόπουλος',
      role: 'Αγοραστής',
      image: '/images/testimonial-1.jpg',
      text: 'Βρήκα το ιδανικό οικόπεδο μέσω της πλατφόρμας. Η διαδικασία ήταν απλή και επαγγελματική.',
      rating: 5
    },
    {
      name: 'Μαρία Αντωνίου',
      role: 'Επενδυτής',
      image: '/images/testimonial-2.jpg',
      text: 'Η ποιότητα των ακινήτων και η υποστήριξη ήταν εξαιρετική. Σίγουρα θα χρησιμοποιήσω ξανά την πλατφόρμα.',
      rating: 5
    },
    {
      name: 'Δημήτρης Κωνσταντίνου',
      role: 'Αγοραστής',
      image: '/images/testimonial-3.jpg',
      text: 'Εξαιρετική εμπειρία! Το ακίνητο που αγόρασα ήταν ακριβώς όπως περιγράφηκε.',
      rating: 5
    }
  ];

  const features = [
    {
      icon: FaUser,
      title: 'Εγγραφή',
      description: 'Δημιουργήστε τον λογαριασμό σας σε λίγα δευτερόλεπτα',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      icon: FaSearch,
      title: 'Αναζήτηση',
      description: 'Βρείτε το ιδανικό ακίνητο με προηγμένες φίλτρους',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: FaCalendarAlt,
      title: 'Ραντεβού',
      description: 'Κλείστε επισκέψεις εύκολα και γρήγορα',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: FaCheckCircle,
      title: 'Ολοκλήρωση',
      description: 'Ολοκληρώστε τη συμφωνία με ασφάλεια',
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Enhanced Hero Section */}
      <section className="relative h-screen">
        {loading ? (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
              <p className="text-white text-lg font-medium">Φόρτωση ακινήτων...</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                layout="fill"
                objectFit="cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
            </motion.div>
          </AnimatePresence>
        )}

        <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="max-w-5xl"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {slides[currentSlide].title}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              {slides[currentSlide].subtitle}
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href="/properties"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-lg font-semibold
                         hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {slides[currentSlide].cta}
                <FaArrowRight className="ml-2" />
              </Link>
              <button className="inline-flex items-center px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-xl text-lg font-semibold
                         hover:bg-white/30 transition-all duration-300 border border-white/30">
                <FaPlay className="mr-2" />
                Δείτε Video
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Enhanced Slide Indicators */}
        {!loading && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  currentSlide === index 
                    ? 'bg-white w-8 h-3' 
                    : 'bg-white/50 w-3 h-3 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Enhanced Properties Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Πρόσφατες Καταχωρήσεις
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ανακαλύψτε τα καλύτερα ακίνητα που έχουν προστεθεί πρόσφατα στην πλατφόρμα μας
            </p>
          </motion.div>
          
          {/* Enhanced Search Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-16"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Περιοχή</label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Επιλέξτε περιοχή"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Τιμή</label>
                <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white">
                  <option>Όλες οι τιμές</option>
                  <option>0€ - 50.000€</option>
                  <option>50.000€ - 100.000€</option>
                  <option>100.000€ - 200.000€</option>
                  <option>200.000€+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Τύπος</label>
                <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white">
                  <option>Όλοι οι τύποι</option>
                  <option>Οικόπεδο</option>
                  <option>Κτίριο</option>
                  <option>Επαγγελματικός χώρος</option>
                  <option>Εξοχικό</option>
                </select>
              </div>
              <div className="flex items-end">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-600
                           transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl font-semibold"
                >
                  <FaSearch className="mr-2" />
                  Αναζήτηση
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Properties Grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Φόρτωση ακινήτων...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {properties.slice(0, 6).map((property: any, index: number) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className="relative h-56">
                      <Image
                        src={property.images && property.images.length > 0 ? property.images[0] : '/images/placeholder.jpg'}
                        alt={property.title}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-full text-lg font-bold shadow-lg">
                          {property.price?.toLocaleString()}€
                        </span>
                      </div>
                      <div className="absolute top-4 left-4 flex space-x-2">
                        <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 shadow-lg">
                          <FaHeart className="text-red-500" />
                        </button>
                        <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 shadow-lg">
                          <FaShare className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                        {property.title}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-4">
                        <FaMapMarkerAlt className="mr-2 text-blue-500" />
                        <span>{property.location}</span>
                      </div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <FaBed className="mr-1 text-blue-500" />
                            <span>{property.bedrooms || 0}</span>
                          </div>
                          <div className="flex items-center">
                            <FaBath className="mr-1 text-blue-500" />
                            <span>{property.bathrooms || 0}</span>
                          </div>
                          <div className="flex items-center">
                            <FaRulerCombined className="mr-1 text-blue-500" />
                            <span>{property.area}m²</span>
                          </div>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <button
                          onClick={() => handlePropertyClick(property)}
                          className="block w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-center py-3 rounded-xl
                                   hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                        >
                          Προβολή Λεπτομερειών
                        </button>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-center mt-10">
                <Link
                  href="/properties"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-lg font-semibold
                             hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Περισσότερα ακίνητα
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Enhanced How It Works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Πώς Λειτουργεί
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ακολουθήστε αυτά τα απλά βήματα για να βρείτε το ιδανικό ακίνητο
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center group"
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <feature.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Τι Λένε οι Πελάτες μας
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Διαβάστε τις εμπειρίες των πελατών μας που βρήκαν το ιδανικό ακίνητο
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center mb-6">
                  <div className="relative w-16 h-16 mr-4">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{testimonial.name}</h3>
                    <p className="text-blue-600 font-medium">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="text-yellow-400 w-5 h-5" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed text-lg">{testimonial.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        propertyTitle={selectedProperty?.title}
      />
    </div>
  );
};

export default BuyerLandingPage; 