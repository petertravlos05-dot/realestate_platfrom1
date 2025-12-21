'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaUserPlus, FaSearch, FaCalendarAlt, FaHandshake, FaHeadset, FaPlay, FaHome, FaEnvelope, FaInfoCircle, FaQuestionCircle, FaUser, FaCog, FaComments, FaExchangeAlt, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaSignOutAlt, FaChevronDown, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import StepDetailsPanel from '@/components/modals/StepDetailsPanel';
import NotificationBell from '@/components/notifications/NotificationBell';
import DynamicNavbar from '@/components/navigation/DynamicNavbar';

const steps = [
  {
    id: 1,
    title: 'Εγγραφή/Σύνδεση',
    icon: <FaUserPlus className="w-12 h-12" />,
    description: 'Δημιουργήστε τον λογαριασμό σας ως Buyer ή συνδεθείτε αν ήδη έχετε λογαριασμό',
    details: {
      subtitle: 'Ξεκινήστε το ταξίδι σας στην αναζήτηση ακινήτου',
      content: [
        'Η δημιουργία λογαριασμού είναι απλή και γρήγορη. Χρειάζεται μόνο ένα email και έναν κωδικό πρόσβασης.',
        'Με την εγγραφή σας αποκτάτε πρόσβαση σε προνόμια όπως:',
        '• Αποθήκευση αγαπημένων ακινήτων',
        '• Προσωποποιημένες ειδοποιήσεις για νέα ακίνητα',
        '• Άμεση επικοινωνία με τους πωλητές',
        '• Πρόσβαση στο ιστορικό αναζητήσεών σας'
      ],
      tips: [
        'Χρησιμοποιήστε ένα ισχυρό κωδικό πρόσβασης',
        'Επιβεβαιώστε το email σας για πλήρη πρόσβαση',
        'Συμπληρώστε το προφίλ σας για καλύτερη εμπειρία'
      ]
    }
  },
  {
    id: 2,
    title: 'Αναζήτηση & Εξερεύνηση',
    icon: <FaSearch className="w-12 h-12" />,
    description: 'Χρησιμοποιήστε τα φίλτρα για να βρείτε ακίνητα που ταιριάζουν στις ανάγκες σας',
    details: {
      subtitle: 'Βρείτε το ιδανικό ακίνητο με τα εργαλεία μας',
      content: [
        'Η πλατφόρμα μας προσφέρει προηγμένα εργαλεία αναζήτησης:',
        '• Αναζήτηση με τοποθεσία ή περιοχή στο χάρτη',
        '• Εξειδικευμένα φίλτρα για τύπο, τιμή, χαρακτηριστικά',
        '• Προβολή ακινήτων σε λίστα ή στο χάρτη',
        'Μπορείτε να αποθηκεύσετε τις αναζητήσεις σας και να λαμβάνετε ειδοποιήσεις για νέα ακίνητα που ταιριάζουν στα κριτήριά σας.'
      ],
      tips: [
        'Χρησιμοποιήστε τον χάρτη για καλύτερη κατανόηση της περιοχής',
        'Εφαρμόστε πολλαπλά φίλτρα για πιο ακριβή αποτελέσματα',
        'Αποθηκεύστε τις αγαπημένες σας αναζητήσεις'
      ]
    }
  },
  {
    id: 3,
    title: 'Προβολή & Ραντεβού',
    icon: <FaCalendarAlt className="w-12 h-12" />,
    description: 'Δείτε λεπτομέρειες, φωτογραφίες και προγραμματίστε επίσκεψη',
    details: {
      subtitle: 'Εξερευνήστε τα ακίνητα σε βάθος',
      content: [
        'Κάθε καταχώρηση περιλαμβάνει:',
        '• Λεπτομερείς πληροφορίες και χαρακτηριστικά',
        '• Υψηλής ποιότητας φωτογραφίες',
        '• Κάτοψη και εικονική περιήγηση (όπου διατίθεται)',
        'Μπορείτε εύκολα να προγραμματίσετε μια επίσκεψη στο ακίνητο μέσω της πλατφόρμας μας, επιλέγοντας την ημερομηνία και ώρα που σας εξυπηρετεί.'
      ],
      tips: [
        'Ελέγξτε όλες τις διαθέσιμες φωτογραφίες',
        'Διαβάστε προσεκτικά την περιγραφή',
        'Προγραμματίστε επίσκεψη σε κατάλληλη ώρα'
      ]
    }
  },
  {
    id: 4,
    title: 'Διαπραγμάτευση',
    icon: <FaHandshake className="w-12 h-12" />,
    description: 'Συζητήστε με τους πωλητές και διαπραγματευτείτε την τιμή',
    details: {
      subtitle: 'Επικοινωνήστε και διαπραγματευτείτε',
      content: [
        'Η πλατφόρμα μας προσφέρει ασφαλή επικοινωνία με τους πωλητές:',
        '• Άμεσα μηνύματα μέσω της πλατφόρμας',
        '• Δυνατότητα βιντεοκλήσης',
        '• Ανταλλαγή εγγράφων με ασφάλεια',
        'Μπορείτε να συζητήσετε όλες τις λεπτομέρειες και να διαπραγματευτείτε την τιμή μέσω του συστήματός μας.'
      ],
      tips: [
        'Προετοιμάστε τις ερωτήσεις σας εκ των προτέρων',
        'Κρατήστε αρχείο των συνομιλιών',
        'Ζητήστε διευκρινίσεις για οποιαδήποτε απορία'
      ]
    }
  },
  {
    id: 5,
    title: 'Υποστήριξη',
    icon: <FaHeadset className="w-12 h-12" />,
    description: 'Λάβετε βοήθεια από την ομάδα υποστήριξης μας σε κάθε βήμα',
    details: {
      subtitle: 'Είμαστε δίπλα σας σε κάθε βήμα',
      content: [
        'Η ομάδα υποστήριξής μας είναι διαθέσιμη:',
        '• 24/7 μέσω chat',
        '• Τηλεφωνικά τις εργάσιμες ώρες',
        '• Μέσω email',
        'Παρέχουμε βοήθεια σε όλα τα στάδια της διαδικασίας, από την αναζήτηση μέχρι την ολοκλήρωση της αγοράς.'
      ],
      tips: [
        'Μη διστάσετε να ζητήσετε βοήθεια',
        'Χρησιμοποιήστε το live chat για άμεση απάντηση',
        'Συμβουλευτείτε τον οδηγό χρήσης της πλατφόρμας'
      ]
    }
  }
];

