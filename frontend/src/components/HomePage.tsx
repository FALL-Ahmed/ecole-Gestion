import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        } else {
            const timer = setTimeout(() => {
                navigate('/login');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="fixed inset-0 bg-[#1D52DB] flex items-center justify-center overflow-hidden">
            {/* Meta pour désactiver le zoom */}
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
            
            {/* Conteneur de taille fixe pour la vidéo */}
            <div className="relative" style={{
                width: 'calc(100vw * 1.3)',
                height: 'calc(100vh * 1.3)',
                maxWidth: '70%',
                maxHeight: '70%'
            }}>
                {/* Vidéo à 1.3x taille originale */}
                <video 
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                    style={{
                        backgroundColor: '#1D52DB',
                        transform: 'scale(1)',
                        display: 'block'
                    }}
                >
                    <source src="/logo.mp4" type="video/mp4" />
                </video>
            </div>
        </div>
    );
};

export default HomePage;