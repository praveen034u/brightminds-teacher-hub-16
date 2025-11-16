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

const queryClient = new QueryClient();

const App = () => (
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
            <Routes>
              <Route path="/" element={<LoginPage />} />
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
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              {/* Student Portal - No authentication required, uses token */}
              <Route path="/student-portal" element={<StudentPortalPage />} />
              <Route path="/student-portal-redirect" element={<ProtectedRoute><StudentPortalRedirect /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </Auth0Provider>
  </QueryClientProvider>
);

export default App;
