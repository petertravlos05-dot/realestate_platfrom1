'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminTransactionProgressModal from '@/components/AdminTransactionProgressModal';
import { fetchFromBackend } from '@/lib/api/client';

interface Transaction {
  id: string;
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  agent: {
    id: string;
    name: string;
    email: string;
  };
  property: {
    id: string;
    title: string;
    price: number;
  };
  status: string;
  created_at: string;
}

export default function AdminTransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: string;
    buyerName: string;
    propertyTitle: string;
  } | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetchFromBackend('/admin/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchTransactions();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Διαχείριση Συναλλαγών</h1>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Αγοραστής
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Μεσίτης
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ακίνητο
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Κατάσταση
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ημερομηνία
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ενέργειες
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.buyer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.buyer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.agent.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.agent.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transaction.property.title}</div>
                      <div className="text-sm text-gray-500">
                        {new Intl.NumberFormat('el-GR', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(transaction.property.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString('el-GR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedTransaction({
                          id: transaction.id,
                          buyerName: transaction.buyer.name,
                          propertyTitle: transaction.property.title
                        })}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ενημέρωση Προόδου
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedTransaction && (
        <AdminTransactionProgressModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          transactionId={selectedTransaction.id}
          buyerName={selectedTransaction.buyerName}
          propertyTitle={selectedTransaction.propertyTitle}
        />
      )}
    </div>
  );
} 