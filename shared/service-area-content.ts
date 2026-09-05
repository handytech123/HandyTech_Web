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
    slug: "st-louis",
    city: "St. Louis",
    title: "Handyman Services in St. Louis, MO",
    metaDescription: "HandyTech Solutions provides professional repairs, installations, painting, carpentry, fixture work, and smart-home help in St. Louis, Missouri.",
    introduction: "From a focused repair to a multi-step home improvement, HandyTech Solutions helps St. Louis homeowners and small businesses complete practical projects with clear communication and careful workmanship.",
    needs: ["Drywall, trim, door, and interior repairs", "Painting and room refresh projects", "Lighting, plumbing-fixture, and appliance installation", "TV mounting, cameras, Wi-Fi, and smart-home upgrades"],
    serviceSlugs: ["drywall-patch-small", "single-room-painting", "light-fixture-replacement", "smart-home-hub-setup"],
  },
  {
    slug: "hazelwood",
    city: "Hazelwood",
    title: "Handyman Services in Hazelwood, MO",
    metaDescription: "Local handyman help in Hazelwood, MO for repairs, painting, fixtures, carpentry, mounting, and connected-home improvements from HandyTech Solutions.",
    introduction: "HandyTech Solutions serves Hazelwood with dependable help for routine repairs, installations, maintenance, and technology upgrades. We make it simple to explain the project, request a quote, and plan the work.",
    needs: ["Home maintenance and punch-list repairs", "Wall repair and interior painting", "Fixture replacement and installation", "Mounting, cabling, security, and smart-home setup"],
    serviceSlugs: ["other", "drywall-patch-small", "single-room-painting", "tv-wall-mount"],
  },
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
    slug: "ferguson",
    city: "Ferguson",
    title: "Handyman Services in Ferguson, MO",
    metaDescription: "HandyTech Solutions offers repair, upkeep, lighting, painting, fixture, safety, and smart-home services for customers in Ferguson, Missouri.",
    introduction: "HandyTech Solutions helps Ferguson customers tackle repairs and upgrades that improve how a home looks, works, and feels. Every request starts with the actual scope so the next step is clear.",
    needs: ["Walls, doors, trim, and general repairs", "Lighting and fixture improvements", "Painting and interior updates", "Home safety and smart-security projects"],
    serviceSlugs: ["other", "light-fixture-replacement", "single-room-painting", "smart-home-hub-setup"],
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
];

export const SERVICE_AREA_BY_SLUG = Object.fromEntries(SERVICE_AREA_CONTENT.map((area) => [area.slug, area]));
