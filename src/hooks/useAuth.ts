// Custom hook for authentication and user profile
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';

const supabase = createBrowserClient();

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        // Add this function to your useAuth hook
        const persistSessionToLocalStorage = (session) => {
          if (!session) return;
          try {
            localStorage.setItem('supabase_session', JSON.stringify(session));
          } catch (error) {
            console.error('Error saving session to localStorage:', error);
          }
        };
        
        const getSessionFromLocalStorage = () => {
          try {
            const sessionStr = localStorage.getItem('supabase_session');
            return sessionStr ? JSON.parse(sessionStr) : null;
          } catch (error) {
            console.error('Error retrieving session from localStorage:', error);
            return null;
          }
        };
        
        // Modify your checkAuth function to use the localStorage fallback
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
            
            // If no session from cookies, try localStorage
            let activeSession = session;
            if (!activeSession) {
              console.log('No active session from cookies, trying localStorage');
              const localSession = getSessionFromLocalStorage();
              if (localSession) {
                // Try to restore session from localStorage
                const { data: { session: restoredSession } } = 
                  await supabase.auth.setSession(localSession);
                activeSession = restoredSession;
              }
            } else {
              // If we have a session, persist it to localStorage as backup
              persistSessionToLocalStorage(session);
            }
            
            if (!activeSession) {
              console.log('No active session');
              return;
            }
            
            // Get user ID from the session
            const userId = activeSession.user.id;

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
        } catch (error) {
            console.error('Auth check error:', error);
            setError('Failed to load user profile. Please try again.');
        }
    };

    checkAuth();
    }, []);

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