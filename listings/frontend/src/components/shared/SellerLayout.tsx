import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { FaUser, FaCaretDown, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

interface SellerLayoutProps {
  children: React.ReactNode;
}

const SellerLayout: React.FC<SellerLayoutProps> = ({ children }) => {
  const { data: session } = useSession();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#ecfdf5]">
      {/* Navigation */}
      <header className="fixed w-full z-50 bg-white/90 backdrop-blur-md shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            {/* Logo - Left */}
            <div className="w-1/4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">RealEstate</span>
                <span className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full">
                  Seller Mode
                </span>
              </Link>
            </div>
            
            {/* Navigation - Center */}
            <div className="flex-1 flex justify-center">
              <nav className="flex items-center space-x-12">
                <Link href="/seller/properties" className="text-gray-600 hover:text-green-600 transition-colors font-medium">
                  Ακίνητα
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-green-600 transition-colors font-medium">
                  Σχετικά
                </Link>
                <Link href="/contact" className="text-gray-600 hover:text-green-600 transition-colors font-medium">
                  Επικοινωνία
                </Link>
              </nav>
            </div>

            {/* Icons - Right */}
            <div className="w-1/4 flex items-center justify-end space-x-4">
              {session ? (
                <>
                  <Link
                    href="/dashboard/seller"
                    className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200"
                  >
                    Dashboard
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
                    >
                      <FaUser className="w-5 h-5" />
                      <FaCaretDown className="w-4 h-4" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                        <Link href="/dashboard/seller" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors">
                          Πίνακας Ελέγχου
                        </Link>
                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors">
                          Προφίλ
                        </Link>
                        <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors">
                          Ρυθμίσεις
                        </Link>
                        <Link href="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors">
                          Αλλαγή Ρόλων
                        </Link>
                        <button
                          onClick={() => signOut()}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                        >
                          Αποσύνδεση
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/seller/auth/login"
                    className="text-gray-600 hover:text-green-600 transition-colors"
                  >
                    Σύνδεση
                  </Link>
                  <Link
                    href="/seller/auth/register"
                    className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200"
                  >
                    Εγγραφή
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-900 to-emerald-900 text-white py-8 mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Σχετικά με εμάς</h3>
              <p className="text-white/90">
                Η πλατφόρμα ακινήτων που συνδέει αγοραστές, πωλητές και μεσίτες.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Γρήγοροι Σύνδεσμοι</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/properties" className="text-white/90 hover:text-white transition-colors">
                    Ακίνητα
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-white/90 hover:text-white transition-colors">
                    Σχετικά
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-white/90 hover:text-white transition-colors">
                    Επικοινωνία
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Επικοινωνία</h3>
              <ul className="space-y-2 text-white/90">
                <li>Email: info@realestate.com</li>
                <li>Τηλέφωνο: +30 210 1234567</li>
                <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Ακολουθήστε μας</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-white/90 hover:text-white transition-colors">
                  <FaFacebook className="w-6 h-6" />
                </a>
                <a href="#" className="text-white/90 hover:text-white transition-colors">
                  <FaTwitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-white/90 hover:text-white transition-colors">
                  <FaInstagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-white/90 hover:text-white transition-colors">
                  <FaLinkedin className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/90">
            <p>&copy; {new Date().getFullYear()} Real Estate Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SellerLayout; 