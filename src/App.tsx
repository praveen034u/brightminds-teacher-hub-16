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
import ErrorBoundary from "@/components/ErrorBoundary";
import { GradeFilterProvider } from "@/contexts/GradeFilterContext";

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
        <GradeFilterProvider>
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
                
                {/* Protected routes - full width, no sidebar */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <TeacherHome />
                  </ProtectedRoute>
                } />
                <Route path="/students" element={
                  <ProtectedRoute>
                    <StudentsPage />
                  </ProtectedRoute>
                } />
                <Route path="/rooms" element={
                  <ProtectedRoute>
                    <RoomsPage />
                  </ProtectedRoute>
                } />
                <Route path="/rooms/:roomId" element={
                  <ProtectedRoute>
                    <RoomDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/rooms/:roomId/student/:studentId" element={
                  <ProtectedRoute>
                    <StudentActivityPage />
                  </ProtectedRoute>
                } />
                <Route path="/assignments" element={
                  <ProtectedRoute>
                    <AssignmentsPage />
                  </ProtectedRoute>
                } />
                <Route path="/question-papers" element={
                  <ProtectedRoute>
                    <QuestionPapersPage />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/student-portal-redirect" element={
                  <ProtectedRoute>
                    <StudentPortalRedirect />
                  </ProtectedRoute>
                } />
              </Routes>
              <Footer />
            </div>
          </BrowserRouter>
        </TooltipProvider>
        </GradeFilterProvider>
        </AuthProvider>
      </Auth0Provider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
