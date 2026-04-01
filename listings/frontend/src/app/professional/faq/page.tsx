import DynamicNavbar from '@/components/navigation/DynamicNavbar';
import ProfessionalFAQ from '@/components/professional/ProfessionalFAQ';

export default function ProfessionalFAQPage() {
  return (
    <>
      <DynamicNavbar />
      <div className="pt-16">
        <ProfessionalFAQ />
      </div>
    </>
  );
}
