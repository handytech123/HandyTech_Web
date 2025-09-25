import AwardBadge from "./award-badge";
import proReferralImage from "@assets/ProReferral-191 (1)_1758249625912.png";

export default function BadgesSection() {
  return (
    <div className="bg-white py-6 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Award Badge - Left */}
          <div className="flex flex-col items-center scale-75">
            <AwardBadge />
          </div>
          
          {/* Home Depot Pro Badge - Right */}
          <div className="flex flex-col items-center">
            <p className="text-charcoal font-semibold text-sm mb-2">Certified</p>
            <a 
              href="https://proreferral.homedepot.com/public-profile/885948" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src={proReferralImage} 
                alt="Pro Referral - Powered by The Home Depot" 
                className="h-16 w-auto"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}