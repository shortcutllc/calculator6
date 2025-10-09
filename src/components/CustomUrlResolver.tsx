import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CustomUrlService } from '../services/CustomUrlService';
import { LoadingSpinner } from './LoadingSpinner';
import { supabase } from '../lib/supabaseClient';

interface CustomUrlResolverProps {
  children: React.ReactNode;
}

export const CustomUrlResolver: React.FC<CustomUrlResolverProps> = ({ children }) => {
  const { client, type, slug } = useParams<{ client: string; type: string; slug: string }>();
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const resolveCustomUrl = async () => {
      // Only resolve if we have all the custom URL parameters
      if (!client || !type || !slug) {
        return;
      }

      // Skip resolution for certain routes that don't need custom URL handling
      const skipRoutes = ['admin', 'headshots', 'login', 'register'];
      if (skipRoutes.includes(type)) {
        return;
      }

      setIsResolving(true);

      try {
        const customUrl = await CustomUrlService.getByCustomUrl(
          client,
          slug,
          type as any
        );

        if (customUrl) {
          // Redirect to the original URL based on type
          switch (type) {
            case 'proposal':
              navigate(`/proposal/${customUrl.original_id}?shared=true`);
              break;
            case 'headshot_event':
              // For headshot events, we need to get the manager token and redirect to manager gallery
              try {
                const { data: eventData, error: eventError } = await supabase
                  .from('headshot_events')
                  .select('manager_token')
                  .eq('id', customUrl.original_id)
                  .single();

                if (eventError || !eventData?.manager_token) {
                  console.error('Event not found or missing manager token:', eventError);
                  navigate('/');
                  return;
                }
                navigate(`/manager/${eventData.manager_token}`);
              } catch (error) {
                console.error('Error fetching manager token:', error);
                navigate('/');
              }
              break;
            case 'employee_gallery':
              // For employee galleries, we need to get the unique token and redirect to gallery
              try {
                const { data: galleryData, error: galleryError } = await supabase
                  .from('employee_galleries')
                  .select('unique_token')
                  .eq('id', customUrl.original_id)
                  .single();

                if (galleryError || !galleryData?.unique_token) {
                  console.error('Gallery not found or missing unique token:', galleryError);
                  navigate('/');
                  return;
                }
                navigate(`/gallery/${galleryData.unique_token}`);
              } catch (error) {
                console.error('Error fetching gallery token:', error);
                navigate('/');
              }
              break;
            case 'photographer_token':
              // For photographer tokens, we need to get the actual token and redirect to photographer portal
              try {
                const { data: tokenData, error: tokenError } = await supabase
                  .from('photographer_tokens')
                  .select('token')
                  .eq('id', customUrl.original_id)
                  .single();

                if (tokenError || !tokenData?.token) {
                  console.error('Photographer token not found or missing token string:', tokenError);
                  navigate('/');
                  return;
                }
                navigate(`/photographer/${tokenData.token}`);
              } catch (error) {
                console.error('Error fetching photographer token:', error);
                navigate('/');
              }
              break;
            default:
              console.warn('Unknown custom URL type:', type);
              navigate('/');
          }
        } else {
          // Custom URL not found, redirect to 404 or home
          console.warn('Custom URL not found:', { client, type, slug });
          navigate('/');
        }
      } catch (error) {
        console.error('Error resolving custom URL:', error);
        navigate('/');
      } finally {
        setIsResolving(false);
      }
    };

    resolveCustomUrl();
  }, [client, type, slug, navigate]);

  if (isResolving) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
