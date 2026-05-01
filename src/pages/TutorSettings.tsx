import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Bell, Shield, Lock, AlertTriangle, Save, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TutorSettings() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [settings, setSettings] = useState({
    email_new_jobs: true,
    email_application_updates: true,
    email_promotions: false,
    push_notifications: true,
    hide_last_name: false,
    profile_visibility: 'public',
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    else if (user) fetchSettings();
  }, [user, authLoading]);

  const fetchSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tutor_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        email_new_jobs: data.email_new_jobs,
        email_application_updates: data.email_application_updates,
        email_promotions: data.email_promotions,
        push_notifications: data.push_notifications,
        hide_last_name: data.hide_last_name,
        profile_visibility: data.profile_visibility,
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('tutor_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings Saved', description: 'Your preferences have been updated.' });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;
    // Set tutor as unavailable
    await supabase
      .from('tutor_profiles')
      .update({ is_available: false })
      .eq('user_id', user.id);
    
    await signOut();
    toast({ title: 'Account Deactivated', description: 'Your profile is now hidden. Sign in again to reactivate.' });
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TutorSidebarLayout title="Settings">
      <div className="max-w-[800px] mx-auto p-4 md:p-6 space-y-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5" /> Settings
        </h1>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={passwordLoading || !newPassword}>
              {passwordLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Notification Preferences
            </CardTitle>
            <CardDescription>Choose which notifications you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">New Job Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified about new jobs in your area</p>
              </div>
              <Switch
                checked={settings.email_new_jobs}
                onCheckedChange={v => setSettings(s => ({ ...s, email_new_jobs: v }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Application Updates</p>
                <p className="text-xs text-muted-foreground">Status changes on your applications</p>
              </div>
              <Switch
                checked={settings.email_application_updates}
                onCheckedChange={v => setSettings(s => ({ ...s, email_application_updates: v }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Promotional Emails</p>
                <p className="text-xs text-muted-foreground">Tips, offers, and platform updates</p>
              </div>
              <Switch
                checked={settings.email_promotions}
                onCheckedChange={v => setSettings(s => ({ ...s, email_promotions: v }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">In-app notification alerts</p>
              </div>
              <Switch
                checked={settings.push_notifications}
                onCheckedChange={v => setSettings(s => ({ ...s, push_notifications: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> Privacy Settings
            </CardTitle>
            <CardDescription>Control who can see your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hide Last Name</p>
                <p className="text-xs text-muted-foreground">Only show first name until you're hired</p>
              </div>
              <Switch
                checked={settings.hide_last_name}
                onCheckedChange={v => setSettings(s => ({ ...s, hide_last_name: v }))}
              />
            </div>
            <Separator />
            <div>
              <Label>Profile Visibility</Label>
              <Select
                value={settings.profile_visibility}
                onValueChange={v => setSettings(s => ({ ...s, profile_visibility: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — visible to everyone</SelectItem>
                  <SelectItem value="registered">Registered — only signed-in users</SelectItem>
                  <SelectItem value="hidden">Hidden — only via direct link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>

        {/* Account Deactivation */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Deactivating your account will hide your profile and mark you as unavailable. You can reactivate by signing in again.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Deactivate Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your profile will be hidden from search results and you'll be signed out. You can reactivate by signing in again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivateAccount}>
                    Yes, Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </TutorSidebarLayout>
  );
}
