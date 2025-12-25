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
      console.log('📋 User metadata:', user.user_metadata);
      
      if (identity && identity.identity_data) {
        const idata = identity.identity_data as any;
        console.log('📊 Identity data:', idata);
        
        identityUsername = idata.username ? `${idata.username}#${idata.discriminator || ''}`.replace(/#$/, '') : identityUsername;
        // Try to get display name from: global_name (custom_claims) > username > fallback
        identityDisplayName = idata.global_name || idata.full_name || idata.username || identityUsername;
        if (idata.avatar) {
          identityAvatar = `https://cdn.discordapp.com/avatars/${idata.id}/${idata.avatar}.png`;
          console.log('🖼️ Avatar URL:', identityAvatar);
        }
      }
      
      // Also try to get display name from raw_user_meta_data if not found in identity_data
      if (user.user_metadata) {
        const metadata = user.user_metadata as any;
        if (metadata.custom_claims?.global_name) {
          identityDisplayName = metadata.custom_claims.global_name;
          console.log('✨ Found global_name in custom_claims:', identityDisplayName);
        } else if (metadata.full_name && !identityDisplayName.includes('@')) {
          identityDisplayName = metadata.full_name;
          console.log('✨ Found full_name in metadata:', identityDisplayName);
        }
        
        // Get avatar from metadata if not found in identity_data
        if (!identityAvatar) {
          if (metadata.avatar_url) {
            identityAvatar = metadata.avatar_url;
            console.log('🖼️ Found avatar_url in metadata:', identityAvatar);
          } else if (metadata.picture) {
            identityAvatar = metadata.picture;
            console.log('🖼️ Found picture in metadata:', identityAvatar);
          }
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
        
        // When using HashRouter with OAuth, the URL looks like: #/auth/callback#access_token=...
        // We need to extract BOTH the route part and the token fragment
        const hash = window.location.hash || '';
        console.log('Full hash:', hash);
        
        // Split by the second # to separate route from token fragment
        const hashParts = hash.split('#');
        console.log('Hash parts:', hashParts);
        
        // hashParts[0] = '' (before first #)
        // hashParts[1] = '/auth/callback' (the route)
        // hashParts[2] = 'access_token=...&refresh_token=...' (the tokens)
        const fragment = hashParts[2] || hashParts[1] || '';
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
