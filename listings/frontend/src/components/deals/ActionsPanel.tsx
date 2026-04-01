'use client';

import { DealRoom } from '@/lib/api/deals';
import { FaCheckCircle, FaCircle, FaChevronRight, FaUserTie, FaFileAlt, FaCalendarAlt, FaComments } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import CardSection from './ui/CardSection';

interface ActionsPanelProps {
  deal: DealRoom;
  onRefresh: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'done';
  action: () => void;
  icon: React.ReactNode;
}

export default function ActionsPanel({ deal, onRefresh }: ActionsPanelProps) {
  const { userId } = useCurrentUser();
  const router = useRouter();

  // Check user role
  const userRole = deal.participants?.find((p) => p.userId === userId)?.role;
  const isBuyer = userRole === 'BUYER';

  // Compute tasks for buyer
  const computeTasks = (): Task[] => {
    if (!isBuyer) return [];

    const tasks: Task[] = [];

    // Task 1: Accept/choose professionals
    const hasAcceptedProfessional = deal.requests?.some((r) => r.status === 'ACCEPTED');
    const pendingRequests = deal.requests?.filter((r) => r.status === 'REQUESTED').length || 0;
    
    if (!hasAcceptedProfessional && pendingRequests === 0) {
      tasks.push({
        id: 'choose-professional',
        title: 'Επίλεξε Δικηγόρο/Συμβολαιογράφο',
        description: 'Επίλεξε επαγγελματία για να συνεχίσεις',
        status: 'todo',
        action: () => router.push(`/deals/${deal.id}?tab=professionals`),
        icon: <FaUserTie className="text-blue-600" />,
      });
    } else if (pendingRequests > 0) {
      tasks.push({
        id: 'wait-professional',
        title: `Αναμονή Απάντησης Επαγγελματία (${pendingRequests})`,
        description: 'Σε αναμονή για αποδοχή αιτήματος',
        status: 'todo',
        action: () => router.push(`/deals/${deal.id}?tab=professionals`),
        icon: <FaUserTie className="text-yellow-600" />,
      });
    } else if (hasAcceptedProfessional) {
      tasks.push({
        id: 'professional-accepted',
        title: 'Επαγγελματίας Επιλεγμένος',
        description: 'Ο επαγγελματίας έχει αποδεχτεί',
        status: 'done',
        action: () => router.push(`/deals/${deal.id}?tab=professionals`),
        icon: <FaUserTie className="text-green-600" />,
      });
    }

    // Task 2: Upload requested documents
    const pendingDocs = deal.documents?.filter(
      (d) => d.status === 'REQUESTED' && d.requestedFromRole === 'BUYER'
    ) || [];
    
    if (pendingDocs.length > 0) {
      tasks.push({
        id: 'upload-docs',
        title: `Ανέβασε Έγγραφα (${pendingDocs.length})`,
        description: `${pendingDocs.length} έγγραφα σε αναμονή ανέβασματος`,
        status: 'todo',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        icon: <FaFileAlt className="text-blue-600" />,
      });
    }

    // Task 3: Review notes (if any doc rejected)
    const rejectedDocs = deal.documents?.filter((d) => d.status === 'CHANGES_REQUESTED') || [];
    if (rejectedDocs.length > 0) {
      tasks.push({
        id: 'review-docs',
        title: `Αναθεώρηση Εγγράφων (${rejectedDocs.length})`,
        description: 'Υπάρχουν έγγραφα που χρειάζονται αναθεώρηση',
        status: 'todo',
        action: () => router.push(`/deals/${deal.id}?tab=documents`),
        icon: <FaFileAlt className="text-yellow-600" />,
      });
    }

    // Task 4: Book appointment
    const upcomingAppointment = deal.appointments?.find(
      (a) => a.status === 'CONFIRMED' && new Date(a.startAt) > new Date()
    );
    const requestedAppointments = deal.appointments?.filter((a) => a.status === 'REQUESTED').length || 0;

    if (!upcomingAppointment && requestedAppointments === 0) {
      tasks.push({
        id: 'book-appointment',
        title: 'Κλείσε Ραντεβού',
        description: 'Προγραμμάτισε ραντεβού με τον επαγγελματία',
        status: 'todo',
        action: () => router.push(`/deals/${deal.id}?tab=appointments`),
        icon: <FaCalendarAlt className="text-blue-600" />,
      });
    } else if (requestedAppointments > 0) {
      tasks.push({
        id: 'wait-appointment',
        title: `Αναμονή Επιβεβαίωσης Ραντεβού (${requestedAppointments})`,
        description: 'Σε αναμονή για επιβεβαίωση',
        status: 'todo',
        action: () => router.push(`/deals/${deal.id}?tab=appointments`),
        icon: <FaCalendarAlt className="text-yellow-600" />,
      });
    } else if (upcomingAppointment) {
      tasks.push({
        id: 'appointment-scheduled',
        title: 'Ραντεβού Προγραμματισμένο',
        description: `Ραντεβού στις ${new Date(upcomingAppointment.startAt).toLocaleDateString('el-GR')}`,
        status: 'done',
        action: () => router.push(`/deals/${deal.id}?tab=appointments`),
        icon: <FaCalendarAlt className="text-green-600" />,
      });
    }

    // Task 5: Open chat (always available)
    const unreadMessages = 0; // TODO: Get from SSE snapshot
    tasks.push({
      id: 'open-chat',
      title: unreadMessages > 0 ? `Νέα Μηνύματα (${unreadMessages})` : 'Άνοιξε Συνομιλία',
      description: 'Επικοινώνησε με τους συμμετέχοντες',
      status: 'todo',
      action: () => router.push(`/deals/${deal.id}?tab=chat`),
      icon: <FaComments className="text-blue-600" />,
    });

    return tasks;
  };

  const tasks = computeTasks();
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  if (!isBuyer) {
    return null;
  }

  return (
    <CardSection title="Επόμενα Βήματα">
      {tasks.length === 0 ? (
        <div className="text-center py-4">
          <FaCheckCircle className="text-green-500 text-2xl mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Όλα τα βήματα ολοκληρώθηκαν!</p>
          <p className="text-xs text-gray-500 mt-1">Η συναλλαγή προχωράει κανονικά</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Todo Tasks */}
          {todoTasks.map((task) => (
            <button
              key={task.id}
              onClick={task.action}
              className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex-shrink-0">{task.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <FaCircle className="text-[10px] text-gray-400 flex-shrink-0" />
                    <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>
                </div>
                <FaChevronRight className="text-xs text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          ))}

          {/* Done Tasks (collapsed) */}
          {doneTasks.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 py-1 focus:outline-none">
                  Ολοκληρωμένα ({doneTasks.length})
                </summary>
                <div className="mt-2 space-y-1.5">
                  {doneTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={task.action}
                      className="w-full text-left p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors opacity-75 focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                      <div className="flex items-start gap-2">
                        <FaCheckCircle className="text-xs text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-medium text-gray-600 line-through">{task.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </CardSection>
  );
}

