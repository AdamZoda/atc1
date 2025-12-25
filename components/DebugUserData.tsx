import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';

interface DebugUserDataProps {
  profile: Profile | null;
}

const DebugUserData: React.FC<DebugUserDataProps> = ({ profile }) => {
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Get Discord identity
          const discordIdentity = (user.identities || []).find((i: any) => i.provider === 'discord');
          
          // Get raw user metadata
          const rawMetadata = user.user_metadata || {};
          
          // Get profile from database
          const { data: dbProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          setDebugData({
            userId: user.id,
            discordIdentityId: discordIdentity?.identity_data?.id || 'NOT FOUND',
            rawMetadataProviderId: rawMetadata.provider_id || 'NOT FOUND',
            dbProfileProviderId: dbProfile?.provider_id || 'NOT FOUND IN DB',
            dbProfileAllColumns: dbProfile ? Object.keys(dbProfile) : [],
            profileState: profile?.provider_id || 'NOT IN STATE',
            error: error?.message || null,
          });
        }
      } catch (err) {
        setDebugData({ error: String(err) });
      }
    };

    fetchDebugData();
  }, [profile]);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-purple-600 text-white text-xs rounded font-bold z-50"
      >
        🐛 DEBUG
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-black border-2 border-purple-500 rounded-lg p-4 text-xs text-green-400 font-mono z-50 max-h-96 overflow-auto">
      <button
        onClick={() => setShowDebug(false)}
        className="absolute top-2 right-2 text-white hover:text-red-400"
      >
        ✕
      </button>
      
      <div className="space-y-2">
        <div className="font-bold text-purple-400 border-b border-purple-500 pb-2">🔍 DEBUG DATA</div>
        
        {debugData && (
          <>
            <div>
              <span className="text-blue-400">Discord Identity ID:</span>
              <div className="ml-4 text-yellow-400">{debugData.discordIdentityId}</div>
            </div>
            
            <div>
              <span className="text-blue-400">Raw Metadata provider_id:</span>
              <div className="ml-4 text-yellow-400">{debugData.rawMetadataProviderId}</div>
            </div>
            
            <div>
              <span className="text-blue-400">DB Profile provider_id:</span>
              <div className="ml-4 text-yellow-400">{debugData.dbProfileProviderId}</div>
            </div>
            
            <div>
              <span className="text-blue-400">State provider_id:</span>
              <div className="ml-4 text-yellow-400">{debugData.profileState}</div>
            </div>

            <div>
              <span className="text-blue-400">DB Columns:</span>
              <div className="ml-4 text-cyan-400 max-h-24 overflow-auto">
                {debugData.dbProfileAllColumns.join(', ')}
              </div>
            </div>

            {debugData.error && (
              <div>
                <span className="text-red-400">Error:</span>
                <div className="ml-4 text-red-300">{debugData.error}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DebugUserData;
