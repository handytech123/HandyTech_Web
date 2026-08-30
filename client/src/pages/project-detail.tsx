import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import type { ProjectGallery } from "@shared/schema";
import { seoSlug, SITE_URL } from "@shared/seo";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: project, isLoading } = useQuery<ProjectGallery | null>({ queryKey: ["/api/projects", slug], queryFn: async () => { const response = await fetch(`/api/projects/${slug}`); if (response.status === 404) return null; if (!response.ok) throw new Error("Unable to load project"); return response.json(); } });
  if (!isLoading && !project) return <><Navigation /><main className="mx-auto min-h-[70vh] max-w-3xl px-4 pt-36 text-center"><h1 className="text-3xl font-bold">Project not found</h1><Button asChild className="mt-6"><Link href="/gallery">View project gallery</Link></Button></main><Footer /></>;
  if (!project) return <main className="min-h-screen pt-40 text-center">Loading project…</main>;
  const photos = Array.from(new Set([project.beforeImageUrl, ...(project.beforeImageUrls || []), project.imageUrl, ...(project.imageUrls || [])].filter((value): value is string => Boolean(value))));
  const canonical = `${SITE_URL}/projects/${seoSlug(project.title)}`;
  return <div className="min-h-screen bg-white"><Helmet><title>{project.title}{project.location ? ` in ${project.location}` : ""} | HandyTech Solutions</title><meta name="description" content={project.description.slice(0, 160)} /><link rel="canonical" href={canonical} /><meta property="og:image" content={project.imageUrl.startsWith("http") ? project.imageUrl : `${SITE_URL}${project.imageUrl}`} /></Helmet><Navigation /><main className="mx-auto max-w-6xl px-4 pb-20 pt-32 sm:px-6"><Link href="/gallery" className="mb-8 inline-flex items-center text-sm font-semibold text-brand-primary"><ArrowLeft className="mr-2 h-4 w-4" />Back to gallery</Link><header className="mb-10"><p className="text-sm font-bold uppercase tracking-widest text-brand-primary">Completed {project.category} project</p><h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">{project.title}</h1><div className="mt-4 flex flex-wrap gap-5 text-slate-600">{project.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{project.location}</span>}<span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(project.completionDate).toLocaleDateString()}</span></div><p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{project.description}</p></header><div className="grid gap-5 sm:grid-cols-2">{photos.map((photo, index) => <img key={photo} src={photo} alt={`${project.title} project photo ${index + 1}`} className="w-full rounded-2xl border object-cover shadow-sm" loading={index === 0 ? "eager" : "lazy"} />)}</div>{project.videoUrls && project.videoUrls.length > 0 && <section className="mt-10 grid gap-5 sm:grid-cols-2">{project.videoUrls.map((video, index) => <video key={video} src={video} controls preload="metadata" className="w-full rounded-2xl bg-black" aria-label={`${project.title} video ${index + 1}`} />)}</section>}<div className="mt-12 rounded-2xl bg-slate-50 p-8 text-center"><h2 className="text-2xl font-bold">Have a similar project?</h2><p className="mt-2 text-slate-600">Tell HandyTech what you need and request a personalized quote.</p><Button asChild className="mt-5"><a href="/#contact">Request a Quote</a></Button></div></main><Footer /></div>;
}
