// src/pages/Unauthorized.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
        padding: '60px 40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      }}>
        {/* 403 Error */}
        <div style={{
          fontSize: '96px',
          fontWeight: 'bold',
          color: '#dc2626',
          marginBottom: '20px',
          lineHeight: '1',
        }}>
          403
        </div>

        {/* Error Title */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px',
        }}>
          Access Denied
        </h1>

        {/* Error Description */}
        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          lineHeight: '1.6',
          marginBottom: '40px',
        }}>
          You don't have permission to access this page. 
          <br />
          Please contact your administrator if you believe this is an error.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '14px 28px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            ← Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 28px',
              backgroundColor: '#0b63ce',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#0a56b3';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#0b63ce';
            }}
          >
            Go to Dashboard
          </button>
        </div>

        {/* Additional Help Text */}
        <div style={{
          marginTop: '40px',
          paddingTop: '30px',
          borderTop: '1px solid #e5e7eb',
        }}>
          <p style={{
            fontSize: '14px',
            color: '#9ca3af',
            margin: 0,
          }}>
            If you need access to this page, please contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;