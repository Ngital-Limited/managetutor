import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/lib/adminLogger';
import { Settings, Shield, Bell, Users, Briefcase, AlertTriangle, Save } from 'lucide-react';

interface SettingRow {
  key: string;
  value: string;
  label: string;
  description: string;
  type: 'toggle' | 'number' | 'text';
  category: string;
}

const DEFAULT_SETTINGS: SettingRow[] = [
  // General
  { key: 'maintenance_mode', value: 'false', label: 'Maintenance Mode', description: 'Show maintenance page to all non-admin users', type: 'toggle', category: 'General' },
  { key: 'new_registration_enabled', value: 'true', label: 'Allow New Registrations', description: 'Enable or disable new user signups', type: 'toggle', category: 'General' },
  { key: 'platform_name', value: 'ManageTutor', label: 'Platform Name', description: 'Displayed in emails and notifications', type: 'text', category: 'General' },
  // Approval
  { key: 'auto_approve_guardians', value: 'false', label: 'Auto-Approve Guardians', description: 'Skip manual review for new parent accounts', type: 'toggle', category: 'Approval' },
  { key: 'auto_approve_tutors', value: 'false', label: 'Auto-Approve Tutors', description: 'Skip manual review for new tutor accounts', type: 'toggle', category: 'Approval' },
  { key: 'auto_approve_jobs', value: 'false', label: 'Auto-Approve Jobs', description: 'Skip manual review for new job postings', type: 'toggle', category: 'Approval' },
  // Limits
  { key: 'max_applications_per_job', value: '50', label: 'Max Applications Per Job', description: 'Limit applications a single job can receive', type: 'number', category: 'Limits' },
  { key: 'max_active_jobs_per_parent', value: '5', label: 'Max Active Jobs Per Parent', description: 'Limit simultaneous active job postings per parent', type: 'number', category: 'Limits' },
  { key: 'commission_overdue_days', value: '7', label: 'Commission Overdue Days', description: 'Days after which unpaid commission is marked overdue', type: 'number', category: 'Limits' },
  // Notifications
  { key: 'notify_admin_new_signup', value: 'true', label: 'Admin Alert: New Signup', description: 'Send notification to admins on every new signup', type: 'toggle', category: 'Notifications' },
  { key: 'notify_admin_new_job', value: 'true', label: 'Admin Alert: New Job', description: 'Send notification to admins on every new job posting', type: 'toggle', category: 'Notifications' },
  { key: 'notify_admin_payment', value: 'true', label: 'Admin Alert: Payment', description: 'Send notification to admins on payment events', type: 'toggle', category: 'Notifications' },
];

export function AdminPlatformSettingsTab({ toast }: { toast: any }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load from platform_settings key-value in platform_data
    const { data } = await supabase
      .from('platform_data')
      .select('key, value')
      .like('key', 'setting_%');

    const map: Record<string, string> = {};
    DEFAULT_SETTINGS.forEach(s => { map[s.key] = s.value; });
    data?.forEach((row: any) => {
      const realKey = row.key.replace('setting_', '');
      if (realKey in map) map[realKey] = String(row.value);
    });
    setSettings(map);
    setLoaded(true);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from('platform_data').upsert(
          { key: `setting_${key}`, value: String(value) } as any,
          { onConflict: 'key' }
        );
      }
      await logAdminAction(user?.id || '', 'update_platform_settings', 'settings', undefined, settings);
      toast({ title: 'Settings saved', description: 'Platform settings updated successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading settings…</div>;

  const categories = ['General', 'Approval', 'Limits', 'Notifications'];
  const categoryIcons: Record<string, any> = { General: Settings, Approval: Shield, Limits: Briefcase, Notifications: Bell };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Platform Settings</h1>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving…' : 'Save All'}
        </Button>
      </div>

      {categories.map(cat => {
        const Icon = categoryIcons[cat];
        const items = DEFAULT_SETTINGS.filter(s => s.category === cat);
        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {cat}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, idx) => (
                <div key={item.key}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    {item.type === 'toggle' ? (
                      <Switch
                        checked={settings[item.key] === 'true'}
                        onCheckedChange={(v) => updateSetting(item.key, String(v))}
                      />
                    ) : item.type === 'number' ? (
                      <Input
                        type="number"
                        value={settings[item.key] || ''}
                        onChange={(e) => updateSetting(item.key, e.target.value)}
                        className="w-24 h-8 text-sm"
                      />
                    ) : (
                      <Input
                        value={settings[item.key] || ''}
                        onChange={(e) => updateSetting(item.key, e.target.value)}
                        className="w-48 h-8 text-sm"
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Important</p>
            <p className="text-xs text-muted-foreground">
              Changes to approval settings take effect immediately. Enabling auto-approve bypasses the mandatory vetting workflow. 
              Commission rates and pricing are managed under <strong>Platform Data → Pricing & Fees</strong>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
