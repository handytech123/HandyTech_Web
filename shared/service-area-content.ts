export type ServiceAreaContent = {
  slug: string;
  city: string;
  title: string;
  metaDescription: string;
  introduction: string;
  needs: string[];
  serviceSlugs: string[];
};

export const SERVICE_AREA_CONTENT: ServiceAreaContent[] = [
  {
    slug: "florissant",
    city: "Florissant",
    title: "Handyman Services in Florissant, MO",
    metaDescription: "Professional handyman services in Florissant, MO, including drywall, painting, bathroom fixtures, accessibility improvements, and smart-home installation.",
    introduction: "For Florissant homes that need repair, updating, or safer everyday function, HandyTech Solutions offers flexible project support without making customers coordinate several separate contractors.",
    needs: ["Drywall patches and finish repair", "Bathroom fixtures and accessibility upgrades", "Interior painting and finish carpentry", "Lighting, cameras, and connected-home devices"],
    serviceSlugs: ["drywall-patch-small", "grab-bar-installation", "small-bathroom-remodel", "security-camera-install-1-2-units"],
  },
  {
    slug: "bridgeton",
    city: "Bridgeton",
    title: "Handyman Services in Bridgeton, MO",
    metaDescription: "Handyman and technology services in Bridgeton, MO for home and small-business repairs, mounting, fixtures, cabling, cameras, and maintenance.",
    introduction: "Homes and small businesses in Bridgeton can use HandyTech Solutions for hands-on repair work and technology projects through one local service provider.",
    needs: ["Repair and maintenance punch lists", "Shelving, TV, and equipment mounting", "Network cabling and camera installation", "Painting, carpentry, and fixture replacement"],
    serviceSlugs: ["other", "tv-wall-mount", "structured-cabling-low-voltage-runs", "security-camera-install-1-2-units"],
  },
  {
    slug: "maryland-heights",
    city: "Maryland Heights",
    title: "Handyman Services in Maryland Heights, MO",
    metaDescription: "HandyTech Solutions provides handyman repairs, painting, drywall, mounting, low-voltage cabling, smart-home setup, and security-camera installation in Maryland Heights, MO.",
    introduction: "HandyTech Solutions helps Maryland Heights homeowners and small businesses complete repair, improvement, and technology projects with one clear point of contact.",
    needs: ["Drywall, trim, door, and interior repairs", "Interior painting and wallpaper projects", "TV mounting and low-voltage cabling", "Smart-home and security-camera installation"],
    serviceSlugs: ["drywall-patch-small", "single-room-painting", "structured-cabling-low-voltage-runs", "security-camera-install-1-2-units"],
  },
  {
    slug: "creve-coeur",
    city: "Creve Coeur",
    title: "Handyman Services in Creve Coeur, MO",
    metaDescription: "Professional handyman, drywall, painting, fixture, smart-home, low-voltage, and security-camera services in Creve Coeur, Missouri from HandyTech Solutions.",
    introduction: "HandyTech Solutions serves Creve Coeur with careful home repairs, finish work, installations, and connected-home improvements planned around the actual project scope.",
    needs: ["Drywall repair and detailed finish work", "Painting and interior refresh projects", "Fixture, lock, and bathroom upgrades", "Wi-Fi, cameras, and smart-home systems"],
    serviceSlugs: ["drywall-patch-small", "single-room-painting", "smart-lock-install", "smart-home-hub-setup"],
  },
  {
    slug: "st-charles",
    city: "St. Charles",
    title: "Handyman Services in St. Charles, MO",
    metaDescription: "HandyTech Solutions offers handyman repairs, painting, drywall, wallpaper, mounting, low-voltage, smart-home, and security-camera services in St. Charles, MO.",
    introduction: "HandyTech Solutions helps St. Charles customers handle practical repairs, room improvements, and home-technology installations without coordinating several separate service providers.",
    needs: ["Painting, wallpaper, and drywall projects", "Doors, locks, trim, and general repairs", "TV and equipment mounting", "Low-voltage wiring, cameras, and smart-home setup"],
    serviceSlugs: ["single-room-painting", "drywall-patch-small", "tv-wall-mount", "structured-cabling-low-voltage-runs"],
  },
];

export const SERVICE_AREA_BY_SLUG = Object.fromEntries(SERVICE_AREA_CONTENT.map((area) => [area.slug, area]));
