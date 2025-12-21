import Link from 'next/link';

const LandingHeader = () => {
  return (
    <header className="fixed w-full bg-gradient-to-b from-[#001f3f]/90 to-transparent backdrop-blur-sm z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-300 transition-colors">
            RealEstate
          </Link>
          <nav className="hidden md:flex space-x-8">
            <Link href="/properties" className="text-white/90 hover:text-white transition-colors text-lg">
              Αναζήτηση
            </Link>
            <Link href="/about" className="text-white/90 hover:text-white transition-colors text-lg">
              Σχετικά
            </Link>
            <Link href="/contact" className="text-white/90 hover:text-white transition-colors text-lg">
              Επικοινωνία
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader; 