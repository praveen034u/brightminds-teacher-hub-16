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
import { meAPI } from '@/api/edgeClient';

export const QuestionPapersPage = () => {
  const { auth0UserId } = useAuth();
  const navigate = useNavigate();
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    loadTeacherAndQuestionPapers();
  }, [auth0UserId]);

  const loadTeacherAndQuestionPapers = async () => {
    try {
      setLoading(true);

      // First, get the teacher's UUID using Edge Function (has service role access)
      console.log('📋 Getting teacher profile for auth0_user_id:', auth0UserId);
      const teacherProfile = await meAPI.get(auth0UserId);

      if (!teacherProfile || !teacherProfile.id) {
        console.error('❌ No teacher profile found for auth0_user_id:', auth0UserId);
        console.log('💡 TIP: Teacher record may not exist in database');
        console.log('💡 Run this SQL: SELECT id, email, auth0_user_id FROM teachers WHERE auth0_user_id = \'' + auth0UserId + '\';');
        toast.error('Teacher profile not found. Please contact support.');
        setLoading(false);
        return;
      }

      const teacherUUID = teacherProfile.id;
      console.log('✅ Teacher UUID:', teacherUUID);
      console.log('✅ Teacher profile:', teacherProfile);
      setTeacherId(teacherUUID);

      // Now load question papers using teacher UUID (not auth0 ID!)
      console.log('📄 Loading question papers for teacher UUID:', teacherUUID);
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('teacher_id', teacherUUID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading question papers from database:', error);
        toast.error('Failed to load question papers');
        setQuestionPapers([]);
      } else {
        console.log('✅ Loaded question papers from database:', data?.length || 0);
        setQuestionPapers(data || []);
      }
    } catch (error) {
      console.error('⚠️ Error in loadTeacherAndQuestionPapers:', error);
      toast.error('Failed to load question papers');
      setQuestionPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this question paper?')) return;

    if (!teacherId) {
      toast.error('Teacher ID not loaded');
      return;
    }

    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('question_papers')
        .delete()
        .eq('id', paperId)
        .eq('teacher_id', teacherId);

      if (error) throw error;

      toast.success('Question paper deleted');
      loadTeacherAndQuestionPapers();
    } catch (error) {
      console.error('Error deleting question paper:', error);
      toast.error('Failed to delete question paper');
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
    loadTeacherAndQuestionPapers();
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
    loadTeacherAndQuestionPapers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        {/* Enhanced Header Section */}
        <div className="mb-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mb-4 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Question Papers
                  </h1>
                  <p className="text-gray-600 mt-1">Create and manage reusable question papers</p>
                </div>
              </div>
              
              {/* Stats Summary */}
              {questionPapers.length > 0 && (
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">
                      {questionPapers.length} {questionPapers.length === 1 ? 'Paper' : 'Papers'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-sm font-semibold text-purple-700">
                      {questionPapers.reduce((sum, p) => sum + (p.question_count || 0), 0)} Total Questions
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Question Paper
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Create New Question Paper</DialogTitle>
              </DialogHeader>
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
                {teacherId ? (
                  <QuestionPaperBuilder
                    teacherId={teacherId}
                    onSave={handleSavePaper}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading teacher profile...</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading question papers...</p>
          </div>
        ) : questionPapers.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {questionPapers.map((paper) => (
              <Card key={paper.id} className="group relative overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-200/50 bg-white rounded-2xl flex flex-col" style={{ minHeight: '520px' }}>
                {/* Decorative gradient background - larger area */}
                <div className="absolute top-0 left-0 right-0 h-[140px] bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-t-2xl"></div>
                
                {/* Action buttons - always visible on mobile, hover on desktop */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePreviewPaper(paper)}
                    title="Preview"
                    className="h-9 w-9 p-0 bg-white/98 hover:bg-blue-50 shadow-lg hover:shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 rounded-xl border border-blue-200/50"
                  >
                    <Eye className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditPaper(paper)}
                    title="Edit"
                    className="h-9 w-9 p-0 bg-white/98 hover:bg-green-50 shadow-lg hover:shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 rounded-xl border border-green-200/50"
                  >
                    <Edit className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeletePaper(paper.id)}
                    title="Delete"
                    className="h-9 w-9 p-0 bg-white/98 hover:bg-red-50 shadow-lg hover:shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 rounded-xl border border-red-200/50"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>

                <CardHeader className="relative pb-4 pt-8">
                  {/* Document icon with modern design - positioned in gradient area */}
                  <div className="flex justify-center mb-6">
                    <div className="relative w-20 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                      <FileText className="h-12 w-12 text-blue-600" strokeWidth={1.5} />
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                        <span className="text-white text-sm font-bold">{paper.question_count || paper.questions?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <CardTitle className="text-center text-[22px] font-bold text-gray-900 mb-4 line-clamp-2 min-h-[3.5rem] px-4 leading-tight">
                    {paper.title}
                  </CardTitle>

                  {/* Stats badges */}
                  <div className="flex gap-2 justify-center items-center flex-wrap px-2">
                    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 rounded-full border border-blue-100">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-semibold text-blue-700">
                        {paper.question_count || paper.questions?.length || 0} Questions
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 rounded-full border border-purple-100">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-semibold text-purple-700">
                        {paper.total_marks || 0} Marks
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 px-6 pb-6 flex flex-col justify-between" style={{ minHeight: '180px' }}>
                  {/* Description - Always shows placeholder if empty */}
                  <div className="mb-4">
                    {paper.description ? (
                      <div className="p-4 bg-gradient-to-br from-blue-50 via-purple-50/30 to-indigo-50/20 rounded-xl border-l-4 border-blue-400 shadow-sm">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 text-blue-500">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 flex-1">
                            {paper.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-xs text-gray-400 italic text-center">
                          No description provided
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer with date and print button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Created</span>
                        <span className="text-sm font-bold text-gray-800 mt-0.5">
                          {new Date(paper.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-5 py-2.5 h-auto rounded-xl font-semibold hover:scale-105"
                      onClick={() => handlePrintPaper(paper)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center max-w-md">
              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center transform rotate-6">
                  <FileText className="h-16 w-16 text-blue-500 transform -rotate-6" />
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <Plus className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Question Papers Yet</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Create your first question paper to get started. Use OCR to scan images, 
                manually enter questions, or generate them with AI.
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Question Paper
              </Button>
            </div>
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
            {selectedPaper && teacherId ? (
              <QuestionPaperBuilder
                teacherId={teacherId}
                onSave={handleUpdatePaper}
                existingPaper={selectedPaper}
                isEditMode={true}
              />
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading teacher profile...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionPapersPage;
