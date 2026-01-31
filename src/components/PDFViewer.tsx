import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCw, Maximize, Minimize } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSharedView = location.search.includes('shared=true');

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 32;
        setContainerWidth(width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onPageLoadSuccess = ({ width, height }: { width: number; height: number }) => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 32;
      const newScale = containerWidth / width;
      setScale(Math.min(newScale, 1.5)); // Increased max scale to 1.5
    }
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('Error loading PDF:', err);
    setError('Failed to load PDF. Please try again later.');
    setLoading(false);
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  if (!name) {
    return <div>No brochure specified</div>;
  }

  const pdfUrl = supabase.storage
    .from('brochures')
    .getPublicUrl(`${name}.pdf`)
    .data.publicUrl;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {!isSharedView && (
            <Button
              onClick={() => navigate('/brochure')}
              variant="secondary"
              icon={<ArrowLeft size={20} />}
              className="text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Back to Brochures</span>
              <span className="sm:hidden">Back</span>
            </Button>
          )}
          <img 
            src="/shortcut-logo-blue.svg" 
            alt="Shortcut Logo" 
            className="h-6 sm:h-8 w-auto"
          />
        </div>
      </header>

      <main className="max-w-[90rem] mx-auto py-4 sm:py-8 px-4">
        <div 
          ref={containerRef}
          className={`bg-white rounded-lg shadow-lg p-4 sm:p-6 ${isFullscreen ? 'h-screen' : ''}`}
        >
          {error ? (
            <div className="text-red-600 text-center py-8">{error}</div>
          ) : (
            <>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4">
                <Button
                  onClick={zoomOut}
                  variant="secondary"
                  icon={<ZoomOut size={18} />}
                  disabled={scale <= 0.5}
                  className="text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Zoom Out</span>
                </Button>
                <Button
                  onClick={zoomIn}
                  variant="secondary"
                  icon={<ZoomIn size={18} />}
                  disabled={scale >= 2}
                  className="text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Zoom In</span>
                </Button>
                <Button
                  onClick={rotate}
                  variant="secondary"
                  icon={<RotateCw size={18} />}
                  className="text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Rotate</span>
                </Button>
                <Button
                  onClick={toggleFullscreen}
                  variant="secondary"
                  icon={isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  className="text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </span>
                </Button>
              </div>

              <div 
                className={`flex flex-col items-center overflow-auto ${
                  isFullscreen ? 'h-[calc(100vh-200px)]' : 'max-h-[calc(100vh-200px)]'
                }`}
              >
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner size="large" />
                    </div>
                  }
                >
                  {Array.from(new Array(numPages), (_, index) => (
                    <div key={`page_${index + 1}`} className="mb-8 last:mb-0">
                      <Page
                        pageNumber={index + 1}
                        loading={
                          <div className="flex items-center justify-center py-12">
                            <LoadingSpinner size="large" />
                          </div>
                        }
                        className="flex justify-center"
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        scale={scale}
                        rotate={rotation}
                        width={containerWidth}
                        onLoadSuccess={onPageLoadSuccess}
                      />
                    </div>
                  ))}
                </Document>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PDFViewer;