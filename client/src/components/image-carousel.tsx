import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  autoScrollDuration?: number; // Duration in milliseconds, defaults to 7 seconds
  className?: string;
}

export default function ImageCarousel({ 
  images, 
  alt, 
  autoScrollDuration = 7000, // 7 seconds default
  className = ""
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Auto-scroll functionality
  useEffect(() => {
    if (images.length <= 1 || isHovered) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, autoScrollDuration);
    
    return () => clearInterval(interval);
  }, [images.length, autoScrollDuration, isHovered]);
  
  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };
  
  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };
  
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };
  
  if (!images || images.length === 0) {
    return (
      <div className={`w-full h-64 bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">No image available</p>
        </div>
      </div>
    );
  }
  
  if (images.length === 1) {
    return (
      <div className={`relative w-full h-64 ${className}`}>
        <img 
          src={images[0]}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }
  
  return (
    <div 
      className={`relative w-full h-64 overflow-hidden group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="image-carousel"
    >
      {/* Main image container */}
      <div className="relative w-full h-full">
        <img 
          src={images[currentIndex]}
          alt={`${alt} - Image ${currentIndex + 1} of ${images.length}`}
          className="w-full h-full object-cover transition-all duration-500"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          data-testid={`carousel-image-${currentIndex}`}
        />
        
        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={goToPrevious}
          data-testid="carousel-prev"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={goToNext}
          data-testid="carousel-next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Image counter */}
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          {currentIndex + 1} / {images.length}
        </div>
        
        {/* Auto-scroll indicator */}
        {!isHovered && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse mr-2"></div>
            Auto-scroll
          </div>
        )}
      </div>
      
      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-white scale-125' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            onClick={() => goToSlide(index)}
            data-testid={`carousel-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}