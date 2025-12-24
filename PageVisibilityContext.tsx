import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';

export interface PageVisibility {
  [key: string]: boolean;
}

interface PageVisibilityContextType {
  pageVisibility: PageVisibility;
  isPageVisible: (pageName: string) => boolean;
  setPageVisibility: (visibility: PageVisibility) => void;
  updatePageVisibility: (pageId: string, isVisible: boolean) => Promise<void>;
  loading: boolean;
}

const PageVisibilityContext = createContext<PageVisibilityContextType | undefined>(undefined);

export const PageVisibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pageVisibility, setPageVisibility] = useState<PageVisibility>({});
  const [loading, setLoading] = useState(true);

  // Fetch initial page visibility
  useEffect(() => {
    const fetchPageVisibility = async () => {
      try {
        const { data, error } = await supabase
          .from('page_visibility')
          .select('*');

        if (error) throw error;

        const visibility: PageVisibility = {};
        data?.forEach((page: any) => {
          visibility[page.page_name] = page.is_visible;
        });
        setPageVisibility(visibility);
      } catch (error) {
        console.error('Error fetching page visibility:', error);
        // Default to all visible if fetch fails
        setPageVisibility({
          Home: true,
          Features: true,
          Rules: true,
          Community: true,
          Game: true,
          Shop: true,
          Gallery: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPageVisibility();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('page_visibility')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'page_visibility' },
        (payload: any) => {
          const { new: newRecord } = payload;
          if (newRecord) {
            setPageVisibility((prev) => ({
              ...prev,
              [newRecord.page_name]: newRecord.is_visible,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const isPageVisible = (pageName: string): boolean => {
    // Retourne true si la page est visible, false si cachée, true par défaut si pas trouvée
    return pageVisibility[pageName] !== false;
  };

  const updatePageVisibility = async (pageId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('page_visibility')
        .update({ is_visible: isVisible })
        .eq('id', pageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating page visibility:', error);
      throw error;
    }
  };

  return (
    <PageVisibilityContext.Provider
      value={{
        pageVisibility,
        isPageVisible,
        setPageVisibility,
        updatePageVisibility,
        loading,
      }}
    >
      {children}
    </PageVisibilityContext.Provider>
  );
};

export const usePageVisibility = () => {
  const context = useContext(PageVisibilityContext);
  if (context === undefined) {
    throw new Error('usePageVisibility must be used within PageVisibilityProvider');
  }
  return context;
};
