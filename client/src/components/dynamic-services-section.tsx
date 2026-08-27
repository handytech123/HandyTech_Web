import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Wrench, Monitor, Hammer, Settings, DollarSign, Clock } from "lucide-react";
import type { Service } from "@shared/schema";

const categoryIcons = {
  electrical: Zap,
  plumbing: Wrench,
  tech: Monitor,
  carpentry: Hammer,
  general: Settings,
  painting: Settings,
  hvac: Settings,
};

const categoryColors = {
  electrical: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  plumbing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  tech: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  carpentry: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  painting: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  hvac: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function DynamicServicesSection() {
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services", { active: "true" }],
    queryFn: () => fetch("/api/services?active=true").then(res => res.json()),
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Professional Services
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Loading our comprehensive range of handyman and smart home services...
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const formatPrice = (price: number, unit: string) => {
    return `$${price}${unit === "per hour" ? "/hr" : unit === "flat rate" ? "" : `/${unit}`}`;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      electrical: "Electrical Services",
      plumbing: "Plumbing Services", 
      tech: "Smart Home & Tech",
      carpentry: "Carpentry & Woodwork",
      general: "General Maintenance",
      painting: "Painting Services",
      hvac: "HVAC Services",
    };
    return labels[category as keyof typeof labels] || category;
  };

  return (
    <section id="services" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Our Professional Services
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            From smart home technology to traditional handyman work, we deliver quality craftsmanship 
            and innovative solutions for your home improvement needs.
          </p>
        </div>

        {Object.entries(servicesByCategory).map(([category, categoryServices]) => {
          const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Settings;
          
          return (
            <div key={category} className="mb-16">
              <div className="flex items-center gap-3 mb-8">
                <div className={`p-3 rounded-full ${categoryColors[category as keyof typeof categoryColors]}`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getCategoryLabel(category)}
                </h3>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryServices
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((service) => (
                    <Card key={service.id} className="group hover:shadow-lg transition-shadow duration-300">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">
                            {service.name}
                          </CardTitle>
                          <Badge 
                            variant="outline" 
                            className={`${categoryColors[category as keyof typeof categoryColors]} border-none`}
                          >
                            {service.skillLevel || "Standard"}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <CardDescription className="text-gray-600 dark:text-gray-300 line-clamp-3">
                          {service.description}
                        </CardDescription>

                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          {service.estimatedDuration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{service.estimatedDuration}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 font-semibold text-brand-primary">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatPrice(service.basePrice, service.priceUnit || "per hour")}</span>
                          </div>
                        </div>

                        <Button 
                          className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white"
                          onClick={() => {
                            // Scroll to contact form
                            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          Get Quote
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          );
        })}

        {services.length === 0 && (
          <div className="text-center py-16">
            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
              Services Coming Soon
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              We're updating our service offerings. Please contact us for immediate assistance.
            </p>
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Don't see what you need? We handle custom projects and specialty work too.
          </p>
          <Button 
            size="lg"
            className="bg-brand-primary hover:bg-brand-primary-dark text-white"
            onClick={() => {
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Request Custom Quote
          </Button>
        </div>
      </div>
    </section>
  );
}