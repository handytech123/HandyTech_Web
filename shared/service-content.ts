export type ServiceSeoContent = { metaDescription: string; introduction: string; included: string[]; goodFor: string[]; process: string[] };

export const SERVICE_SEO_CONTENT: Record<string, ServiceSeoContent> = {
  "small-bathroom-remodel": {
    metaDescription: "Small bathroom remodeling in St. Louis, including vanity, toilet, lighting, drywall, painting, fixture replacement, and finish work.",
    introduction: "Update a small bathroom without coordinating several contractors. HandyTech can handle a practical group of improvements—from removing dated fixtures through final paint and cleanup—with one clear scope of work.",
    included: ["Vanity, sink, faucet, and toilet replacement", "Light fixture and hardware updates", "Minor drywall repair and surface preparation", "Painting, caulking, trim, and finishing details", "Removal of replaced fixtures and job-site cleanup"],
    goodFor: ["Guest and hallway bathrooms", "Rental-property refreshes", "Accessibility and safety improvements", "Preparing a home for sale", "Replacing worn or outdated fixtures"],
    process: ["Review the room, measurements, fixtures, and desired finish", "Confirm the work scope and materials before scheduling", "Protect nearby surfaces and remove selected fixtures", "Complete installation, repairs, painting, and finish work", "Test fixtures and walk through the completed bathroom"],
  },
  "multi-room-painting": {
    metaDescription: "Interior multi-room painting in St. Louis with wall preparation, trim work, careful protection, clean lines, and organized completion.",
    introduction: "Refresh several rooms with consistent preparation, color, and finish. HandyTech organizes the work room by room, protects floors and furnishings, repairs minor surface defects, and keeps the project manageable while your home remains occupied.",
    included: ["Protection for floors, furniture, and nearby surfaces", "Minor nail-hole and surface repair", "Wall and selected trim preparation", "Professional application with clean cut lines", "Room-by-room cleanup and final touchups"],
    goodFor: ["Whole-floor color updates", "Move-in or move-out painting", "Rental turnover preparation", "Refreshing high-traffic living spaces", "Coordinated walls and trim"],
    process: ["Confirm rooms, colors, sheen, and trim requirements", "Review repairs and areas needing extra preparation", "Set a room sequence that minimizes disruption", "Prepare, paint, inspect, and touch up each area", "Complete a final walkthrough before cleanup"],
  },
  "drywall-patch-small": {
    metaDescription: "Small drywall repair in St. Louis for holes, dents, anchors, and damaged wall areas, including patching, sanding, and finishing.",
    introduction: "Small wall damage is highly visible once light hits it. HandyTech repairs holes, dents, and damaged drywall with attention to blending the patch into the surrounding surface so it is ready for primer and paint.",
    included: ["Assessment of the damaged area and surrounding wall", "Removal of loose or compromised material", "Backing, patching, compound, and reinforcement as needed", "Sanding and feathering into the existing surface", "Primer-ready finish and work-area cleanup"],
    goodFor: ["TV-mount and anchor holes", "Door-handle damage", "Small plumbing access openings", "Dents, cracks, and failed patches", "Walls being prepared for repainting"],
    process: ["Inspect the damage and select the appropriate patch method", "Protect the immediate work area", "Patch, reinforce, and apply finishing compound", "Sand and inspect the transition under light", "Prepare the surface for primer and paint"],
  },
  "ceiling-fan-install": {
    metaDescription: "Ceiling fan installation in St. Louis with secure mounting, assembly, wiring, balancing, and complete function testing.",
    introduction: "A ceiling fan must be supported correctly and wired safely. HandyTech replaces compatible existing fixtures, assembles and mounts the fan, verifies operation, and checks for wobble or unusual noise before the job is complete.",
    included: ["Removal of the existing compatible light fixture", "Inspection of the visible mounting box and wiring", "Fan assembly and secure mounting", "Connection of controls, light kit, or remote when included", "Operation, direction, balance, and light testing"],
    goodFor: ["Bedrooms and living rooms", "Replacing dated ceiling fixtures", "Adding air movement to occupied spaces", "Remote-controlled fan upgrades", "Fans with integrated lighting"],
    process: ["Confirm the fan model and existing fixture location", "Inspect accessible support and wiring conditions", "Remove the old fixture and assemble the fan", "Mount, connect, and configure included controls", "Test all speeds, lighting, balance, and direction"],
  },
  "whole-home-smart-camera-system": {
    metaDescription: "Whole-home security camera installation in St. Louis with placement, mounting, cabling, recorder setup, and app configuration.",
    introduction: "A camera system works best when coverage, cable paths, recording, and remote access are planned together. HandyTech installs multi-camera systems with practical viewing angles and helps configure the recorder, network connection, and customer app.",
    included: ["Camera placement and coverage planning", "Mounting for seven or more compatible cameras", "Accessible low-voltage cable routing", "DVR or NVR connection and basic configuration", "Mobile app connection, viewing test, and customer orientation"],
    goodFor: ["Homes needing exterior perimeter coverage", "Detached garages and multiple entrances", "Replacing scattered stand-alone cameras", "Local recording with remote viewing", "Organized residential security upgrades"],
    process: ["Review coverage priorities, equipment, and recording goals", "Plan camera positions and practical cable routes", "Install cameras and complete accessible cabling", "Configure the recorder, network, and mobile access", "Test every view and show you how to use the system"],
  },
};
