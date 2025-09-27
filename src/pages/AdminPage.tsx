import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error: any) {
      console.error('Logout Error:', error);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        backgroundColor: 'var(--quaternary)', 
        color: 'white', 
        padding: '20px' 
      }}>
        <h3 style={{ marginBottom: '30px', fontFamily: 'Lora' }}>Admin Dashboard</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <NavLink 
            to="/admin" 
            end
            style={({ isActive }) => ({
              color: 'white',
              textDecoration: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
            })}
          >
            Annunci Rapidi
          </NavLink>
          <NavLink 
            to="/admin/pdf-manager"
            style={({ isActive }) => ({
              color: 'white',
              textDecoration: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
            })}
          >
            Gestione Articoli (PDF)
          </NavLink>
          <NavLink 
            to="/admin/messages"
            style={({ isActive }) => ({
              color: 'white',
              textDecoration: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
            })}
          >
            Messaggi
          </NavLink>
        </nav>
        <hr style={{ margin: '30px 0', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
        <button 
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: 'Montserrat',
            fontWeight: '600'
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        padding: '30px', 
        backgroundColor: '#f8f9fa' 
      }}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminPage;
