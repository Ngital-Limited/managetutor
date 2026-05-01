import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Shield, Bell, Lock, Eye, EyeOff } from 'lucide-react';

export function ParentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Notification preferences (local state, could be persisted)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [applicationAlerts, setApplicationAlerts] = useState(true);
  const [demoReminders, setDemoReminders] = useState(true);
  const [platformUpdates, setPlatformUpdates] = useState(false);

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  return (
    <div className="space-y-4">
      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>Manage your password and account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground mt-1">Contact support to change your email address</p>
          </div>
          <Separator />
          <h4 className="font-semibold text-sm">Change Password</h4>
          <div className="space-y-3 max-w-sm">
            <div className="relative">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
            <Button onClick={handlePasswordChange} disabled={changingPassword || !newPassword}>
              <Lock className="h-4 w-4 mr-2" />
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Control how you receive updates and alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SMS Notifications</p>
              <p className="text-xs text-muted-foreground">Get SMS alerts for important updates</p>
            </div>
            <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Application Alerts</p>
              <p className="text-xs text-muted-foreground">When tutors apply to your jobs or status changes</p>
            </div>
            <Switch checked={applicationAlerts} onCheckedChange={setApplicationAlerts} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Demo Class Reminders</p>
              <p className="text-xs text-muted-foreground">Reminders before scheduled demo classes</p>
            </div>
            <Switch checked={demoReminders} onCheckedChange={setDemoReminders} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Platform Updates</p>
              <p className="text-xs text-muted-foreground">New features, promotions, and announcements</p>
            </div>
            <Switch checked={platformUpdates} onCheckedChange={setPlatformUpdates} />
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Privacy Controls
          </CardTitle>
          <CardDescription>Control what information is visible to tutors</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your phone number, email, and personal details are <span className="font-medium text-foreground">never shared publicly</span>. 
            Contact information is only shared with a tutor after you hire them and admin releases the contact details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
