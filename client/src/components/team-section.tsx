import { Card, CardContent } from "@/components/ui/card";

const teamMembers = [
  {
    name: "John Smith",
    role: "CEO & Founder", 
    description: "15+ years leading technology transformations for enterprises worldwide.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
  },
  {
    name: "Sarah Johnson",
    role: "Chief Technology Officer",
    description: "Expert in cloud architecture and cybersecurity with multiple certifications.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b829?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
  },
  {
    name: "Mike Chen", 
    role: "Lead Systems Engineer",
    description: "Specializes in network infrastructure and system optimization.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
  },
  {
    name: "Emily Davis",
    role: "Customer Success Manager",
    description: "Dedicated to ensuring exceptional customer experience and satisfaction.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
  }
];

export default function TeamSection() {
  return (
    <section id="team" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-4">Meet Our Expert Team</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our certified professionals bring years of experience and expertise to every project.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member, index) => (
            <Card key={index} className="bg-white hover:shadow-xl transition-shadow overflow-hidden">
              <div className="aspect-square overflow-hidden">
                <img 
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-charcoal mb-1">{member.name}</h3>
                <p className="text-brand-red font-semibold mb-2">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
