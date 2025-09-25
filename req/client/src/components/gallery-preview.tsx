import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Eye, MapPin, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { ProjectGallery } from "@shared/schema";

interface GalleryResponse {
  projects: ProjectGallery[];
  totalCount: number;
}

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing", color: "bg-blue-500" },
  { value: "electrical", label: "Electrical", color: "bg-yellow-500" },
  { value: "carpentry", label: "Carpentry", color: "bg-amber-600" },
  { value: "tech", label: "Tech", color: "bg-green-500" },
  { value: "general", label: "General", color: "bg-purple-500" }
];

function FeaturedProjectCard({ project }: { project: ProjectGallery }) {
  const categoryInfo = CATEGORIES.find(cat => cat.value === project.category);
  
  return (
    <Card className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-border">
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={project.imageUrl}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          data-testid={`img-featured-project-${project.id}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {categoryInfo && (
          <Badge 
            className={`absolute top-3 left-3 ${categoryInfo.color} text-white`}
            data-testid={`badge-category-${project.id}`}
          >
            {categoryInfo.label}
          </Badge>
        )}
        
        {project.beforeImageUrl && (
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 bg-white/90 text-gray-800"
          >
            Before/After
          </Badge>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <h4 className="font-semibold text-lg mb-2" data-testid={`text-title-${project.id}`}>
            {project.title}
          </h4>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {project.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {project.location}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(project.completionDate), "MMM yyyy")}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-80">
              <Eye className="w-3 h-3" />
              View
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function GalleryPreviewSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="aspect-video w-full" />
        </Card>
      ))}
    </div>
  );
}

export default function GalleryPreview() {
  const { data, isLoading, error } = useQuery<GalleryResponse>({
    queryKey: ["/api/gallery?page=1&limit=3"],
    enabled: true,
  });

  if (error) {
    return null; // Fail gracefully - don't show section if can't load data
  }

  const featuredProjects = data?.projects?.slice(0, 3) || [];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            OUR WORK
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4" data-testid="text-gallery-preview-title">
            Craftsmanship You Can Trust
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-testid="text-gallery-preview-description">
            See the quality and attention to detail that sets HandyTech Solutions apart. 
            From smart home installations to traditional repairs, every project is completed with precision and care.
          </p>
        </div>

        {isLoading ? (
          <GalleryPreviewSkeleton />
        ) : featuredProjects.length > 0 ? (
          <div className="space-y-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gallery-preview-grid">
              {featuredProjects.map((project) => (
                <Link key={project.id} href="/gallery">
                  <FeaturedProjectCard project={project} />
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Button 
                asChild
                size="lg" 
                className="bg-brand-red hover:bg-brand-red-dark text-white px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105"
              >
                <Link href="/gallery" data-testid="button-view-all-projects">
                  View All Projects
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <p className="text-gray-600 mt-4">
                Explore {data?.totalCount || 'our complete'} completed projects and see why Missouri customers trust HandyTech Solutions
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-brand-red text-white px-6 py-4 rounded-lg inline-flex items-center space-x-3">
              <span className="text-2xl">🔨</span>
              <div className="text-left">
                <h3 className="font-bold">Projects Coming Soon!</h3>
                <p className="text-sm opacity-90">We're building our gallery of completed work</p>
              </div>
            </div>
            <Button 
              asChild
              variant="outline" 
              className="mt-6 border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
            >
              <Link href="/gallery" data-testid="button-visit-gallery-page">
                Visit Gallery Page
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
        
        {/* Trust indicators */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-brand-red mb-2">10+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-red mb-2">{data?.totalCount || 'Many'}</div>
              <div className="text-gray-600">Completed Projects</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-red mb-2">100%</div>
              <div className="text-gray-600">Customer Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}