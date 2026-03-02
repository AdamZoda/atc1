
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const FloatingBanner: React.FC = () => {
    const location = useLocation();
    const [adConfig, setAdConfig] = useState<{ enabled: boolean; scriptUrl: string }>({
        enabled: false,
        scriptUrl: '',
    });

    useEffect(() => {
        const fetchAdConfig = async () => {
            try {
                const { data: enabledData } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'ad_enabled')
                    .single();

                const { data: urlData } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'ad_script_url')
                    .single();

                setAdConfig({
                    enabled: enabledData?.value === 'true',
                    scriptUrl: urlData?.value || '',
                });
            } catch (error) {
                console.error('Error fetching ad config:', error);
            }
        };

        fetchAdConfig();

        // Subscribe to changes in settings table for realtime updates
        const channel = supabase
            .channel('ad-settings-changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', table: 'settings', schema: 'public' },
                (payload) => {
                    if (payload.new.key === 'ad_enabled') {
                        setAdConfig(prev => ({ ...prev, enabled: payload.new.value === 'true' }));
                    }
                    if (payload.new.key === 'ad_script_url') {
                        setAdConfig(prev => ({ ...prev, scriptUrl: payload.new.value }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        // Hide ad on admin pages
        const isAdminPage = location.pathname.startsWith('/admin');

        if (adConfig.enabled && adConfig.scriptUrl && !isAdminPage) {
            console.log('🚀 Injecting ad script:', adConfig.scriptUrl);
            const script = document.createElement('script');
            script.src = adConfig.scriptUrl;
            script.async = true;
            script.id = 'floating-ad-script';
            document.body.appendChild(script);

            return () => {
                const existingScript = document.getElementById('floating-ad-script');
                if (existingScript) {
                    document.body.removeChild(existingScript);
                }
                // Also cleanup any elements the script might have created if possible
                // This is tricky as many ad scripts inject their own divs/iframes
            };
        }
    }, [adConfig, location.pathname]);

    return null; // This component doesn't render anything itself
};

export default FloatingBanner;
