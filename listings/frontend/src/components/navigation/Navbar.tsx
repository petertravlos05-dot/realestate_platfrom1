import NotificationBell from '@/components/notifications/NotificationBell';

export default function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <NotificationBell />
          </div>
        </div>
      </div>
    </nav>
  );
} 