import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  GraduationCap, ArrowLeft, Globe, Send, MessageSquare, Search, Circle
} from 'lucide-react';

interface Conversation {
  user_id: string;
  full_name: string;
  avatar_url: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  job_title?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  created_at: string;
  job_id: string | null;
}

export default function Messages() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(searchParams.get('with'));
  const [selectedUserInfo, setSelectedUserInfo] = useState<{ full_name: string; avatar_url: string } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const currentJobId = searchParams.get('job');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchConversations();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (selectedUser && user) {
      fetchMessages(selectedUser);
      fetchUserInfo(selectedUser);
      markAsRead(selectedUser);
    }
  }, [selectedUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (selectedUser === newMsg.sender_id) {
            setMessages(prev => [...prev, newMsg]);
            markAsRead(newMsg.sender_id);
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get all messages where user is sender or receiver
    const { data: allMessages } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at, is_read, job_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!allMessages) {
      setLoading(false);
      return;
    }

    // Group by other user
    const conversationMap = new Map<string, { messages: typeof allMessages[0][]; unread: number }>();
    
    allMessages.forEach(msg => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, { messages: [], unread: 0 });
      }
      conversationMap.get(otherId)!.messages.push(msg);
      if (!msg.is_read && msg.receiver_id === user.id) {
        conversationMap.get(otherId)!.unread++;
      }
    });

    // Fetch user profiles
    const userIds = Array.from(conversationMap.keys());
    if (userIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const convs: Conversation[] = [];
    conversationMap.forEach((data, oderId) => {
      const profile = profiles?.find(p => p.id === oderId);
      if (profile) {
        convs.push({
          user_id: oderId,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url || '',
          last_message: data.messages[0].content,
          last_message_time: data.messages[0].created_at,
          unread_count: data.unread,
        });
      }
    });

    // Sort by last message time
    convs.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

    setConversations(convs);
    setLoading(false);
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const fetchUserInfo = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (data) setSelectedUserInfo(data);
  };

  const markAsRead = async (senderId: string) => {
    if (!user) return;
    
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !user) return;

    setSending(true);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedUser,
        content: newMessage.trim(),
        job_id: currentJobId || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      fetchConversations();
    }

    setSending(false);
  };

  const filteredConversations = conversations.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

      <main className="container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {filteredConversations.length > 0 ? (
                  <div className="space-y-1 p-2">
                    {filteredConversations.map(conv => (
                      <button
                        key={conv.user_id}
                        onClick={() => setSelectedUser(conv.user_id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedUser === conv.user_id ? 'bg-primary/10' : 'hover:bg-muted'
                        }`}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={conv.avatar_url} />
                            <AvatarFallback>{conv.full_name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          {conv.unread_count > 0 && (
                            <Circle className="absolute -top-1 -right-1 h-4 w-4 fill-primary text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{conv.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: false })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                        </div>
                        {conv.unread_count > 0 && (
                          <Badge className="ml-auto">{conv.unread_count}</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No conversations yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedUser && selectedUserInfo ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedUserInfo.avatar_url} />
                      <AvatarFallback>{selectedUserInfo.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold">{selectedUserInfo.full_name}</h3>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-4 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">Choose a conversation from the list to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