const testimonials = [
  {
    name: 'Γιώργος Παπαδόπουλος',
    text: 'Βρήκα το ιδανικό μου σπίτι μέσω της πλατφόρμας. Η διαδικασία ήταν απλή και αποδοτική!',
    image: '/testimonials/user1.jpg'
  },
  {
    name: 'Μαρία Αντωνίου',
    text: 'Εξαιρετική εμπειρία! Η ομάδα υποστήριξης ήταν πάντα εκεί για να βοηθήσει.',
    image: '/testimonials/user2.jpg'
  }
];

const faqItems = [
  {
    question: 'Πώς μπορώ να ξεκινήσω την αναζήτηση ακινήτου;',
    answer: 'Μπορείτε να ξεκινήσετε την αναζήτηση ακινήτου χρησιμοποιώντας τα φίλτρα αναζήτησης στην αρχική σελίδα. Επιλέξτε τον τύπο ακινήτου, την τοποθεσία, την τιμή και άλλα χαρακτηριστικά που σας ενδιαφέρουν. Η πλατφόρμα μας θα σας εμφανίσει τα ακίνητα που ταιριάζουν στα κριτήριά σας.'
  },
  {
    question: 'Πρέπει να κάνω εγγραφή για να δω τα ακίνητα;',
    answer: 'Όχι, μπορείτε να περιηγηθείτε στα διαθέσιμα ακίνητα χωρίς εγγραφή. Ωστόσο, η εγγραφή σας δίνει πρόσβαση σε επιπλέον λειτουργίες όπως αποθήκευση αγαπημένων ακινήτων, λήψη ειδοποιήσεων για νέα ακίνητα και δυνατότητα επικοινωνίας με τους πωλητές.'
  },
  {
    question: 'Τι σημαίνει "προκαταβολή" και γιατί είναι απαραίτητη;',
    answer: 'Η προκαταβολή είναι ένα ποσό που καταβάλλεται ως εγγύηση για την αγορά του ακινήτου. Είναι απαραίτητη γιατί δεσμεύει το ακίνητο για εσάς και δείχνει την σοβαρότητα της πρόθεσής σας για αγορά. Συνήθως αντιστοιχεί στο 10% της συνολικής αξίας του ακινήτου.'
  },
  {
    question: 'Τι γίνεται εάν αλλάξω γνώμη μετά την προκαταβολή;',
    answer: 'Οι όροι επιστροφής της προκαταβολής καθορίζονται στο προσύμφωνο που υπογράφεται. Συνήθως, εάν υπαναχωρήσετε χωρίς σοβαρό λόγο, ενδέχεται να χάσετε την προκαταβολή. Ωστόσο, εάν προκύψουν σοβαρά νομικά προβλήματα με το ακίνητο, η προκαταβολή επιστρέφεται.'
  },
  {
    question: 'Ποιος καθορίζει την τιμή του ακινήτου;',
    answer: 'Η αρχική τιμή καθορίζεται από τον πωλητή, συχνά σε συνεργασία με επαγγελματίες εκτιμητές και μεσίτες. Η τελική τιμή μπορεί να διαμορφωθεί μέσω διαπραγμάτευσης μεταξύ αγοραστή και πωλητή, λαμβάνοντας υπόψη την κατάσταση του ακινήτου και τις τρέχουσες συνθήκες της αγοράς.'
  },
  {
    question: 'Πώς μπορώ να κλείσω ραντεβού για να δω ένα ακίνητο;',
    answer: 'Μπορείτε να κλείσετε ραντεβού απευθείας μέσω της πλατφόρμας μας. Στη σελίδα κάθε ακινήτου υπάρχει επιλογή για προγραμματισμό επίσκεψης, όπου μπορείτε να επιλέξετε την ημερομηνία και ώρα που σας εξυπηρετεί. Θα λάβετε επιβεβαίωση μόλις ο πωλητής ή ο μεσίτης αποδεχτεί το αίτημά σας.'
  },
  {
    question: 'Ποιος με συνοδεύει στην επίσκεψη του ακινήτου;',
    answer: 'Στην επίσκεψη θα σας συνοδεύσει είτε ο ιδιοκτήτης είτε ο εξουσιοδοτημένος μεσίτης του ακινήτου. Αυτοί θα μπορέσουν να σας δείξουν όλους τους χώρους και να απαντήσουν σε τυχόν ερωτήσεις σας σχετικά με το ακίνητο.'
  },
  {
    question: 'Πώς διασφαλίζεται η νομιμότητα του ακινήτου;',
    answer: 'Πριν την ολοκλήρωση της αγοράς, διενεργείται πλήρης νομικός και τεχνικός έλεγχος από εξειδικευμένους δικηγόρους. Ελέγχονται τίτλοι ιδιοκτησίας, βάρη, οφειλές, πολεοδομικά θέματα και άλλα νομικά ζητήματα για να διασφαλιστεί η ασφαλής μεταβίβαση του ακινήτου.'
  },
  {
    question: 'Μπορώ να έχω πρόσβαση σε έγγραφα πριν την υπογραφή;',
    answer: 'Ναι, έχετε δικαίωμα να ελέγξετε όλα τα σχετικά έγγραφα του ακινήτου πριν την υπογραφή οποιουδήποτε συμβολαίου. Αυτό περιλαμβάνει τίτλους ιδιοκτησίας, πιστοποιητικά, άδειες και άλλα σχετικά έγγραφα. Συνιστάται να γίνει ο έλεγχος με τη βοήθεια δικηγόρου.'
  },
  {
    question: 'Πώς ολοκληρώνεται η διαδικασία αγοράς;',
    answer: 'Η διαδικασία ολοκληρώνεται με την υπογραφή του οριστικού συμβολαίου στο συμβολαιογραφείο, την καταβολή του τιμήματος και τη μεταγραφή του συμβολαίου στο αρμόδιο Υποθηκοφυλακείο/Κτηματολόγιο. Μετά την ολοκλήρωση αυτών των βημάτων, γίνεστε επίσημα ο νέος ιδιοκτήτης του ακινήτου.'
  },
  {
    question: 'Υπάρχουν επιπλέον χρεώσεις ή προμήθειες;',
    answer: 'Ναι, εκτός από την τιμή του ακινήτου, υπάρχουν πρόσθετα έξοδα όπως ο φόρος μεταβίβασης, συμβολαιογραφικά έξοδα, έξοδα μεταγραφής και πιθανή μεσιτική αμοιβή. Το συνολικό κόστος αυτών των εξόδων συνήθως κυμαίνεται μεταξύ 8-10% της αξίας του ακινήτου.'
  },
  {
    question: 'Ποια είναι τα επόμενα βήματα μετά την αγορά;',
    answer: 'Μετά την αγορά, θα πρέπει να φροντίσετε για τη μεταβίβαση των λογαριασμών κοινής ωφέλειας στο όνομά σας, την ασφάλιση του ακινήτου και την ενημέρωση της εφορίας για τη νέα σας κατοικία. Η πλατφόρμα μας παρέχει αναλυτικό οδηγό με όλα τα απαραίτητα βήματα.'
  },
  {
    question: 'Τι συμβαίνει αν το ακίνητο έχει προβλήματα που δεν είχαν αναφερθεί;',
    answer: 'Εάν μετά την αγορά ανακαλύψετε σοβαρά προβλήματα που δεν είχαν αναφερθεί και δεν ήταν εμφανή κατά τον έλεγχο, έχετε νομικά δικαιώματα έναντι του πωλητή. Συνιστάται να επικοινωνήσετε άμεσα με το δικηγόρο σας για τις κατάλληλες νομικές ενέργειες.'
  }
];

