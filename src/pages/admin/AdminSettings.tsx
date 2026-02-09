import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminSettingsAPI } from '@/api/edgeClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AdminSettings = () => {
  const { auth0UserId } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    if (!auth0UserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await adminSettingsAPI.getOpenAiKey(auth0UserId);
      setApiKey(response?.key || '');
    } catch (error) {
      console.error('Failed to load OpenAI key:', error);
      toast.error('Failed to load OpenAI key');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [auth0UserId]);

  const handleSave = async () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      toast.error('Please enter a valid OpenAI API key');
      return;
    }

    if (!auth0UserId) {
      toast.error('You must be logged in as an admin');
      return;
    }

    try {
      setSaving(true);
      await adminSettingsAPI.setOpenAiKey(auth0UserId, trimmedKey);
      toast.success('OpenAI key saved');
    } catch (error) {
      console.error('Failed to save OpenAI key:', error);
      toast.error('Failed to save OpenAI key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">School Settings</h2>
        <p className="text-sm text-gray-600">Manage AI configuration for your school.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OpenAI API Key</CardTitle>
          <CardDescription>
            This key is used to generate AI-powered question banks for your teachers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label htmlFor="openai-key">API Key</Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              disabled={loading}
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={loading || saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Save Key'
                )}
              </Button>
              {loading && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading settings...
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Keys are stored securely in the database and never exposed to teachers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
