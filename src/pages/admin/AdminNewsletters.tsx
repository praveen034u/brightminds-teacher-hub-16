import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/config/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Power, PowerOff, Loader2, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  school_id: string;
  title: string;
  body: string;
  type: string;
  audience: string;
  start_at: string;
  end_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

const AdminNewsletters = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    announcement: Announcement | null;
    action: 'activate' | 'deactivate' | null;
  }>({
    open: false,
    announcement: null,
    action: null,
  });

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'banner',
    audience: 'all',
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by school_id if user has one
      if (user?.school_id) {
        query = query.eq('school_id', user.school_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching announcements:', error);
        toast.error('Failed to load announcements');
        return;
      }

      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [user?.school_id]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setActionLoading('create');

      const { error } = await supabase.from('announcements').insert({
        school_id: user?.school_id || '',
        title: formData.title,
        body: formData.body,
        type: formData.type,
        audience: formData.audience,
        created_by: user?.id || '',
        is_active: true,
      });

      if (error) {
        console.error('Error creating announcement:', error);
        toast.error('Failed to create announcement');
        return;
      }

      toast.success('Announcement created successfully');
      setFormData({ title: '', body: '', type: 'banner', audience: 'all' });
      setDialogOpen(false);
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    setConfirmDialog({
      open: true,
      announcement,
      action: announcement.is_active ? 'deactivate' : 'activate',
    });
  };

  const confirmToggleActive = async () => {
    const { announcement, action } = confirmDialog;
    if (!announcement) return;

    try {
      setActionLoading(announcement.id);

      const { error } = await supabase
        .from('announcements')
        .update({ is_active: action === 'activate' })
        .eq('id', announcement.id);

      if (error) {
        console.error('Error updating announcement:', error);
        toast.error('Failed to update announcement');
        return;
      }

      toast.success(
        `Announcement ${action === 'activate' ? 'activated' : 'deactivated'} successfully`
      );

      await fetchAnnouncements();
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, announcement: null, action: null });
    }
  };

  const getDialogContent = () => {
    const { announcement, action } = confirmDialog;
    if (!announcement) return { title: '', description: '' };

    return {
      title: action === 'activate' ? 'Activate Announcement' : 'Deactivate Announcement',
      description:
        action === 'activate'
          ? `Are you sure you want to activate "${announcement.title}"? It will be visible to users.`
          : `Are you sure you want to deactivate "${announcement.title}"? It will be hidden from users.`,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dialogContent = getDialogContent();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Announcements</h2>
          <p className="text-gray-600 mt-1">
            Create and manage announcements for teachers and students
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAnnouncements} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <form onSubmit={handleCreateAnnouncement}>
                <DialogHeader>
                  <DialogTitle>Create New Announcement</DialogTitle>
                  <DialogDescription>
                    Create an announcement that will be displayed to teachers and students.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Enter announcement title"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="body">Message *</Label>
                    <Textarea
                      id="body"
                      value={formData.body}
                      onChange={(e) =>
                        setFormData({ ...formData, body: e.target.value })
                      }
                      placeholder="Enter announcement message"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Type</Label>
                      <Input
                        id="type"
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                        placeholder="banner"
                        disabled
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="audience">Audience</Label>
                      <Input
                        id="audience"
                        value={formData.audience}
                        onChange={(e) =>
                          setFormData({ ...formData, audience: e.target.value })
                        }
                        placeholder="all"
                        disabled
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading === 'create'}>
                    {actionLoading === 'create' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Announcement'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No announcements found. Create your first announcement to get started.
                </TableCell>
              </TableRow>
            ) : (
              announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium">{announcement.title}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {announcement.body}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{announcement.audience}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={announcement.is_active ? 'default' : 'secondary'}
                      className={
                        announcement.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {announcement.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(announcement)}
                      disabled={actionLoading === announcement.id}
                      className="gap-2"
                    >
                      {announcement.is_active ? (
                        <>
                          <PowerOff className="h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, announcement: null, action: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNewsletters;
