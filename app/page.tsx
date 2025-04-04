import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calculator, FunctionSquare, Search } from "lucide-react";
import Link from "next/link";
import HeroVisualization from "@/components/ui/hero-visualization";
import { ComingSoonLink } from "@/components/coming-soon-link";

const categories = [
  {
    title: "6th, 7th, & 8th Grade Math",
    description: "Learn ratios, percentages, and basic geometry concepts",
    icon: Calculator,
    href: "/middle-school",
  },
  {
    title: "Algebra I & II",
    description: "Master linear equations, quadratic equations, and inequalities",
    icon: Calculator,
    href: "/algebra",
  },
  {
    title: "Geometry",
    description: "Study shapes, angles, and proofs in Euclidean geometry",
    icon: FunctionSquare,
    href: "/geometry",
  },
  {
    title: "Calculus",
    description: "Learn derivatives, integrals, and limits",
    icon: FunctionSquare,
    href: "/",
    comingSoon: true,
  },
  {
    title: "Statistics & Probability",
    description: "Explore data analysis, distributions, and chance",
    icon: Calculator,
    href: "/",
    comingSoon: true,
  },
  {
    title: "Search By Category",
    description: "Search for any topic and get a detailed explanation",
    icon: Search,
    href: "/",
    comingSoon: true,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-20 px-4 mx-auto max-w-7xl">
        {/* Hero Section */}
        <div className="py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Mastering Math, Made Easy
              </h1>
              <p className="mt-6 text-md leading-6 text-muted-foreground">
                Learn math at your own pace with AI-powered guidance. Master key concepts through 
                interactive problem-solving and track your progress with achievements.
              </p>
              <div className="mt-10 flex items-center lg:justify-start justify-center gap-x-6">
                <Button asChild size="sm">
                  <Link href="#categories">Start Learning</Link>
                </Button>
              </div>
            </div>

            {/* 3D Visualization */}
            <div className="order-1 lg:order-2 flex items-center justify-center">
              <div className="w-full max-w-[500px]">
                <HeroVisualization />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div id="categories" className="py-16 container mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Choose a Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => {
              const CardContent = (
                <Card className="p-6 h-[220px] overflow-hidden border border-border/40 bg-gradient-to-b from-background to-background/80 backdrop-blur-sm hover:border-black/20 transition-all duration-300 flex flex-col relative rounded-xl">
                  <div className="absolute -right-6 -top-6 rounded-full bg-primary/10 p-10 group-hover:bg-primary/5 transition-all duration-300">
                  </div>
                  <div className="flex justify-between z-10">
                    <div className="rounded-xl bg-primary/10 p-3 mb-4 group-hover:bg-primary/15 transition-all duration-300">
                      <category.icon className="h-6 w-6 text-primary" />
                    </div>
                    {category.comingSoon && (
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded-full h-fit">Coming Soon</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-end z-10">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                  </div>
                  <div className="h-1.5 w-0 bg-primary rounded-full mt-4 group-hover:w-full transition-all duration-500 ease-in-out"></div>
                </Card>
              );

              return category.comingSoon ? (
                <ComingSoonLink 
                  href="#" 
                  key={category.title}
                  className="group cursor-default"
                >
                  {CardContent}
                </ComingSoonLink>
              ) : (
                <Link 
                  href={category.href} 
                  key={category.title}
                  className="group"
                >
                  {CardContent}
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
} 