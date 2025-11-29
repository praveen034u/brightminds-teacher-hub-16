import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuestionPaperBuilder } from '@/components/QuestionPaperBuilder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileText, Plus, Trash2, Eye, Edit, ArrowLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';

export const QuestionPapersPage = () => {
  const { auth0UserId } = useAuth();
  const navigate = useNavigate();
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  useEffect(() => {
    loadQuestionPapers();
  }, [auth0UserId]);

  const loadQuestionPapers = async () => {
    try {
      setLoading(true);

      // Try to load from Supabase
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('teacher_id', auth0UserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading from Supabase, using localStorage:', error);
        // Fallback to localStorage
        const localPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
        setQuestionPapers(localPapers);
      } else {
        setQuestionPapers(data || []);
        
        // Sync localStorage with Supabase
        localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify(data || []));
      }
    } catch (error) {
      console.error('Error loading question papers:', error);
      // Fallback to localStorage
      const localPapers = JSON.parse(localStorage.getItem(`question_papers_${auth0UserId}`) || '[]');
      setQuestionPapers(localPapers);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this question paper?')) return;

    try {
      // Try to delete from Supabase
      const { error } = await supabase
        .from('question_papers')
        .delete()
        .eq('id', paperId)
        .eq('teacher_id', auth0UserId);

      if (error) throw error;

      toast.success('Question paper deleted');
      
      // Update localStorage
      const updatedPapers = questionPapers.filter(p => p.id !== paperId);
      localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify(updatedPapers));
      
      loadQuestionPapers();
    } catch (error) {
      console.error('Error deleting question paper:', error);
      
      // Fallback: delete from localStorage
      const updatedPapers = questionPapers.filter(p => p.id !== paperId);
      localStorage.setItem(`question_papers_${auth0UserId}`, JSON.stringify(updatedPapers));
      setQuestionPapers(updatedPapers);
      toast.success('Question paper deleted locally');
    }
  };

  const handlePreviewPaper = (paper: any) => {
    setSelectedPaper(paper);
    setShowPreviewDialog(true);
  };

  const handleEditPaper = (paper: any) => {
    setSelectedPaper(paper);
    setShowEditDialog(true);
  };

  const handleUpdatePaper = () => {
    setShowEditDialog(false);
    setSelectedPaper(null);
    loadQuestionPapers();
    toast.success('Question paper updated successfully');
  };

  const handlePrintPaper = (paper: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${paper.title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px;
              max-width: 800px;
            }
            h1 { 
              text-align: center; 
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .meta { 
              text-align: right; 
              font-size: 12px; 
              color: #666; 
              margin-bottom: 20px;
            }
            .description { 
              background: #f5f5f5; 
              padding: 10px; 
              margin-bottom: 20px; 
              border-left: 4px solid #007bff;
            }
            .question { 
              margin-bottom: 25px; 
              page-break-inside: avoid;
            }
            .question-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .question-number { 
              font-weight: bold; 
              color: #007bff;
            }
            .marks { 
              font-size: 12px; 
              color: #666; 
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              font-size: 11px;
              border-radius: 12px;
              margin-left: 8px;
            }
            .badge-easy { background: #d4edda; color: #155724; }
            .badge-medium { background: #fff3cd; color: #856404; }
            .badge-hard { background: #f8d7da; color: #721c24; }
            .options { 
              margin-left: 20px;
              list-style-type: none;
            }
            .options li { 
              padding: 5px 0;
            }
            .answer-space {
              margin-top: 10px;
              border-bottom: 1px solid #ddd;
              min-height: 60px;
            }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${paper.title}</h1>
          <div class="meta">
            Total Questions: ${paper.question_count || paper.questions?.length || 0} | Total Marks: ${paper.total_marks || 0}
          </div>
          ${paper.description ? `<div class="description"><strong>Instructions:</strong> ${paper.description}</div>` : ''}
          
          ${(paper.questions || []).map((q: any, idx: number) => `
            <div class="question">
              <div class="question-header">
                <div>
                  <span class="question-number">Q${idx + 1}.</span>
                  <span class="badge badge-${q.complexity}">${q.complexity}</span>
                  <span class="badge">${q.type === 'multiple-choice' ? 'MCQ' : 'Subjective'}</span>
                </div>
                <span class="marks">[${q.marks || 1} mark${(q.marks || 1) > 1 ? 's' : ''}]</span>
              </div>
              <div><strong>${q.text}</strong></div>
              ${q.type === 'multiple-choice' && q.options ? `
                <ul class="options">
                  ${q.options.map((opt: string, i: number) => `<li>${String.fromCharCode(97 + i)}) ${opt}</li>`).join('')}
                </ul>
              ` : `
                <div class="answer-space"></div>
              `}
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSavePaper = () => {
    setShowCreateDialog(false);
    loadQuestionPapers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2">Question Papers</h1>
              <p className="text-muted-foreground">Create and manage reusable question papers</p>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Question Paper
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Create New Question Paper</DialogTitle>
              </DialogHeader>
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
                <QuestionPaperBuilder
                  auth0UserId={auth0UserId}
                  onSave={handleSavePaper}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading question papers...</p>
          </div>
        ) : questionPapers.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {questionPapers.map((paper) => (
              <Card key={paper.id} className="group hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                            {paper.title}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {paper.question_count || paper.questions?.length || 0} Questions
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {paper.total_marks || 0} Marks
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewPaper(paper)}
                        title="Preview"
                        className="hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPaper(paper)}
                        title="Edit"
                        className="hover:bg-green-50 hover:text-green-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePaper(paper.id)}
                        title="Delete"
                        className="hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {paper.description && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-purple-400">
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{paper.description}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="font-medium">
                        {new Date(paper.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintPaper(paper)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Print
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No question papers yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first question paper to get started
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Question Paper
            </Button>
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              {selectedPaper?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPaper && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Details</h3>
                    {selectedPaper.description && (
                      <p className="text-sm text-blue-800">{selectedPaper.description}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Statistics</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-blue-100 rounded">
                        <div className="text-lg font-bold text-blue-800">
                          {selectedPaper.question_count || selectedPaper.questions?.length || 0}
                        </div>
                        <div className="text-xs text-blue-700">Questions</div>
                      </div>
                      <div className="text-center p-2 bg-purple-100 rounded">
                        <div className="text-lg font-bold text-purple-800">
                          {selectedPaper.total_marks || 0}
                        </div>
                        <div className="text-xs text-purple-700">Total Marks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Questions</h3>
                <div className="space-y-3">
                  {(selectedPaper.questions || []).map((q: any, idx: number) => (
                    <div key={q.id || idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">Q{idx + 1}.</span>
                          <Badge variant="outline" className={
                            q.complexity === 'easy' ? 'bg-green-50 text-green-700' :
                            q.complexity === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          }>
                            {q.complexity}
                          </Badge>
                          <Badge variant="outline">
                            {q.type === 'multiple-choice' ? 'MCQ' : 'Subjective'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-600">[{q.marks || 1} mark{(q.marks || 1) > 1 ? 's' : ''}]</span>
                      </div>
                      
                      <div className="font-medium text-sm mb-2">{q.text}</div>
                      
                      {q.type === 'multiple-choice' && q.options && (
                        <ul className="text-xs space-y-1 ml-4">
                          {q.options.map((opt: string, i: number) => (
                            <li key={i} className={q.answer === i ? 'font-bold text-green-700' : ''}>
                              {String.fromCharCode(97 + i)}) {opt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handlePrintPaper(selectedPaper)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-green-600" />
              Edit Question Paper
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
            {selectedPaper && (
              <QuestionPaperBuilder
                auth0UserId={auth0UserId}
                onSave={handleUpdatePaper}
                existingPaper={selectedPaper}
                isEditMode={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionPapersPage;
