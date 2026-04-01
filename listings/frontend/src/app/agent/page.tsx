'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Link2, Smartphone, Wallet, Coffee, FileX, BarChart2, PlayCircle, ChevronDown } from 'lucide-react';
import AgentNavbar from '@/components/layout/AgentNavbar';
import AgentFooter from '@/components/layout/AgentFooter';

export default function AgentLandingPage() {
  const { data: session } = useSession();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const videoSectionRef = useRef<HTMLDivElement>(null);

  const scrollToVideo = () => {
    videoSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <AgentNavbar />

      {/* 1. Hero Section - Full viewport with premium indigo gradient */}
      <section className="min-h-screen flex flex-col justify-center pt-16 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-indigo-50/50 to-white relative overflow-hidden">
        {/* Subtle indigo/blue mesh gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.08)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.06)_0%,_transparent_50%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 mb-6"
          >
            Πρόγραμμα Συνεργατών
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight"
          >
            Βγάλε εισόδημα, απλά προτείνοντας ακίνητα.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto"
          >
            Δεν χρειάζεσαι άδεια μεσίτη. Βρες αγοραστές ή ενοικιαστές για τα ακίνητα της πλατφόρμας μας, μοιράσου το link σου και κέρδισε το 50% της προμήθειάς μας όταν κλείσει η συμφωνία. Μηδενικός κόπος, παθητικό εισόδημα.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href={session ? '/deals?from=agent&tab=overview' : '/agent/auth/register'}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all"
            >
              {session ? 'Πηγαίνετε στις συναλλαγές σας' : 'Ξεκίνα να βγάζεις χρήματα (Δωρεάν)'}
            </Link>
            <button
              onClick={scrollToVideo}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              Δες πώς λειτουργεί
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. Earnings Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12"
          >
            Μοιραζόμαστε τα κέρδη στη μέση (50-50).
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100"
            >
              <div className="text-5xl sm:text-6xl font-bold text-indigo-600 mb-3">1.000€*</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Πωλήσεις</h3>
              <p className="text-slate-700 mb-4">
                Ενδεικτικό κέρδος από μία πώληση ακινήτου 200.000€.
              </p>
              <p className="text-sm text-slate-500">
                Παίρνετε το 50% της προμήθειας (1%) της πλατφόρμας.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100"
            >
              <div className="text-5xl sm:text-6xl font-bold text-indigo-600 mb-3">250€*</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Ενοικιάσεις</h3>
              <p className="text-slate-700 mb-4">
                Ενδεικτικό κέρδος από μία ενοικίαση των 1.000€.
              </p>
              <p className="text-sm text-slate-500">
                Παίρνετε το 50% από την προμήθεια της πλατφόρμας.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-16"
          >
            Πώς να φέρεις τον πελάτη (2 Απλοί Τρόποι)
          </motion.h2>

          {/* Timeline with vertical line */}
          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-7 top-8 bottom-8 border-l-2 border-indigo-100 hidden sm:block" />

            <div className="space-y-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative flex gap-6 pb-12"
              >
                <div className="flex-shrink-0 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    1
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Link2 className="w-7 h-7 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Το Smart Link</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Βρες ένα ακίνητο που ταιριάζει στον γνωστό σου. Πάτα «Προώθηση» και στείλε του το μοναδικό σου link. Μόλις κάνει εγγραφή, συνδέεται αυτόματα μαζί σου και ανοίγει το Deal Room.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative flex gap-6 pb-12"
              >
                <div className="flex-shrink-0 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    2
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Smartphone className="w-7 h-7 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Άμεση Καταχώριση & OTP</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Έχεις τον πελάτη μπροστά σου; Πάτα «Προσθήκη Ενδιαφερόμενου» στο Dashboard σου. Βάλε τα στοιχεία του, ζήτα του τον κωδικό OTP που μόλις έλαβε στο κινητό του και κλείδωσε τη σύνδεση επιτόπου!
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative flex gap-6"
              >
                <div className="flex-shrink-0 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    3
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Wallet className="w-7 h-7 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Πληρωμή</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Παρακολούθησε την εξέλιξη μέσα από το Dashboard σου. Μόλις υπογραφούν τα συμβόλαια και επιβεβαιωθούν από τα δύο μέρη... πληρώνεσαι!
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Video Tutorial Section */}
      <section ref={videoSectionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
          >
            Δείτε το στην πράξη.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-lg text-slate-300 mb-10"
          >
            Ένα σύντομο βίντεο 2 λεπτών για το πώς να πάρετε το link σας και να παρακολουθείτε τα κέρδη σας.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-video rounded-2xl overflow-hidden bg-slate-800 shadow-2xl shadow-black/30 border border-slate-700"
          >
            {/* Dummy thumbnail - use gradient pattern or placeholder image */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setIsVideoPlaying(true)}
                className="group w-24 h-24 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all ring-4 ring-white/20"
              >
                <PlayCircle className="w-16 h-16 text-white group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <Coffee className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Μηδενικό Τρέξιμο.</h3>
              <p className="text-slate-600">
                Δεν δείχνεις σπίτια, δεν κάνεις ραντεβού. Απλά κάνεις τη σύνδεση (matchmaking).
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <FileX className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Καμία Γραφειοκρατία.</h3>
              <p className="text-slate-600">
                Δεν ασχολείσαι με νομικά, συμβόλαια ή μηχανικούς. Τα αναλαμβάνει όλα η πλατφόρμα και το ψηφιακό Deal Room.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <BarChart2 className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Απόλυτη Διαφάνεια.</h3>
              <p className="text-slate-600">
                Βλέπεις ζωντανά σε ποιο στάδιο βρίσκεται η συναλλαγή (π.χ. «Έγινε Προσφορά», «Στον Δικηγόρο») για να ξέρεις πότε πληρώνεσαι.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12"
          >
            Συχνές Ερωτήσεις (Ναι, είναι τόσο απλό)
          </motion.h2>
          <div className="space-y-4">
            {[
              {
                q: 'Υπάρχει κάποιο κρυφό κόστος;',
                a: 'Απολύτως κανένα. Η εγγραφή και η χρήση είναι 100% δωρεάν. Εμείς σας πληρώνουμε, δεν μας πληρώνετε.',
              },
              {
                q: 'Χρειάζομαι άδεια μεσίτη;',
                a: 'Όχι. Λειτουργείτε αποκλειστικά ως Affiliate / Εισαγωγέας πελατών. Τη νομική και μεσιτική διαδικασία την αναλαμβάνει η πλατφόρμα.',
              },
              {
                q: 'Πώς εξασφαλίζω ότι θα πληρωθώ;',
                a: 'Μέσω του ψηφιακού Deal Room. Όταν συνδεθεί το link σας με έναν αγοραστή, βλέπετε ζωντανά την εξέλιξη της συναλλαγής μέχρι τις τελικές υπογραφές. Απόλυτη διαφάνεια.',
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${openFaqIndex === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaqIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-4 text-slate-600">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link
              href={session ? '/deals?from=agent&tab=overview' : '/agent/auth/register'}
              className="inline-flex items-center justify-center px-12 py-5 rounded-xl font-bold text-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all hover:shadow-indigo-600/40 hover:scale-[1.02]"
            >
              {session ? 'Πηγαίνετε στις συναλλαγές σας' : 'Δημιούργησε τον δωρεάν λογαριασμό σου'}
            </Link>
          </motion.div>
        </div>
      </section>

      <AgentFooter />

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <video autoPlay controls className="w-full h-full">
                <source src="/videos/agent-tutorial.mp4" type="video/mp4" />
              </video>
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
