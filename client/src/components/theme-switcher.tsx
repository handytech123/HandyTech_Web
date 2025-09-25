import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<"default" | "vibrant">("default");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "default" | "vibrant" || "default";
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (theme: "default" | "vibrant") => {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove("theme-black-vibrant");
    
    // Apply new theme
    if (theme === "vibrant") {
      body.classList.add("theme-black-vibrant");
    }
    
    localStorage.setItem("theme", theme);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === "default" ? "vibrant" : "default";
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="sm"
      className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border-orange-500/20 hover:border-orange-500/40"
    >
      <Palette className="w-4 h-4 mr-2" />
      {currentTheme === "default" ? "Vibrant" : "Standard"}
    </Button>
  );
}