import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Resolves /r/:slug to the full Workhuman Recharge landing page route.
 * Looks up the page by slug and redirects to /workhuman/recharge/{unique_token}
 */
export const WorkhumanSlugResolver = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        setNotFound(true);
        return;
      }

      const { data, error } = await supabase
        .from('generic_landing_pages')
        .select('unique_token')
        .eq('slug', slug)
        .eq('page_type', 'workhuman')
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data?.unique_token) {
        setNotFound(true);
        return;
      }

      // Preserve query params (e.g. ?lead={uuid}) through the redirect so
      // the landing page can prefill the form AND attribute the confirmation
      // email to the right assignee.
      navigate(
        `/workhuman/recharge/${data.unique_token}${location.search}${location.hash}`,
        { replace: true }
      );
    };

    resolve();
  }, [slug, navigate, location.search, location.hash]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h1>
          <p className="text-gray-500">This link doesn't match any landing page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
};
