import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { X, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
}

export const AnnouncementBanner = () => {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchActiveAnnouncement();
  }, [user?.school_id]);

  const fetchActiveAnnouncement = async () => {
    try {
      if (!user?.school_id) return;

      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, type, created_at')
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .in('audience', ['all', 'teachers'])
        .lte('start_at', new Date().toISOString())
        .or(`end_at.is.null,end_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No announcements found or other error
        console.log('No active announcements found');
        return;
      }

      setAnnouncement(data);
      
      // Check if this announcement was previously dismissed
      const dismissedAnnouncements = JSON.parse(
        localStorage.getItem('dismissedAnnouncements') || '[]'
      );
      setDismissed(dismissedAnnouncements.includes(data.id));
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleDismiss = () => {
    if (!announcement) return;

    // Save dismissed announcement ID to localStorage
    const dismissedAnnouncements = JSON.parse(
      localStorage.getItem('dismissedAnnouncements') || '[]'
    );
    dismissedAnnouncements.push(announcement.id);
    localStorage.setItem(
      'dismissedAnnouncements',
      JSON.stringify(dismissedAnnouncements)
    );

    setDismissed(true);
  };

  if (!announcement || dismissed) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Megaphone className="h-5 w-5 text-blue-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-900">{announcement.title}</h3>
          <div className="mt-2 text-sm text-blue-800">
            <p>{announcement.body}</p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-500 hover:text-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
