import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  MessageSquarePlus,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
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
  } | null;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  sender_type: string;
  created_at: string;
  is_read: boolean;
}

export const SupportChatManagement = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('open');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    setSearchingUsers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, username')
        .order('created_at', { ascending: false })
        .limit(20);
      if (q.trim()) {
        query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,username.ilike.%${q}%`);
      }
      const { data } = await query;
      setUserResults((data as UserOption[]) || []);
    } finally {
      setSearchingUsers(false);
    }
  };

  const startChatWith = async (u: UserOption) => {
    setStartingChat(true);
    try {
      // Find an existing ticket for this user, or create one
      const { data: existing } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', u.id)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let ticket = existing;
      if (!ticket) {
        const { data: created, error } = await supabase
          .from('support_tickets')
          .insert({ user_id: u.id, status: 'open', subject: 'Admin initiated chat', priority: 'normal' })
          .select()
          .single();
        if (error) throw error;
        ticket = created;
      } else if (ticket.status === 'closed' || ticket.status === 'resolved') {
        await supabase.from('support_tickets').update({ status: 'open' }).eq('id', ticket.id);
        ticket = { ...ticket, status: 'open' };
      }

      setNewChatOpen(false);
      setUserSearch('');
      setActiveTab('all');
      setSelectedTicket({ ...ticket, profiles: u } as Ticket);
      fetchTickets();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not start chat', variant: 'destructive' });
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    
    // Subscribe to new tickets
    const ticketChannel = supabase
      .channel('admin-tickets')
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

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, [activeTab]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.user_id);
      
      // Subscribe to messages for selected ticket
      const messageChannel = supabase
        .channel(`admin-messages-${selectedTicket.user_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `user_id=eq.${selectedTicket.user_id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Fetch tickets and profiles separately due to RLS
      let ticketQuery = supabase
        .from('support_tickets')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (activeTab !== 'all') {
        ticketQuery = ticketQuery.eq('status', activeTab);
      }

      const { data: ticketsData, error } = await ticketQuery;
      if (error) throw error;

      // Fetch profiles for each ticket
      const ticketsWithProfiles = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, username')
            .eq('id', ticket.user_id)
            .single();
          return { ...ticket, profiles: profileData };
        })
      );

      setTickets(ticketsWithProfiles as Ticket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('support_messages').insert({
        user_id: selectedTicket.user_id,
        message: messageText,
        sender_type: 'admin',
        admin_id: user.id,
      });

      if (error) throw error;
      setNewMessage('');
      
      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
      }

      // Send email notification to user (fire and forget)
      supabase.functions.invoke('send-notification', {
        body: {
          userId: selectedTicket.user_id,
          type: 'new_support_message',
          data: {
            message: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
          },
        },
      }).catch((emailError) => {
        console.error('Failed to send user notification:', emailError);
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

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;
      
      toast({
        title: "Status Updated",
        description: `Ticket marked as ${status}`,
      });
      
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: status as any });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Open</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Resolved</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>;
      case 'normal':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Normal</Badge>;
      case 'low':
        return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">Low</Badge>;
      default:
        return null;
    }
  };

  const getUserName = (ticket: Ticket) => {
    if (ticket.profiles?.first_name || ticket.profiles?.last_name) {
      return `${ticket.profiles.first_name || ''} ${ticket.profiles.last_name || ''}`.trim();
    }
    return ticket.profiles?.username || 'Unknown User';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      {/* Tickets List */}
      <Card className="lg:col-span-1 bg-black/50 border-amber-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Support Tickets
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setNewChatOpen(true); searchUsers(''); }}
                className="text-amber-400 hover:text-amber-300"
                title="Message a client first"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchTickets}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-gray-900/50 rounded-none border-b border-gray-800">
              <TabsTrigger value="open" className="flex-1 text-xs">Open</TabsTrigger>
              <TabsTrigger value="in_progress" className="flex-1 text-xs">Active</TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1 text-xs">Resolved</TabsTrigger>
              <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <ScrollArea className="h-[550px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tickets found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left hover:bg-gray-900/50 transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white text-sm">
                        {getUserName(ticket)}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {format(new Date(ticket.last_message_at), 'MMM d, HH:mm')}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2 bg-black/50 border-amber-500/20 flex flex-col">
        {selectedTicket ? (
          <>
            <CardHeader className="pb-2 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-400" />
                    {getUserName(selectedTicket)}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedTicket.status !== 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                      className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type !== 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl ${
                            msg.sender_type === 'user'
                              ? 'bg-gray-800 text-gray-100 rounded-bl-sm'
                              : msg.sender_type === 'system'
                              ? 'bg-blue-500/20 text-blue-100 rounded-br-sm'
                              : 'bg-amber-500/20 text-amber-100 rounded-br-sm'
                          }`}
                        >
                          <p className="text-xs opacity-60 mb-1">
                            {msg.sender_type === 'user' ? 'User' : msg.sender_type === 'system' ? 'System' : 'You'}
                          </p>
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

              <div className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your reply..."
                    className="flex-1 bg-gray-900 border-gray-700 focus:border-amber-500 text-white"
                    disabled={sending || selectedTicket.status === 'closed'}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending || selectedTicket.status === 'closed'}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Select a ticket to view the conversation</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* New chat: message a client first */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="bg-gray-950 border-amber-500/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5" />
              Message a client
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <Input
              value={userSearch}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search by name or username..."
              className="pl-9 bg-gray-900 border-gray-700 focus:border-amber-500 text-white"
            />
          </div>
          <ScrollArea className="h-[320px] mt-2">
            {searchingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              </div>
            ) : userResults.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">No clients found</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startChatWith(u)}
                    disabled={startingChat}
                    className="w-full p-3 text-left hover:bg-gray-900/60 transition-colors flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'Unknown'}
                      </p>
                      {u.username && <p className="text-xs text-gray-500 truncate">@{u.username}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportChatManagement;