export default function HowItWorks() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [selectedStep, setSelectedStep] = useState<(typeof steps)[0] | null>(null);
  const [showAllFaq, setShowAllFaq] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleChangeRole = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DynamicNavbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Πώς Λειτουργεί για Αγοραστές
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Μάθετε πώς να βρείτε το ιδανικό ακίνητο βήμα-βήμα, εύκολα και γρήγορα, μέσα από την πλατφόρμα μας.
          </motion.p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-24 relative z-10">
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-4xl font-extrabold text-gray-900 text-center mb-12 tracking-tight mt-16">
          Τα Βήματα για Αγοραστές
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              whileHover={{ scale: 1.04, boxShadow: '0 8px 32px 0 rgba(80,80,200,0.15)' }}
              className="bg-white rounded-3xl shadow-xl border-2 border-transparent hover:border-blue-400 transition-all duration-300 p-8 flex flex-col items-center text-center group relative overflow-hidden"
            >
              <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 mb-4 text-lg">{step.description}</p>
              <button onClick={() => setSelectedStep(step)} className="mt-auto px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-indigo-600 font-semibold transition-all duration-300">Περισσότερα</button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-center mb-12 drop-shadow-lg"
          >
            Τι Λένε οι Πελάτες μας
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center group hover:scale-105 hover:shadow-3xl transition-all duration-300"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg overflow-hidden">
                  <img src={testimonial.image} alt={testimonial.name} className="w-20 h-20 rounded-full object-cover" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{testimonial.name}</h3>
                <p className="text-gray-700 text-lg leading-relaxed">{testimonial.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gradient-to-b from-white via-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-center mb-12 text-gray-900"
          >
            Συχνές Ερωτήσεις
          </motion.h2>
          <div className="space-y-8">
            {(showAllFaq ? faqItems : faqItems.slice(0, 3)).map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
              >
                <h3 className="text-xl font-bold mb-3 text-[#001f3f]">{item.question}</h3>
                <p className="text-gray-600">{item.answer}</p>
              </motion.div>
            ))}
            {!showAllFaq && faqItems.length > 3 && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setShowAllFaq(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full shadow-md hover:from-blue-600 hover:to-indigo-600 font-semibold text-lg transition-all duration-300"
                >
                  <span>Περισσότερες</span>
                  <span className="text-2xl leading-none">+</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section - Only show when user is not logged in */}
      {!session && (
        <section className="py-20 bg-gradient-to-r from-gray-50 to-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#001f3f] opacity-5 pattern-dots"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div 
              className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold mb-6 text-[#001f3f]"
              >
                Ξεκινήστε την Αναζήτησή σας Σήμερα
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg mb-8 text-gray-600"
              >
                Εγγραφείτε τώρα και βρείτε το ιδανικό σας ακίνητο
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link 
                  href="/buyer/auth/register"
                  className="inline-block bg-[#60A5FA] text-white px-12 py-4 rounded-full text-sm font-semibold hover:bg-[#3B82F6] transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Εγγραφείτε ως Buyer
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="bg-white border-t border-gray-200 py-12 mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FaHome className="text-white text-sm" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  RealEstate
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες. Βρείτε το ιδανικό σπίτι ή πουλήστε το ακίνητό σας με ευκολία.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/properties" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center">
                    <FaSearch className="mr-2 text-blue-500" />
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center">
                    <FaInfoCircle className="mr-2 text-blue-500" />
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 flex items-center">
                    <FaEnvelope className="mr-2 text-blue-500" />
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Επικοινωνία</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <FaEnvelope className="mr-3 text-blue-500" />
                  info@realestate.com
                </li>
                <li className="flex items-center">
                  <FaPhone className="mr-3 text-blue-500" />
                  +30 210 1234567
                </li>
                <li className="flex items-center">
                  <FaMapMarkerAlt className="mr-3 text-blue-500" />
                  Αθήνα, Ελλάδα
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaFacebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaInstagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md">
                  <FaLinkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </motion.footer>

      {/* Step Details Panel */}
      <StepDetailsPanel
        isOpen={!!selectedStep}
        onClose={() => setSelectedStep(null)}
        step={selectedStep}
      />
    </div>
  );
} 