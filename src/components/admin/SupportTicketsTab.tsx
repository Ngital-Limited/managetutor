import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Clock, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

export function SupportTicketsTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('support_tickets')
      .select('*, profiles:user_id(full_name, email, avatar_url)')
      .order('created_at', { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from('ticket_messages')
      .select('*, profiles:sender_id(full_name, avatar_url)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;
    setSending(true);
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id, sender_id: user.id, message: newMessage.trim(), is_admin: true,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      setNewMessage('');
      const { data } = await supabase.from('ticket_messages')
        .select('*, profiles:sender_id(full_name, avatar_url)')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    }
    setSending(false);
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const updates: any = { status };
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `Ticket ${status}` });
      if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status });
      fetchTickets();
    }
  };

  const priorityBadge = (p: string) => {
    switch (p) {
      case 'high': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">High</Badge>;
      case 'medium': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Medium</Badge>;
      case 'low': return <Badge variant="outline" className="bg-muted text-muted-foreground">Low</Badge>;
      default: return <Badge variant="outline">{p}</Badge>;
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'open': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Open</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">In Progress</Badge>;
      case 'resolved': return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Resolved</Badge>;
      case 'closed': return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const categoryBadge = (c: string) => {
    const colors: Record<string, string> = {
      dispute: 'bg-destructive/10 text-destructive',
      complaint: 'bg-warning/10 text-warning',
      technical: 'bg-primary/10 text-primary',
      billing: 'bg-success/10 text-success',
    };
    return <Badge variant="outline" className={`capitalize ${colors[c] || ''}`}>{c}</Badge>;
  };

  const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Support Tickets</h1>
        <div className="flex gap-2">
          {openCount > 0 && <Badge className="bg-warning text-warning-foreground">{openCount} open</Badge>}
          {inProgressCount > 0 && <Badge className="bg-primary text-primary-foreground">{inProgressCount} in progress</Badge>}
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)} className="capitalize">
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tickets found</TableCell></TableRow>
                ) : filtered.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openTicket(t)}>
                    <TableCell className="font-mono text-sm">{t.ticket_number}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{t.profiles?.full_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{t.profiles?.email}</p>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{t.subject}</TableCell>
                    <TableCell>{categoryBadge(t.category)}</TableCell>
                    <TableCell>{priorityBadge(t.priority)}</TableCell>
                    <TableCell>{statusBadge(t.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatExactDate(new Date(t.created_at))}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openTicket(t); }}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedTicket?.ticket_number}</span>
              {selectedTicket && statusBadge(selectedTicket.status)}
              {selectedTicket && priorityBadge(selectedTicket.priority)}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{selectedTicket.subject}</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTicket.description}</p>
                  </div>
                  <Select value={selectedTicket.status} onValueChange={(v) => updateTicketStatus(selectedTicket.id, v)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>By: {selectedTicket.profiles?.full_name}</span>
                  <span>Category: {selectedTicket.category}</span>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-[200px] max-h-[350px]">
                <div className="space-y-3 p-2">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex gap-2 ${m.is_admin ? 'justify-end' : ''}`}>
                      {!m.is_admin && (
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-xs">{m.profiles?.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-xs font-medium mb-1 opacity-70">{m.is_admin ? 'Admin' : m.profiles?.full_name}</p>
                        <p>{m.message}</p>
                        <p className="text-[10px] mt-1 opacity-50">{formatExactDate(new Date(m.created_at))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Reply */}
              <div className="flex gap-2">
                <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a reply..." rows={2} className="flex-1" />
                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
