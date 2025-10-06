import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, X, MapPin, Calendar, ImageIcon, Home } from "lucide-react";
import { format } from "date-fns";
import type { ProjectGallery } from "@shared/schema";

interface GalleryResponse {
  projects: ProjectGallery[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

const CATEGORIES = [
  { value: "all", label: "All", color: "bg-gray-500" },
  { value: "plumbing", label: "Plumbing", color: "bg-blue-500" },
  { value: "electrical", label: "Electrical", color: "bg-yellow-500" },
  { value: "carpentry", label: "Carpentry", color: "bg-amber-600" },
  { value: "tech", label: "Tech", color: "bg-green-500" },
  { value: "general", label: "General", color: "bg-purple-500" }
];

const ITEMS_PER_PAGE = 12;

function GallerySkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: ProjectGallery; onClick: () => void }) {
  const categoryInfo = CATEGORIES.find(cat => cat.value === project.category) || CATEGORIES[0];
  
  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-border"
      onClick={onClick}
      data-testid={`card-project-${project.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={project.imageUrl}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Badge 
          className={`absolute top-2 left-2 ${categoryInfo.color} text-white`}
          data-testid={`badge-category-${project.id}`}
        >
          {categoryInfo.label}
        </Badge>
        {project.beforeImageUrl && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 bg-white/90 text-gray-800"
            data-testid={`badge-before-after-${project.id}`}
          >
            Before/After
          </Badge>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <h3 className="font-semibold text-lg mb-1" data-testid={`text-title-${project.id}`}>
            {project.title}
          </h3>
          <div className="flex items-center gap-4 text-sm">
            {project.location && (
              <div className="flex items-center gap-1" data-testid={`text-location-${project.id}`}>
                <MapPin className="w-3 h-3" />
                {project.location}
              </div>
            )}
            <div className="flex items-center gap-1" data-testid={`text-completion-date-${project.id}`}>
              <Calendar className="w-3 h-3" />
              {format(new Date(project.completionDate), "MMM yyyy")}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProjectModal({ 
  project, 
  projects,
  isOpen, 
  onClose, 
  onNavigate 
}: { 
  project: ProjectGallery | null;
  projects: ProjectGallery[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const [showBefore, setShowBefore] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onNavigate('prev');
          break;
        case 'ArrowRight':
          onNavigate('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate]);

  if (!project) return null;

  const categoryInfo = CATEGORIES.find(cat => cat.value === project.category) || CATEGORIES[0];
  const currentIndex = projects.findIndex(p => p.id === project.id);
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < projects.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden p-0"
        data-testid="dialog-project-details"
      >
        <div className="relative">
          {/* Navigation Arrows */}
          {canNavigatePrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => onNavigate('prev')}
              data-testid="button-navigate-prev"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          
          {canNavigateNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => onNavigate('next')}
              data-testid="button-navigate-next"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Image */}
          <div className="relative aspect-video bg-gray-100">
            <img
              src={showBefore && project.beforeImageUrl ? project.beforeImageUrl : project.imageUrl}
              alt={showBefore ? `${project.title} - Before` : project.title}
              className="w-full h-full object-cover"
              data-testid={`img-project-${showBefore ? 'before' : 'after'}`}
            />
            
            {/* Before/After Toggle */}
            {project.beforeImageUrl && (
              <div className="absolute bottom-4 left-4">
                <div className="flex gap-2">
                  <Button
                    variant={!showBefore ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setShowBefore(false)}
                    data-testid="button-show-after"
                  >
                    After
                  </Button>
                  <Button
                    variant={showBefore ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setShowBefore(true)}
                    data-testid="button-show-before"
                  >
                    Before
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-left" data-testid="text-modal-title">
                  {project.title}
                </DialogTitle>
                <Badge 
                  className={`${categoryInfo.color} text-white mt-2`}
                  data-testid="badge-modal-category"
                >
                  {categoryInfo.label}
                </Badge>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <p className="text-muted-foreground" data-testid="text-modal-description">
              {project.description}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {project.location && (
                <div className="flex items-center gap-2" data-testid="text-modal-location">
                  <MapPin className="w-4 h-4" />
                  {project.location}
                </div>
              )}
              <div className="flex items-center gap-2" data-testid="text-modal-completion">
                <Calendar className="w-4 h-4" />
                Completed {format(new Date(project.completionDate), "MMMM d, yyyy")}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Gallery() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProject, setSelectedProject] = useState<ProjectGallery | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [allProjects, setAllProjects] = useState<ProjectGallery[]>([]);

  // Fetch gallery data - Build complete URL with query parameters in first queryKey segment
  const url = `/api/gallery?page=${page}${selectedCategory !== 'all' ? `&category=${encodeURIComponent(selectedCategory)}` : ''}`;
  const { data, isLoading, error, refetch } = useQuery<GalleryResponse>({
    queryKey: [url],
    enabled: true,
  });

  // Update all projects when data changes with duplicate prevention
  useEffect(() => {
    if (data?.projects) {
      if (page === 1) {
        // For first page, replace all projects
        setAllProjects(data.projects);
      } else {
        // For subsequent pages, append new projects while preventing duplicates
        setAllProjects(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProjects = data.projects.filter(project => !existingIds.has(project.id));
          return [...prev, ...newProjects];
        });
      }
    }
  }, [data, page]);

  // Reset page when category changes
  useEffect(() => {
    setPage(1);
    setAllProjects([]);
  }, [selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const openModal = (project: ProjectGallery) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const navigateProject = (direction: 'prev' | 'next') => {
    if (!selectedProject) return;
    
    const currentIndex = allProjects.findIndex(p => p.id === selectedProject.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
    } else {
      newIndex = currentIndex < allProjects.length - 1 ? currentIndex + 1 : currentIndex;
    }
    
    if (newIndex !== currentIndex) {
      setSelectedProject(allProjects[newIndex]);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const hasMore = data?.hasMore || false;
  const isLoadingMore = isLoading && page > 1;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Project Gallery - HandyTech Solutions</title>
        <meta name="description" content="Explore our portfolio of completed handyman projects including plumbing, electrical, carpentry, smart home tech installations, and general repairs. See the quality craftsmanship that makes HandyTech Solutions Missouri's trusted handyman service." />
        <link rel="canonical" href="https://handytech-solutions.com/gallery" />
        <meta property="og:title" content="Project Gallery - HandyTech Solutions" />
        <meta property="og:description" content="Browse our completed handyman projects and see the quality work that sets us apart in Missouri." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://handytech-solutions.com/gallery" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center relative">
            {/* Back to Home Button */}
            <Link href="/">
              <Button
                variant="outline"
                className="absolute left-0 top-0 flex items-center gap-2 hover:bg-brand-red hover:text-white hover:border-brand-red transition-colors"
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
            
            <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-page-title">
              Project Gallery
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-page-description">
              Explore our portfolio of completed projects. From smart home installations to plumbing repairs, 
              see the quality craftsmanship that makes HandyTech Solutions Missouri's trusted handyman service.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                onClick={() => handleCategoryChange(category.value)}
                className={`
                  transition-all duration-200
                  ${selectedCategory === category.value 
                    ? 'bg-brand-red hover:bg-brand-red-dark text-white border-brand-red shadow-md' 
                    : 'hover:bg-brand-red hover:text-white hover:border-brand-red'
                  }
                `}
                data-testid={`button-filter-${category.value}`}
              >
                {category.label}
                {data && selectedCategory === category.value && (
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                    {data.totalCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12" data-testid="error-state">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <ImageIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to load gallery</h3>
            <p className="text-muted-foreground mb-4">
              We're having trouble loading our project gallery. Please try again.
            </p>
            <Button onClick={() => refetch()} data-testid="button-retry">
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && page === 1 && <GallerySkeletonGrid />}

        {/* Empty State */}
        {!isLoading && data && allProjects.length === 0 && (
          <div className="text-center py-12" data-testid="empty-state">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              {selectedCategory === "all" 
                ? "We haven't added any projects to our gallery yet. Check back soon!"
                : `No ${CATEGORIES.find(c => c.value === selectedCategory)?.label.toLowerCase()} projects available.`
              }
            </p>
          </div>
        )}

        {/* Gallery Grid */}
        {!isLoading && allProjects.length > 0 && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="gallery-grid">
              {allProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => openModal(project)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <Button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  size="lg"
                  className="bg-brand-red hover:bg-brand-red-dark text-white"
                  data-testid="button-load-more"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More Projects'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Modal */}
      <ProjectModal
        project={selectedProject}
        projects={allProjects}
        isOpen={isModalOpen}
        onClose={closeModal}
        onNavigate={navigateProject}
      />
    </div>
  );
}