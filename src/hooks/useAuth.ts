// Custom hook for authentication and user profile
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';

const supabase = createBrowserClient();

export const useAuth = (fetchUserAppointments) => {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();
                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setError('Authentication error. Please try refreshing the page.');
                    return;
                }

                if (!session) {
                    console.log('No active session');
                    // No need to logout if there's no session
                    return;
                }

                // Get user ID from the session
                const userId = session.user.id;

                // Fetch user profile from the users table
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, name, phone_number')
                    .eq('user_id', userId)
                    .single();

                if (userError && userError.code === 'PGRST116') {
                    // PGRST116 is the error code for "no rows returned"
                    console.error('User not found in users table:', userError);
                    // User exists in auth but not in users table
                    await logoutAndClearData();
                    return;
                } else if (userError) {
                    console.error('Error fetching user profile:', userError);
                } else if (userData) {
                    setUser(userData);
                    setName(userData.name || '');
                    setPhone(userData.phone_number || '');
                }

                // Fetch user's appointments
                await fetchUserAppointments(userId);
            } catch (error) {
                console.error('Auth check error:', error);
                setError('Failed to load user profile. Please try again.');
            }
        };

        checkAuth();
    }, [fetchUserAppointments]);

    // Function to logout user and clear browser data
    const logoutAndClearData = async () => {
        try {
            // Log out from Supabase
            await supabase.auth.signOut();

            // Clear local state
            setUser(null);
            setName('');
            setPhone('');

            // Clear localStorage items related to the app
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith('supabase') || key.includes('appointment')) {
                    localStorage.removeItem(key);
                }
            });

            // Clear sessionStorage items
            Object.keys(sessionStorage).forEach((key) => {
                if (key.startsWith('supabase') || key.includes('appointment')) {
                    sessionStorage.removeItem(key);
                }
            });

            // Redirect to home page
            window.location.href = '/';

            console.log('User logged out and data cleared');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    return {
        user,
        name,
        setName,
        phone,
        setPhone,
        error,
        setError,
        logoutAndClearData
    };
};