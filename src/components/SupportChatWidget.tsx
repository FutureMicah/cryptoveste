import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
  is_read: boolean;
}

export const SupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchMessages();
      ensureTicketExists();
      
      // Subscribe to realtime messages
      const channel = supabase
        .channel('support-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);
              if (newMsg.sender_type === 'admin') {
                if (isOpenRef.current) {
                  markMessagesAsRead();
                } else {
                  setUnreadCount((prev) => prev + 1);
                  toast({
                    title: "New support message",
                    description: "You have a new message from support",
                  });
                }
              }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      setUnreadCount(0);
      markMessagesAsRead();
    }
  }, [isOpen, unreadCount]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-support-chat", handler);
    return () => window.removeEventListener("open-support-chat", handler);
  }, []);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
      
      // Count unread admin messages
      const unread = (data || []).filter(m => m.sender_type === 'admin' && !m.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const ensureTicketExists = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress'])
        .single();

      if (!data) {
        await supabase.from('support_tickets').insert({
          user_id: user.id,
          subject: 'Support Chat',
          status: 'open',
        });
      }
    } catch (error) {
      // Ticket might not exist, create one
      await supabase.from('support_tickets').insert({
        user_id: user.id,
        subject: 'Support Chat',
        status: 'open',
      });
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('sender_type', 'admin')
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: user.id,
        message: messageText,
        sender_type: 'user',
      });

      if (error) throw error;
      setNewMessage('');

      // Get user profile for email notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      // Send admin email notification (fire and forget)
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'admin_support_alert',
          data: {
            userName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'User',
            userEmail: user.email,
            message: messageText,
          },
        },
      }).catch((emailError) => {
        console.error('Failed to send admin notification:', emailError);
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
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

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-black" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-black" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {unreadCount}
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
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[500px] bg-black/95 border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-b border-amber-500/30">
              <h3 className="text-amber-400 font-semibold">BlackPAL Support</h3>
              <p className="text-xs text-gray-400">We typically reply within minutes</p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start chatting</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          msg.sender_type === 'user'
                            ? 'bg-amber-500/20 text-amber-100 rounded-br-sm'
                            : msg.sender_type === 'system'
                            ? 'bg-blue-500/20 text-blue-100 rounded-bl-sm'
                            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                        }`}
                      >
                        {msg.sender_type !== 'user' && (
                          <p className="text-xs text-amber-400 mb-1 font-medium">
                            {msg.sender_type === 'system' ? 'System' : 'Support'}
                          </p>
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
            <div className="p-4 border-t border-amber-500/30 bg-black/50">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-900 border-gray-700 focus:border-amber-500 text-white"
                  disabled={sending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Or contact @Futuremicah on Telegram
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChatWidget;
