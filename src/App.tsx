import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import TeacherHome from "./pages/TeacherHome";
import StudentsPage from "./pages/StudentsPage";
import RoomsPage from "./pages/RoomsPage";
import { RoomDetailPage } from "./pages/RoomDetailPage";
import { StudentActivityPage } from "./pages/StudentActivityPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import ProfilePage from "./pages/ProfilePage";
import StudentPortalRedirect from "./pages/StudentPortalRedirect";
import StudentPortalPage from "./pages/StudentPortalPage";
import QuestionPapersPage from "./pages/QuestionPapersPage";
import { Footer } from "@/components/layout/Footer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain="dev-jbrriuc5vyjmiwtx.us.auth0.com"
        clientId="hRgZXlSYVCedu8jYuTWadyoTA3T8EISD"
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: "https://dev-jbrriuc5vyjmiwtx.us.auth0.com/userinfo"
        }}
      >
        <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {/* Main app content */}
            <div className="min-h-screen flex flex-col">
              <Routes>
                {/* Routes without sidebar */}
                <Route path="/" element={<LoginPage />} />
                <Route path="/student-portal" element={<StudentPortalPage />} />
                <Route path="*" element={<NotFound />} />
                
                {/* Routes with sidebar - wrapped in DashboardLayout */}
                <Route path="/dashboard" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <TeacherHome />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/students" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <StudentsPage />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/rooms" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <RoomsPage />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/rooms/:roomId" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <RoomDetailPage />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/rooms/:roomId/student/:studentId" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <StudentActivityPage />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/assignments" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <AssignmentsPage />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/question-papers" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <QuestionPapersPage />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/profile" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
                <Route path="/student-portal-redirect" element={
                  <DashboardLayout>
                    <ProtectedRoute>
                      <StudentPortalRedirect />
                    </ProtectedRoute>
                  </DashboardLayout>
                } />
              </Routes>
              <Footer />
            </div>
          </BrowserRouter>
        </TooltipProvider>
        </AuthProvider>
      </Auth0Provider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
