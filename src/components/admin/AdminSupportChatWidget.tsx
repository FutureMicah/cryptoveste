import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  user_id: string;
  message: string;
  sender_type: string;
  created_at: string;
  is_read: boolean;
}

interface Ticket {
  id: string;
  user_id: string;
  status: string;
  subject: string | null;
  priority: string;
  last_message_at: string;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    email: string | null;
  } | null;
  user_email?: string | null;
}

export const AdminSupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserList, setShowUserList] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const { user, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const roles = (data ?? []).map((r) => r.role);
      const isAdminUser = roles.includes('admin') || roles.includes('super_admin');
      setIsAdmin(isAdminUser);
    };

    checkAdmin();
  }, [user]);

  // Load tickets and subscribe to changes
  useEffect(() => {
    if (!isAdmin || !user) return;

    fetchTickets();

    // Subscribe to ticket changes
    const ticketChannel = supabase
      .channel('admin-widget-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    // Subscribe to new messages to update unread count
    const messageChannel = supabase
      .channel('admin-widget-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_type === 'user' && !newMsg.is_read) {
            setUnreadCount((prev) => prev + 1);
            // Refresh selected ticket if it matches
            if (selectedTicket?.user_id === newMsg.user_id) {
              setMessages((prev) => [...prev, newMsg]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [isAdmin, user, selectedTicket]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchTickets = async () => {
    if (!isAdmin) return;
    setTicketsLoading(true);
    try {
      // Use join to fetch tickets with profile data in one query
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          user_id,
          status,
          subject,
          priority,
          last_message_at,
          created_at,
          profiles!inner(
            first_name,
            last_name,
            username,
            email
          )
        `)
        .in('status', ['open', 'in_progress'])
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        setTickets([]);
        setTicketsLoading(false);
        return;
      }

      // Map the response to match our Ticket interface
      let mappedTickets = (ticketsData || []).map((ticket: any) => ({
        id: ticket.id,
        user_id: ticket.user_id,
        status: ticket.status,
        subject: ticket.subject,
        priority: ticket.priority,
        last_message_at: ticket.last_message_at,
        created_at: ticket.created_at,
        profiles: ticket.profiles?.[0] || ticket.profiles || null,
        user_email: null,
      }));

      // Fetch emails from auth.users for all tickets
      try {
        const userIds = mappedTickets.map(t => t.user_id);
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (!authError && authUsers?.users) {
          const emailMap = new Map<string, string | undefined>(
            authUsers.users.map((u): [string, string | undefined] => [u.id, u.email]),
          );
          mappedTickets = mappedTickets.map(ticket => ({
            ...ticket,
            user_email: emailMap.get(ticket.user_id) || null,
          }));
        }
      } catch (authError) {
        console.warn('Could not fetch auth emails (may require admin API key):', authError);
      }

      setTickets(mappedTickets as Ticket[]);

      // Count unread
      const { count } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_type', 'user')
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);

      // Mark user messages as read
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('sender_type', 'user')
        .eq('is_read', false);

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowUserList(false);
    fetchMessages(ticket.user_id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user || sending) return;

    setSending(true);
    const messageText = newMessage.trim();

    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: selectedTicket.user_id,
        message: messageText,
        sender_type: 'admin',
        admin_id: user.id,
      });

      if (error) throw error;
      setNewMessage('');

      // Update ticket status to in_progress if open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
      }

      // Send notification to user (fire and forget)
      supabase.functions
        .invoke('send-notification', {
          body: {
            userId: selectedTicket.user_id,
            type: 'new_support_message',
            data: {
              message:
                messageText.length > 100
                  ? messageText.substring(0, 100) + '...'
                  : messageText,
            },
          },
        })
        .catch((emailError) => {
          console.error('Failed to send user notification:', emailError);
        });

      // Refresh tickets to update UI
      fetchTickets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserName = (ticket: Ticket) => {
    if (ticket.profiles?.first_name || ticket.profiles?.last_name) {
      return `${ticket.profiles.first_name || ''} ${ticket.profiles.last_name || ''}`.trim();
    }
    return ticket.profiles?.username || 'Unknown User';
  };

  const getUserEmail = (ticket: Ticket) => {
    return ticket.user_email || ticket.profiles?.email || 'No email';
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery.trim()) return true;
    const name = getUserName(ticket).toLowerCase();
    const email = getUserEmail(ticket).toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <Users className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 h-[600px] bg-black/95 border border-blue-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-b border-blue-500/30">
              <h3 className="text-blue-400 font-semibold">Support Admin Panel</h3>
              <p className="text-xs text-gray-400">
                {selectedTicket ? 'Conversation' : `${unreadCount} unread messages`}
              </p>
            </div>

            {/* Main Content */}
            {selectedTicket && !showUserList ? (
              <>
                {/* Chat View */}
                <div className="p-4 border-b border-blue-500/30 bg-black/50">
                  <button
                    onClick={() => {
                      setShowUserList(true);
                      setSelectedTicket(null);
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    ← Back to tickets
                  </button>
                  <div className="mt-2">
                    <p className="font-semibold text-white">{getUserName(selectedTicket)}</p>
                    <p className="text-xs text-gray-400">{getUserEmail(selectedTicket)}</p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-2xl ${
                              msg.sender_type === 'admin'
                                ? 'bg-blue-500/20 text-blue-100 rounded-br-sm'
                                : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                            }`}
                          >
                            {msg.sender_type !== 'admin' && (
                              <p className="text-xs text-gray-400 mb-1 font-medium">User</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs opacity-50 mt-1">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-blue-500/30 bg-black/50">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your reply..."
                      className="flex-1 bg-gray-900 border-gray-700 focus:border-blue-500 text-white"
                      disabled={sending || selectedTicket.status === 'closed'}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending || selectedTicket.status === 'closed'}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Tickets List View */}
                <div className="p-4 border-b border-blue-500/30 bg-black/50">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="pl-9 bg-gray-900 border-gray-700 focus:border-blue-500 text-white text-sm"
                    />
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center text-gray-500 p-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No tickets found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {filteredTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => selectTicket(ticket)}
                          className="w-full p-4 text-left hover:bg-blue-500/10 transition-colors border-l-2 border-transparent hover:border-blue-500"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white text-sm truncate">
                                {getUserName(ticket)}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {getUserEmail(ticket)}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    ticket.status === 'open'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}
                                >
                                  {ticket.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(ticket.last_message_at), 'HH:mm')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminSupportChatWidget;
