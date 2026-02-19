import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Resolves /p/:slug to the full proposal route.
 * Looks up the proposal by slug and redirects to /proposal/:id?shared=true
 */
export const SlugResolver = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        setNotFound(true);
        return;
      }

      const { data, error } = await supabase
        .from('proposals')
        .select('id')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      navigate(`/proposal/${data.id}?shared=true`, { replace: true });
    };

    resolve();
  }, [slug, navigate]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Proposal Not Found</h1>
          <p className="text-gray-500">The link you followed doesn't match any proposal.</p>
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
