import { Award } from "lucide-react";

export default function AwardBadge() {
  return (
    <div className="flex flex-col items-center py-8">
      {/* Gold Badge */}
      <div className="relative">
        {/* Outer gold circle */}
        <div className="w-32 h-32 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 rounded-full shadow-xl border-4 border-yellow-500 flex items-center justify-center relative">
          {/* Inner content area */}
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-full flex flex-col items-center justify-center text-center border-2 border-yellow-600">
            <Award className="w-6 h-6 text-yellow-800 mb-1" />
            <div className="text-yellow-900 font-bold text-xs leading-tight">
              <div>BEST</div>
              <div>HANDYMAN</div>
              <div>2025</div>
            </div>
          </div>
          {/* Gold shine effect */}
          <div className="absolute inset-2 bg-gradient-to-tr from-transparent via-yellow-200 to-transparent opacity-30 rounded-full"></div>
        </div>
        
        {/* Decorative ribbons */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-12 bg-gradient-to-b from-yellow-400 to-yellow-600 transform -skew-x-12 shadow-md"></div>
          <div className="w-8 h-12 bg-gradient-to-b from-yellow-400 to-yellow-600 transform skew-x-12 shadow-md absolute top-0 left-2"></div>
        </div>
      </div>
      
      {/* Title below badge */}
      <div className="mt-8 text-center">
        <p className="text-charcoal font-semibold text-lg">
          North County Chamber of Commerce
        </p>
      </div>
    </div>
  );
}