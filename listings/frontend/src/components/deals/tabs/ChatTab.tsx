'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { DealRoom } from '@/lib/api/deals';
import { listThreads, listMessages, sendMessage, createDirectThread, DealThread, DealMessage } from '@/lib/api/dealChat';
import { toast } from 'react-hot-toast';
import { FaSpinner, FaPaperPlane, FaComments, FaUsers, FaUserTie, FaCircle, FaLock, FaExpand, FaCompress } from 'react-icons/fa';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { isAgent, isBuyer, isSeller } from '@/lib/utils/dealRole';
import { useDealRoomTheme } from '../useDealRoomTheme';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatTabProps {
  deal: DealRoom;
  onRefresh: () => void;
}

interface ProfessionalInfo {
  id: string;
  userId: string;
  name: string;
  type: 'LAWYER' | 'NOTARY' | 'ENGINEER';
  displayName?: string;
  requestedById?: string;
  lastSeen?: string; // ISO date string
  isOnline?: boolean;
}

export default function ChatTab({ deal, onRefresh }: ChatTabProps) {
  const { userId } = useCurrentUser();
  const { accentGradient, accentHover, accentIcon, accentBorder, accentSelectedBg } = useDealRoomTheme();
  const isAgentRole = isAgent(deal, userId);
  const isBuyerRole = isBuyer(deal, userId);
  const isSellerRole = isSeller(deal, userId);
  const sellerId = deal.sellerId || deal.participants?.find(p => p.role === 'SELLER')?.userId;
  const [threads, setThreads] = useState<DealThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<DealThread | null>(null);
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingThread, setCreatingThread] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract professionals from deal (with requestedById for filtering)
  const allProfessionals = useMemo<ProfessionalInfo[]>(() => {
    const profs: ProfessionalInfo[] = [];
    
    // Check accepted requests - include requestedById for chat filtering
    // Use professional.userId (User.id) - required for createDirectThread; fallback to professional.user?.id
    deal.requests?.forEach((request) => {
      if (request.status === 'ACCEPTED' && request.professional) {
        const profUserId = (request.professional as { userId?: string }).userId ?? request.professional.user?.id;
        if (!profUserId) return; // Skip if no valid User.id
        const reqById = request.requestedById ?? request.requestedBy?.id;
        profs.push({
          id: request.professional.id,
          userId: profUserId,
          name: request.professional.user?.name ?? 'Professional',
          type: request.type,
          displayName: request.professional.displayName,
          requestedById: reqById,
          isOnline: Math.random() > 0.5,
          lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        });
      }
    });

    // Also check participants (fallback, use request data for requestedById when available)
    deal.participants?.forEach((participant) => {
      if ((participant.role === 'LAWYER' || participant.role === 'NOTARY' || participant.role === 'ENGINEER') && participant.user) {
        const existing = profs.find(p => p.userId === participant.userId);
        if (!existing) {
          const req = deal.requests?.find(r => r.status === 'ACCEPTED' && r.professional?.user?.id === participant.userId);
          profs.push({
            id: participant.id,
            userId: participant.userId,
            name: participant.user.name,
            type: participant.role as 'LAWYER' | 'NOTARY' | 'ENGINEER',
            displayName: participant.user.professionalProfile?.displayName,
            requestedById: req?.requestedById ?? req?.requestedBy?.id,
            isOnline: Math.random() > 0.5,
            lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          });
        }
      }
    });

    return profs;
  }, [deal]);

  // Filter professionals by role: seller sees only their own (requestedById === sellerId), buyer sees only their own
  const professionals = useMemo<ProfessionalInfo[]>(() => {
    if (isSellerRole && sellerId) {
      return allProfessionals.filter(p => p.requestedById === sellerId);
    }
    if (isBuyerRole && deal.buyerId) {
      return allProfessionals.filter(p => p.requestedById === deal.buyerId);
    }
    // Agent, notary, lawyer, engineer: show all (or empty - they have their own view)
    return allProfessionals;
  }, [allProfessionals, isSellerRole, isBuyerRole, sellerId, deal.buyerId]);

  useEffect(() => {
    fetchThreads();
  }, [deal.id]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id);
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const response = await listThreads(deal.id);
      setThreads(response.threads);
      
      // Only set default (group) when no thread is selected - preserve user's selection on refresh
      setSelectedThread((prev) => {
        if (prev) return prev;
        const groupThread = response.threads.find((t) => t.type === 'GROUP');
        return groupThread || response.threads[0] || null;
      });
    } catch (error: any) {
      console.error('Error fetching threads:', error);
      toast.error(error.message || 'Αποτυχία φόρτωσης συνομιλιών');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      const response = await listMessages(threadId, { limit: 50 });
      setMessages(response.items);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error(error.message || 'Αποτυχία φόρτωσης μηνυμάτων');
    }
  };

  const handleCreateDirectThread = async (professionalUserId: string) => {
    try {
      setCreatingThread(professionalUserId);
      const newThread = await createDirectThread(deal.id, professionalUserId);
      setThreads((prev) => [...prev, newThread]);
      setSelectedThread(newThread);
      toast.success('Συνομιλία δημιουργήθηκε');
    } catch (error: any) {
      console.error('Error creating thread:', error);
      toast.error(error.message || 'Αποτυχία δημιουργίας συνομιλίας');
    } finally {
      setCreatingThread(null);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedThread || !messageBody.trim()) return;

    try {
      setSending(true);
      const newMessage = await sendMessage(selectedThread.id, messageBody);
      setMessages((prev) => [...prev, newMessage]);
      setMessageBody('');
      // Don't call onRefresh() - it can trigger parent re-render and reset selectedThread to group
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Αποτυχία αποστολής μηνύματος');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Ποτέ';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `Πριν ${diffMins} λεπτά`;
    if (diffHours < 24) return `Πριν ${diffHours} ώρες`;
    if (diffDays === 1) return 'Χθες';
    if (diffDays < 7) return `Πριν ${diffDays} ημέρες`;
    return date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
  };

  const getThreadInfo = (thread: DealThread) => {
    if (thread.type === 'GROUP') {
      return {
        title: 'Ομαδική Συνομιλία',
        subtitle: 'Όλοι οι συμμετέχοντες',
        icon: <FaUsers className="w-4 h-4" />,
        isGroup: true,
      };
    }

    // Find professional for direct thread
    const professional = professionals.find((p) => {
      return thread.members?.some((m) => m.userId === p.userId && m.userId !== userId);
    });

    if (professional) {
      return {
        title: professional.displayName || professional.name,
        subtitle: 'Προσωπική Συνομιλία',
        icon: <FaUserTie className="w-4 h-4" />,
        isGroup: false,
        professional,
      };
    }

    return {
      title: thread.title || 'Άμεση Συνομιλία',
      subtitle: 'Προσωπική Συνομιλία',
      icon: <FaUserTie className="w-4 h-4" />,
      isGroup: false,
    };
  };

  const getProfessionalThread = (professional: ProfessionalInfo) => {
    return threads.find((t) => {
      if (t.type !== 'DIRECT') return false;
      return t.members?.some((m) => m.userId === professional.userId);
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Φόρτωση συνομιλιών...</p>
      </div>
    );
  }

  const chatContainerClasses = isFullscreen
    ? 'fixed inset-0 z-[9999] flex flex-col h-screen w-screen bg-white rounded-none shadow-none overflow-hidden'
    : 'flex flex-col h-full min-h-[600px] max-h-[800px] bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200';

  return (
    <div className={chatContainerClasses}>
      <div className="flex flex-1 overflow-hidden">
        {/* Threads Sidebar */}
        <div className="w-72 border-r border-gray-200 overflow-y-auto bg-gradient-to-b from-gray-50 via-white to-gray-50 flex-shrink-0">
          <div className="p-5 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <FaComments className="text-blue-600" />
              Συνομιλίες
            </h3>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              title={isFullscreen ? 'Εξόδος πλήρους οθόνης' : 'Πλήρης οθόνη'}
            >
              {isFullscreen ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
            </button>
          </div>

          <div className="p-3 space-y-1">
            {/* Group Chat - Always show */}
            {threads.find((t) => t.type === 'GROUP') ? (
              <ThreadButton
                thread={threads.find((t) => t.type === 'GROUP')!}
                isSelected={selectedThread?.id === threads.find((t) => t.type === 'GROUP')?.id}
                onClick={() => setSelectedThread(threads.find((t) => t.type === 'GROUP')!)}
                accentIcon={accentIcon}
                accentBorder={accentBorder}
                accentSelectedBg={accentSelectedBg}
                info={getThreadInfo(threads.find((t) => t.type === 'GROUP')!)}
              />
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center border border-dashed border-gray-300 rounded-lg">
                Ομαδική συνομιλία θα δημιουργηθεί αυτόματα
              </div>
            )}

            {/* Direct Threads with Professionals (buyer: their lawyer/notary, seller: their lawyer/engineer) */}
            {(isBuyerRole || isSellerRole) && professionals.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <FaLock className="w-3 h-3" />
                    Προσωπικές Συνομιλίες
                  </div>
                </div>
                {professionals.map((professional) => {
                  const existingThread = getProfessionalThread(professional);
                  if (existingThread) {
                    return (
                      <ThreadButton
                        key={professional.id}
                        thread={existingThread}
                        isSelected={selectedThread?.id === existingThread.id}
                        onClick={() => setSelectedThread(existingThread)}
                        accentIcon={accentIcon}
                        accentBorder={accentBorder}
                        accentSelectedBg={accentSelectedBg}
                        info={getThreadInfo(existingThread)}
                      />
                    );
                  } else {
                    return (
                      <button
                        key={professional.id}
                        onClick={() => handleCreateDirectThread(professional.userId)}
                        disabled={creatingThread === professional.userId}
                        className="w-full text-left p-4 rounded-xl hover:bg-blue-50 transition-all border border-gray-200 hover:border-blue-300 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {professional.name.charAt(0).toUpperCase()}
                            </div>
                            {professional.isOnline && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
                              {professional.displayName || professional.name}
                              {professional.type === 'LAWYER' && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                  Δικηγόρος
                                </span>
                              )}
                              {professional.type === 'NOTARY' && (
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                  Συμβολαιογράφος
                                </span>
                              )}
                              {professional.type === 'ENGINEER' && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                                  Μηχανικός
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mb-1">Προσωπική Συνομιλία</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              {professional.isOnline ? (
                                <>
                                  <FaCircle className="w-2 h-2 text-green-500" />
                                  <span>Online</span>
                                </>
                              ) : (
                                <>
                                  <span>Τελευταία φορά: {formatLastSeen(professional.lastSeen)}</span>
                                </>
                              )}
                            </div>
                            {creatingThread === professional.userId && (
                              <div className="mt-2 flex items-center gap-2 text-blue-600 text-xs">
                                <FaSpinner className="animate-spin" />
                                <span>Δημιουργία συνομιλίας...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  }
                })}
              </>
            )}

            {/* Existing Direct Threads (non-professional) */}
            {threads
              .filter((t) => t.type === 'DIRECT' && !professionals.some((p) => getProfessionalThread(p)?.id === t.id))
              .map((thread) => (
                <ThreadButton
                  key={thread.id}
                  thread={thread}
                  isSelected={selectedThread?.id === thread.id}
                  onClick={() => setSelectedThread(thread)}
                  accentIcon={accentIcon}
                  accentBorder={accentBorder}
                  accentSelectedBg={accentSelectedBg}
                  info={getThreadInfo(thread)}
                />
              ))}
          </div>

          {threads.length === 0 && professionals.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">
              <FaComments className="text-3xl text-gray-300 mx-auto mb-3" />
              <p>Δεν υπάρχουν συνομιλίες</p>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10 shadow-sm">
                {(() => {
                  const info = getThreadInfo(selectedThread);
                  return (
                    <div className="flex items-center gap-4 justify-between">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accentIcon} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                          {info.isGroup ? (
                            <FaUsers className="w-6 h-6" />
                          ) : (
                            info.professional?.name.charAt(0).toUpperCase() || '?'
                          )}
                        </div>
                        {info.professional?.isOnline && !info.isGroup && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg truncate">{info.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-600">{info.subtitle}</p>
                          {info.professional && (
                            <>
                              <span className="text-gray-400">•</span>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                {info.professional.isOnline ? (
                                  <>
                                    <FaCircle className="w-2 h-2 text-green-500" />
                                    <span>Online</span>
                                  </>
                                ) : (
                                  <span>Τελευταία φορά: {formatLastSeen(info.professional.lastSeen)}</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2.5 rounded-lg hover:bg-gray-200/80 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                        title={isFullscreen ? 'Εξόδος πλήρους οθόνης' : 'Πλήρης οθόνη'}
                      >
                        {isFullscreen ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-4xl mx-auto space-y-6">
                  <AnimatePresence>
                    {messages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-gray-500 py-16"
                      >
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FaComments className="text-3xl text-blue-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">Δεν υπάρχουν μηνύματα ακόμα</p>
                        <p className="text-sm text-gray-500">Ξεκινήστε τη συνομιλία!</p>
                      </motion.div>
                    ) : (
                      messages.map((message, index) => {
                        const isOwnMessage = message.senderId === userId;
                        const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                        const timeDiff = index > 0 
                          ? new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime()
                          : Infinity;
                        const showDateSeparator = timeDiff > 300000; // 5 minutes

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                          >
                            {showAvatar && (
                              <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${accentIcon} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                                  {message.sender?.name.charAt(0).toUpperCase() || '?'}
                                </div>
                              </div>
                            )}
                            {!showAvatar && <div className="w-10"></div>}
                            <div className={`flex-1 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
                              {showAvatar && (
                                <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {message.sender?.name || 'Άγνωστος'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(message.createdAt).toLocaleTimeString('el-GR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              )}
                              <div
                                className={`rounded-2xl px-4 py-3 shadow-sm max-w-[70%] ${
                                  isOwnMessage
                                    ? `bg-gradient-to-r ${accentGradient} text-white`
                                    : 'bg-white text-gray-900 border border-gray-200'
                                }`}
                              >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {message.body}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              {!isAgentRole && (
                <div className="p-5 border-t border-gray-200 bg-white">
                  <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                      type="text"
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Γράψτε ένα μήνυμα..."
                      className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                      disabled={sending}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendMessage}
                      disabled={sending || !messageBody.trim()}
                      className={`px-6 py-3 bg-gradient-to-r ${accentGradient} text-white rounded-2xl ${accentHover} disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center min-w-[60px]`}
                    >
                      {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Read-only notice for agent */}
              {isAgentRole && (
                <div className="p-5 border-t border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-purple-700">
                    <FaComments className="text-lg" />
                    <p className="text-sm font-medium">Προβολή μόνο - Δεν μπορείτε να στείλετε μηνύματα</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaComments className="text-4xl text-blue-400" />
                </div>
                <p className="text-xl font-semibold text-gray-900 mb-2">Επιλέξτε μια συνομιλία</p>
                <p className="text-sm text-gray-500">Ξεκινήστε τη συνομιλία επιλέγοντας ένα thread</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ThreadButtonProps {
  thread: DealThread;
  isSelected: boolean;
  onClick: () => void;
  accentIcon?: string;
  accentBorder?: string;
  accentSelectedBg?: string;
  info: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    isGroup: boolean;
    professional?: ProfessionalInfo;
  };
}

function ThreadButton({ thread, isSelected, onClick, accentIcon = 'from-blue-500 to-indigo-600', accentBorder = 'border-blue-600', accentSelectedBg = 'from-blue-50 to-indigo-50', info }: ThreadButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all ${
        isSelected
          ? `bg-gradient-to-r ${accentSelectedBg} border-2 ${accentBorder} shadow-md`
          : 'hover:bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
            info.isGroup 
              ? `bg-gradient-to-br ${accentIcon}` 
              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
          }`}>
            {info.isGroup ? (
              <FaUsers className="w-5 h-5" />
            ) : (
              info.professional?.name.charAt(0).toUpperCase() || '?'
            )}
          </div>
          {info.professional?.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm mb-1 truncate flex items-center gap-2">
            {info.title}
            {info.professional?.type === 'LAWYER' && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium flex-shrink-0">
                Δικηγόρος
              </span>
            )}
            {info.professional?.type === 'NOTARY' && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex-shrink-0">
                Συμβολαιογράφος
              </span>
            )}
            {info.professional?.type === 'ENGINEER' && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex-shrink-0">
                Μηχανικός
              </span>
            )}
          </div>
          <div className="text-xs text-gray-600 mb-1">{info.subtitle}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {thread._count?.messages || 0} μηνύματα
            </div>
            {info.professional && (
              <div className="text-xs text-gray-400 flex items-center gap-1">
                {info.professional.isOnline ? (
                  <>
                    <FaCircle className="w-2 h-2 text-green-500" />
                    <span>Online</span>
                  </>
                ) : (
                  <span className="truncate max-w-[100px]">
                    {(() => {
                      if (!info.professional.lastSeen) return 'Ποτέ';
                      const date = new Date(info.professional.lastSeen);
                      const now = new Date();
                      const diffMs = now.getTime() - date.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);
                      if (diffMins < 5) return 'Online';
                      if (diffMins < 60) return `Πριν ${diffMins} λεπτά`;
                      if (diffHours < 24) return `Πριν ${diffHours} ώρες`;
                      if (diffDays === 1) return 'Χθες';
                      if (diffDays < 7) return `Πριν ${diffDays} ημέρες`;
                      return date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
                    })()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}