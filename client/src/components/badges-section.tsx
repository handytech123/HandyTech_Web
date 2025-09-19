import AwardBadge from "./award-badge";
import proReferralImage from "@assets/ProReferral-191 (1)_1758249625912.png";

export default function BadgesSection() {
  return (
    <div className="bg-white py-6 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          {/* Award Badge - Centered */}
          <div className="flex flex-col items-center scale-75">
            <AwardBadge />
          </div>
        </div>
      </div>
    </div>
  );
}