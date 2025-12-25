import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Connexion en cours…');

  // Merge identity data into profiles without overwriting existing user edits.
  const persistProfileFromUser = async (user: any) => {
    try {
      console.log('👤 persistProfileFromUser - User data:', user);
      
      const identity = (user.identities || []).find((i: any) => i.provider === 'discord');
      let identityUsername = user.email || user.id;
      let identityDisplayName = user.email || user.id;
      let identityAvatar: string | undefined;
      
      console.log('🔍 Discord identity:', identity);
      
      if (identity && identity.identity_data) {
        const idata = identity.identity_data as any;
        console.log('📊 Identity data:', idata);
        
        identityUsername = idata.username ? `${idata.username}#${idata.discriminator || ''}`.replace(/#$/, '') : identityUsername;
        identityDisplayName = idata.global_name || idata.username || identityUsername;
        if (idata.avatar) {
          identityAvatar = `https://cdn.discordapp.com/avatars/${idata.id}/${idata.avatar}.png`;
          console.log('🖼️ Avatar URL:', identityAvatar);
        }
      }

      // Fetch existing profile to avoid overwriting user edits
      const { data: existingProfile, error: fetchError } = await supabase.from('profiles').select('username, avatar_url, display_name').eq('id', user.id).maybeSingle();
      
      if (fetchError) {
        console.error('❌ Erreur fetch profil:', fetchError);
      } else {
        console.log('📋 Profil existant:', existingProfile);
      }

      const finalUsername = existingProfile?.username || identityUsername;
      const finalDisplayName = existingProfile?.display_name || identityDisplayName;
      const finalAvatar = existingProfile?.avatar_url || identityAvatar || null;

      console.log('💾 Données à upsert:', { id: user.id, username: finalUsername, display_name: finalDisplayName, avatar_url: finalAvatar });

      const { data: upsertData, error: upsertError } = await supabase.from('profiles').upsert({ 
        id: user.id, 
        username: finalUsername, 
        avatar_url: finalAvatar, 
        display_name: finalDisplayName 
      });
      
      if (upsertError) {
        console.error('❌ Erreur upsert profil:', upsertError);
        throw upsertError;
      } else {
        console.log('✅ Profil créé/mis à jour:', upsertData);
      }
    } catch (e) {
      console.error('❌ persistProfileFromUser error', e);
      throw e;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setMessage('Traitement de la réponse d’authentification...');

        // Try to extract session from URL (typical for OAuth flow)
        let result: any = null;
        try {
          if (supabase.auth && typeof (supabase.auth as any).getSessionFromUrl === 'function') {
            result = await (supabase.auth as any).getSessionFromUrl({ storeSession: true });
            console.log('getSessionFromUrl result:', result);
          } else {
            console.warn('supabase.auth.getSessionFromUrl is not available, skipping to fallback');
          }
        } catch (e) {
          console.error('Error calling getSessionFromUrl (will fallback):', e);
        }

        // Then verify we actually have a session stored
        const { data } = await supabase.auth.getSession();
        console.log('supabase.auth.getSession():', data);

        if (data && data.session) {
          // persist Discord username/avatar into profiles so UI shows correct name
          try {
            const user = (data.session as any).user;
            await persistProfileFromUser(user);
            // Redirect to home with location permission handling
            setMessage('Connexion réussie, redirection...');
            navigate('/');
            setTimeout(() => window.location.reload(), 300);
          } catch (e) {
            console.error('Failed to persist profile from session:', e);
          }

          return;
        }

        // If no session, possibly Supabase handled server-side; attempt to get auth cookie session
        setMessage('Aucune session trouvée, tentative de récupération...');
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Second getSession attempt:', sessionData);

        if (sessionData && sessionData.session) {
          try {
            const user = (sessionData.session as any).user;
            await persistProfileFromUser(user);
            // Redirect to home with location permission handling
            setMessage('Connexion réussie, redirection...');
            navigate('/');
            setTimeout(() => window.location.reload(), 300);
          } catch (e) {
            console.error('Failed to persist profile from sessionData:', e);
          }

          return;
        }

        // Nothing worked — try manual parse of URL fragment (fallback)
        console.warn('Aucune session après callback, tentative de fallback en analysant le hash');
        const hash = window.location.hash || '';
        // Extract the fragment after the last '#' (handles '#/auth/callback#access_token=...')
        const lastHash = hash.lastIndexOf('#');
        const fragment = lastHash !== -1 ? hash.slice(lastHash + 1) : hash.replace(/^#/, '');
        console.log('Parsed fragment for tokens:', fragment);
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token) {
          setMessage('Session trouvée dans l’URL — application en cours...');
          try {
            const setRes = await supabase.auth.setSession({ access_token, refresh_token });
            console.log('setSession called with tokens:', { access_token: !!access_token, refresh_token: !!refresh_token });
            console.log('setSession result:', setRes);
            const { data: finalSession } = await supabase.auth.getSession();
            console.log('After setSession getSession():', finalSession);
            if (finalSession && finalSession.session) {
              try {
                const user = (finalSession.session as any).user;
                await persistProfileFromUser(user);
              } catch (e) {
                console.error('Failed to persist profile after setSession:', e);
              }

              setMessage('Connexion réussie après fallback, redirection...');
              navigate('/');
              setTimeout(() => window.location.reload(), 300);
              return;
            }
          } catch (e) {
            console.error('Erreur setSession fallback:', e);
          }
        }

        // Nothing worked
        console.warn('Aucune session après callback');
        setMessage('Échec: aucune session trouvée. Retour à la page de connexion.');
        setTimeout(() => navigate('/login'), 1500);
      } catch (err: any) {
        console.error('Auth callback error', err);
        setMessage('Erreur lors de la connexion. Retour à la page de connexion.');
        setTimeout(() => navigate('/login'), 1500);
      }
    })();
  }, [navigate]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-luxury-dark">
      <div className="text-center text-white">{message}</div>
    </div>
  );
};

export default AuthCallback;
