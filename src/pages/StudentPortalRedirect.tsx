import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentPortalRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Try to get the presigned token from localStorage/sessionStorage/cookie
    // You can change this logic to match your auth flow
    const token = localStorage.getItem('student_presigned_token');
    if (token) {
      // Redirect to student portal with token
      window.location.replace(`/student-portal?token=${encodeURIComponent(token)}`);
    } else {
      // Show a message or redirect to login
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h2>Redirecting to your student portal...</h2>
      <p>If you are not redirected, please log in.</p>
    </div>
  );
};

export default StudentPortalRedirect;
