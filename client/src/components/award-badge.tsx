import { Award, Sparkles, Star } from "lucide-react";

export default function AwardBadge() {
  return (
    <div className="flex flex-col items-center py-8">
      {/* Gold Badge */}
      <div className="relative">
        {/* Animated Sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top sparkles */}
          <div className="absolute top-2 left-8 animate-sparkle-1">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          <div className="absolute top-4 right-6 animate-sparkle-2">
            <Sparkles className="w-3 h-3 text-yellow-400" />
          </div>
          
          {/* Side sparkles */}
          <div className="absolute top-12 left-2 animate-sparkle-3">
            <Sparkles className="w-3 h-3 text-yellow-200" />
          </div>
          <div className="absolute top-16 right-2 animate-sparkle-1">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          
          {/* Bottom sparkles */}
          <div className="absolute bottom-8 left-6 animate-sparkle-2">
            <Sparkles className="w-3 h-3 text-yellow-400" />
          </div>
          <div className="absolute bottom-6 right-8 animate-sparkle-3">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          
          {/* Extra accent sparkles */}
          <div className="absolute top-8 left-12 animate-sparkle-1">
            <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute top-20 right-12 animate-sparkle-2">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Silver Twinkling Stars */}
          <div className="absolute top-1 left-4 animate-twinkle-1">
            <Star className="w-5 h-5 text-gray-300 fill-gray-300" />
          </div>
          <div className="absolute top-6 right-2 animate-twinkle-2">
            <Star className="w-4 h-4 text-gray-400 fill-gray-400" />
          </div>
          <div className="absolute top-14 left-1 animate-twinkle-3">
            <Star className="w-6 h-6 text-gray-200 fill-gray-200" />
          </div>
          <div className="absolute top-24 right-1 animate-twinkle-1">
            <Star className="w-5 h-5 text-gray-300 fill-gray-300" />
          </div>
          <div className="absolute bottom-4 left-4 animate-twinkle-2">
            <Star className="w-4 h-4 text-gray-350 fill-gray-350" />
          </div>
          <div className="absolute bottom-2 right-4 animate-twinkle-3">
            <Star className="w-5 h-5 text-gray-300 fill-gray-300" />
          </div>
          
          {/* Distant silver stars */}
          <div className="absolute top-10 left-14 animate-twinkle-1">
            <Star className="w-3 h-3 text-gray-400 fill-gray-400" />
          </div>
          <div className="absolute top-18 right-14 animate-twinkle-2">
            <Star className="w-4 h-4 text-gray-300 fill-gray-300" />
          </div>
          <div className="absolute bottom-10 left-14 animate-twinkle-3">
            <Star className="w-3 h-3 text-gray-200 fill-gray-200" />
          </div>
          <div className="absolute bottom-14 right-16 animate-twinkle-1">
            <Star className="w-4 h-4 text-gray-350 fill-gray-350" />
          </div>
        </div>
        
        {/* Outer gold circle */}
        <div className="w-32 h-32 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 rounded-full shadow-xl border-4 border-yellow-500 flex items-center justify-center relative animate-badge-glow">
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
        
        {/* Decorative ribbons with 2025 text */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-12 bg-gradient-to-b from-yellow-400 to-yellow-600 transform -skew-x-12 shadow-md"></div>
          <div className="w-8 h-12 bg-gradient-to-b from-yellow-400 to-yellow-600 transform skew-x-12 shadow-md absolute top-0 left-2"></div>
          {/* 2025 text on ribbons */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 translate-x-0.25 text-black text-xs font-bold z-10">
            2025
          </div>
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