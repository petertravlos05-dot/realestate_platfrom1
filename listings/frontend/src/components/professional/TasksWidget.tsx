'use client';

import Link from 'next/link';
import { FaCheckCircle, FaFileAlt, FaCalendarAlt, FaEnvelope, FaSpinner } from 'react-icons/fa';
import { DealRoom } from '@/lib/api/deals';
import { DealAppointment } from '@/lib/api/dealAppointments';
import { DealDocument } from '@/lib/api/dealDocuments';
import { ProfessionalRequest } from '@/lib/api/professionals';

interface Task {
  id: string;
  title: string;
  type: 'document' | 'appointment' | 'request';
  due: 'today' | 'tomorrow' | 'thisWeek' | 'later';
  dealId: string;
  dealTitle?: string;
  icon: any;
  color: string;
}

interface TasksWidgetProps {
  deals: DealRoom[];
  appointments: DealAppointment[];
  documents: DealDocument[];
  requests: ProfessionalRequest[];
  loading?: boolean;
}

export default function TasksWidget({ deals, appointments, documents, requests, loading }: TasksWidgetProps) {
  const computeTasks = (): Task[] => {
    const tasks: Task[] = [];
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Documents pending review
    documents
      .filter(doc => doc.status === 'UPLOADED' || doc.status === 'CHANGES_REQUESTED')
      .forEach(doc => {
        const deal = deals.find(d => d.id === doc.dealRoomId);
        tasks.push({
          id: `doc-${doc.id}`,
          title: `Έλεγχος εγγράφου: ${doc.category}`,
          type: 'document',
          due: 'later',
          dealId: doc.dealRoomId,
          dealTitle: deal?.property?.title,
          icon: FaFileAlt,
          color: 'text-purple-600',
        });
      });

    // Upcoming appointments (preparation)
    appointments
      .filter(apt => apt.status === 'CONFIRMED')
      .forEach(apt => {
        const start = new Date(apt.startAt);
        const deal = deals.find(d => d.id === apt.dealRoomId);
        let due: Task['due'] = 'later';
        if (start.toDateString() === now.toDateString()) {
          due = 'today';
        } else if (start.toDateString() === tomorrow.toDateString()) {
          due = 'tomorrow';
        } else if (start <= weekFromNow) {
          due = 'thisWeek';
        }
        tasks.push({
          id: `apt-${apt.id}`,
          title: `Προετοιμασία ραντεβού`,
          type: 'appointment',
          due,
          dealId: apt.dealRoomId,
          dealTitle: deal?.property?.title,
          icon: FaCalendarAlt,
          color: 'text-green-600',
        });
      });

    // Pending professional requests
    requests
      .filter(req => req.status === 'REQUESTED')
      .forEach(req => {
        const deal = req.dealRoom;
        tasks.push({
          id: `req-${req.id}`,
          title: `Απάντηση σε αίτημα`,
          type: 'request',
          due: 'thisWeek',
          dealId: req.dealRoomId,
          dealTitle: deal?.property?.title,
          icon: FaEnvelope,
          color: 'text-yellow-600',
        });
      });

    // Sort by due priority
    const priority = { today: 0, tomorrow: 1, thisWeek: 2, later: 3 };
    return tasks.sort((a, b) => priority[a.due] - priority[b.due]);
  };

  const tasks = computeTasks();

  const getDueLabel = (due: Task['due']) => {
    const labels = {
      today: 'Σήμερα',
      tomorrow: 'Αύριο',
      thisWeek: 'Αυτή την εβδομάδα',
      later: 'Σύντομα',
    };
    return labels[due];
  };

  const getDueColor = (due: Task['due']) => {
    const colors = {
      today: 'text-red-600 bg-red-50',
      tomorrow: 'text-orange-600 bg-orange-50',
      thisWeek: 'text-yellow-600 bg-yellow-50',
      later: 'text-gray-600 bg-gray-50',
    };
    return colors[due];
  };

  const getTaskUrl = (task: Task) => {
    if (task.type === 'document') {
      return `/deals/${task.dealId}?tab=documents`;
    } else if (task.type === 'appointment') {
      return `/deals/${task.dealId}?tab=appointments`;
    } else {
      return `/professional/requests`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin text-2xl text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Υποχρεώσεις</h3>
      </div>

      <div className="p-6">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaCheckCircle className="text-4xl mx-auto mb-2 text-green-300" />
            <p>Δεν υπάρχουν εκκρεμότητες</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const Icon = task.icon;
              return (
                <Link
                  key={task.id}
                  href={getTaskUrl(task)}
                  className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`${task.color} mt-1`}>
                      <Icon />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getDueColor(task.due)}`}>
                          {getDueLabel(task.due)}
                        </span>
                      </div>
                      {task.dealTitle && (
                        <p className="text-sm text-gray-600">{task.dealTitle}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

