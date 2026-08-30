import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectGallery } from "@shared/schema";
import davisAfterDesk from "@assets/davis-office/after-desk.webp";
import davisAfterEntry from "@assets/davis-office/after-entry.webp";
import davisAfterWide from "@assets/davis-office/after-wide.webp";
import { seoSlug } from "@shared/seo";

interface GalleryResponse { projects: ProjectGallery[]; totalCount: number; }

const DAVIS_OFFICE_PREVIEW = [
  { src: davisAfterDesk, alt: "Davis Office custom desk and open shelving" },
  { src: davisAfterEntry, alt: "Completed Davis Office viewed from the entry" },
  { src: davisAfterWide, alt: "Wide view of the Davis Office transformation" },
];

function ProjectCard({ project }: { project: ProjectGallery }) {
  return (
    <Card className="group overflow-hidden border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={project.imageUrl} alt={project.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        {project.beforeImageUrl && <Badge className="absolute right-3 top-3 bg-white text-slate-900">Before &amp; after</Badge>}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-950">{project.title}</h3>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
          {project.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{project.location}</span>}
          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(new Date(project.completionDate), "MMM yyyy")}</span>
        </div>
      </div>
    </Card>
  );
}

export default function GalleryPreview() {
  const { data, isLoading } = useQuery<GalleryResponse>({ queryKey: ["/api/gallery?page=1&limit=3"] });
  const projects = data?.projects?.slice(0, 3) || [];
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-5 inline-block rounded-full bg-sky-50 px-4 py-2 text-xs font-bold tracking-[0.16em] text-brand-blue">OUR WORK</div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">See the work behind the promise</h2>
          <p className="text-lg leading-8 text-slate-600">From smart-home installations to traditional repairs, every project receives careful attention to function and finish.</p>
        </div>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}</div>
        ) : projects.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-3">{projects.map((project) => <Link key={project.id} href={`/projects/${seoSlug(project.title)}`}><ProjectCard project={project} /></Link>)}</div>
            <div className="mt-10 text-center"><Button asChild size="lg" className="bg-brand-blue text-white hover:bg-brand-blue-dark"><Link href="/gallery">View All Projects<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          </>
        ) : (
          <div>
            <Link href="/gallery" className="group block overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
              <div className="grid sm:grid-cols-3">
                {DAVIS_OFFICE_PREVIEW.map((photo) => (
                  <div key={photo.alt} className="aspect-[4/3] overflow-hidden bg-slate-800">
                    <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-4 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div>
                  <Badge className="mb-3 bg-brand-primary text-white">Featured Before &amp; After</Badge>
                  <h3 className="text-2xl font-bold">Davis Office Transformation</h3>
                  <p className="mt-2 max-w-2xl text-slate-300">A compact room transformed with custom work surfaces, open shelving, a feature wall, and refreshed flooring.</p>
                </div>
                <Button asChild size="lg" className="shrink-0 bg-white text-slate-950 hover:bg-slate-100">
                  <span>View Project<ArrowRight className="ml-2 h-4 w-4" /></span>
                </Button>
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
