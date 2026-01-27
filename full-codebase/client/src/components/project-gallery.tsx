import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { type ProjectGallery } from "@shared/schema";
import { Calendar, MapPin, Eye } from "lucide-react";
import ImageCarousel from "@/components/image-carousel";

const categories = [
  { value: "all", label: "All Projects" },
  { value: "tech", label: "Tech Setup" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "carpentry", label: "Carpentry" },
  { value: "general", label: "General Handyman" }
];

export default function ProjectGallery() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProject, setSelectedProject] = useState<ProjectGallery | null>(null);

  // Helper function to get all images for a project
  const getProjectImages = (project: ProjectGallery): string[] => {
    const images: string[] = [];
    if (project.imageUrl) images.push(project.imageUrl);
    if (project.beforeImageUrl) images.push(project.beforeImageUrl);
    if (project.imageUrls && Array.isArray(project.imageUrls)) {
      images.push(...project.imageUrls);
    }
    return images;
  };

  const { data: projects = [] } = useQuery<ProjectGallery[]>({
    queryKey: [selectedCategory === "all" 
      ? "/api/gallery" 
      : `/api/gallery?category=${selectedCategory}`],
  });

  const { data: featuredProjects = [] } = useQuery<ProjectGallery[]>({
    queryKey: ["/api/gallery/featured"],
  });

  const displayProjects = selectedCategory === "all" ? projects : projects;

  return (
    <section id="gallery" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-white text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            PROJECT GALLERY
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">
            Our Work <span className="text-brand-red">Speaks for Itself</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Take a look at our completed projects. From tech installations to home repairs, 
            we deliver quality workmanship that speaks for itself.
          </p>
        </div>

        {/* Featured Projects Section */}
        {featuredProjects.length > 0 && (
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-charcoal mb-8 text-center">Featured Projects</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredProjects.slice(0, 2).map((project) => (
                <Card key={project.id} className="overflow-hidden hover:shadow-xl transition-shadow group">
                  <div className="relative">
                    <div className="w-full h-64 bg-gray-200 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                      <img 
                        src={project.imageUrl}
                        alt={`${project.title} - ${project.category} handyman project by HandyTech Solutions`}
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          console.log("Image failed to load:", project.imageUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => console.log("Image loaded successfully:", project.imageUrl)}
                      />
                      <div className="absolute inset-0 bg-brand-red/10 flex items-center justify-center">
                        <div className="text-center text-brand-red">
                          <div className="w-16 h-16 bg-brand-red rounded-lg flex items-center justify-center mx-auto mb-2">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold">{project.title}</p>
                          <p className="text-xs opacity-75">Project Photo</p>
                        </div>
                      </div>
                    </div>
                    <Badge className="absolute top-4 left-4 bg-brand-red">Featured</Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
                          onClick={() => setSelectedProject(project)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="capitalize">
                        {project.category}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(project.completionDate).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-charcoal mb-2">{project.title}</h3>
                    <p className="text-gray-600 mb-4">{project.description}</p>
                    {project.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {project.location}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.value)}
              className={selectedCategory === category.value 
                ? "bg-brand-red hover:bg-brand-red-dark" 
                : "hover:bg-brand-red hover:text-white"
              }
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative">
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <img 
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover absolute inset-0"
                    onError={(e) => {
                      console.log("Image failed to load:", project.imageUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => console.log("Image loaded successfully:", project.imageUrl)}
                  />
                  <div className="absolute inset-0 bg-brand-red/10 flex items-center justify-center">
                    <div className="text-center text-brand-red">
                      <div className="w-12 h-12 bg-brand-red rounded-lg flex items-center justify-center mx-auto mb-1">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold">{project.title}</p>
                    </div>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setSelectedProject(project)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {project.category}
                  </Badge>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(project.completionDate).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="font-bold text-charcoal mb-2">{project.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found in this category.</p>
          </div>
        )}

        {/* Project Detail Modal */}
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedProject && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedProject.title}</DialogTitle>
                  <DialogDescription>
                    View detailed information about this completed project including before/after photos and project specifications.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">After</h4>
                      <img 
                        src={selectedProject.imageUrl}
                        alt={`${selectedProject.title} - After`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                    {selectedProject.beforeImageUrl && (
                      <div>
                        <h4 className="font-semibold mb-2">Before</h4>
                        <img 
                          src={selectedProject.beforeImageUrl}
                          alt={`${selectedProject.title} - Before`}
                          className="w-full h-64 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-600 mb-1">Category</h4>
                      <Badge variant="outline" className="capitalize">
                        {selectedProject.category}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-600 mb-1">Completed</h4>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(selectedProject.completionDate).toLocaleDateString()}
                      </div>
                    </div>
                    {selectedProject.location && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600 mb-1">Location</h4>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          {selectedProject.location}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Project Description</h4>
                    <p className="text-gray-600 leading-relaxed">{selectedProject.description}</p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}