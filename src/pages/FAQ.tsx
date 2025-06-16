import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FAQ = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Help Center
    navigate('/help-center', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to Help Center...</p>
      </div>
    </div>
  );
};

export default FAQ; 