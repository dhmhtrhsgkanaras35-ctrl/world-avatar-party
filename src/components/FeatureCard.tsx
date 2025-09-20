import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  gradient: "party" | "event" | "social";
  className?: string;
}

export const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  gradient, 
  className 
}: FeatureCardProps) => {
  const gradientClasses = {
    party: "gradient-party",
    event: "gradient-event", 
    social: "gradient-social"
  };

  return (
    <div className={cn("social-card group", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 h-full">
        {/* Background gradient overlay */}
        <div className={cn(
          "absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300",
          gradientClasses[gradient]
        )} />
        
        <div className="relative z-10">
          {/* Icon */}
          <div className="mb-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
              gradientClasses[gradient],
              "shadow-party"
            )}>
              {icon}
            </div>
          </div>
          
          {/* Content */}
          <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {description}
          </p>
          
          {/* Action button */}
          <Button
            variant="outline"
            size="sm"
            className="party-button group-hover:border-primary group-hover:text-primary"
          >
            Learn More
          </Button>
        </div>
        
        {/* Hover glow effect */}
        <div className={cn(
          "absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10",
          gradientClasses[gradient]
        )} />
      </div>
    </div>
  );
};