import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Shield, UserPlus, Settings, Search, UserMinus } from 'lucide-react';

const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  can_manage_users: { label: 'User Management', description: 'Ban/unban users, view user details' },
  can_verify_documents: { label: 'Verification', description: 'Review and approve tutor documents' },
  can_manage_jobs: { label: 'Job Management', description: 'Edit, delete, and moderate job posts' },
  can_manage_tickets: { label: 'Support Tickets', description: 'View and respond to support tickets' },
  can_manage_revenue: { label: 'Revenue & Payouts', description: 'Approve payouts and refunds' },
  can_view_analytics: { label: 'Analytics', description: 'View platform analytics and reports' },
  can_manage_settings: { label: 'Platform Settings', description: 'Edit commission rates and platform config' },
  can_manage_reviews: { label: 'Review Moderation', description: 'Moderate and manage user reviews' },
  can_send_notifications: { label: 'Notifications', description: 'Send broadcast notifications' },
};

export function SubAdminRBACTab({ toast }: { toast: any }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Get all admin users
    const { data: adminRoles } = await supabase.from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin');

    if (adminRoles) {
      const userIds = adminRoles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles')
        .select('id, full_name, email, avatar_url, created_at')
        .in('id', userIds);
      setAdmins(profiles || []);

      // Fetch permissions
      const { data: perms } = await supabase.from('admin_permissions')
        .select('*')
        .in('user_id', userIds);
      const permMap: Record<string, any> = {};
      (perms || []).forEach(p => { permMap[p.user_id] = p; });
      setPermissions(permMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const searchUsers = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    const { data } = await supabase.from('profiles')
      .select('id, full_name, email, avatar_url')
      .ilike('email', `%${searchEmail}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const addAsAdmin = async (userId: string) => {
    // Check if already admin
    const { data: existing } = await supabase.from('user_roles')
      .select('id').eq('user_id', userId).eq('role', 'admin');
    if (existing && existing.length > 0) {
      toast({ title: 'Already an admin', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('user_roles')
      .insert({ user_id: userId, role: 'admin' });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Create default permissions (all false = restricted sub-admin)
      await supabase.from('admin_permissions').insert({ user_id: userId });
      toast({ title: 'Sub-admin added successfully' });
      setShowAddDialog(false);
      setSearchEmail('');
      setSearchResults([]);
      fetchData();
    }
  };

  const togglePermission = async (userId: string, permission: string, value: boolean) => {
    const existing = permissions[userId];
    if (existing) {
      const { error } = await supabase.from('admin_permissions')
        .update({ [permission]: value })
        .eq('user_id', userId);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else {
        setPermissions(prev => ({
          ...prev,
          [userId]: { ...prev[userId], [permission]: value },
        }));
      }
    } else {
      const { error } = await supabase.from('admin_permissions')
        .insert({ user_id: userId, [permission]: value });
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else {
        setPermissions(prev => ({
          ...prev,
          [userId]: { user_id: userId, [permission]: value },
        }));
      }
    }
  };

  const getActivePermCount = (userId: string) => {
    const p = permissions[userId];
    if (!p) return 0;
    return Object.keys(PERMISSION_LABELS).filter(k => p[k]).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Sub-Admin Roles</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Sub-Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users & Permissions</CardTitle>
          <CardDescription>Manage which sections each admin can access</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : admins.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No admin users found</p>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <Card key={admin.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={admin.avatar_url || ''} />
                          <AvatarFallback>{admin.full_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{admin.full_name}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          {getActivePermCount(admin.id)}/{Object.keys(PERMISSION_LABELS).length} permissions
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => setSelectedAdmin(selectedAdmin?.id === admin.id ? null : admin)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {selectedAdmin?.id === admin.id && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t">
                        {Object.entries(PERMISSION_LABELS).map(([key, { label, description }]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="text-sm font-medium">{label}</p>
                              <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                            <Switch
                              checked={permissions[admin.id]?.[key] || false}
                              onCheckedChange={(v) => togglePermission(admin.id, key, v)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Sub-Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Sub-Admin</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || ''} />
                        <AvatarFallback>{u.full_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addAsAdmin(u.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
