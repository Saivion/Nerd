"use client";

import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InlineMath } from "react-katex";

interface ConceptExplanationProps {
  category: string;
  subcategory: string;
}

const conceptData = {
  algebra: {
    linear: {
      title: "Linear Equations",
      description: "Linear equations are equations where each term is either a constant or the product of a constant and a single variable (like x) raised to the first power.",
      examples: ["y = mx + b", "2x + 3 = 7", "x - 5 = 2x + 1"],
      key_points: [
        "The highest power of the variable is 1",
        "Graph is always a straight line",
        "Has exactly one solution (unless parallel)",
      ],
    },
    quadratic: {
      title: "Quadratic Equations",
      description: "Quadratic equations are polynomial equations of degree 2, typically written in the form ax² + bx + c = 0.",
      examples: ["x² + 5x + 6 = 0", "2x² - 3x = 4", "x² = 16"],
      key_points: [
        "Has at most two real solutions",
        "Graph is a parabola",
        "Can be solved using quadratic formula: x = (-b ± √(b² - 4ac)) / (2a)",
      ],
    },
  },
  calculus: {
    derivatives: {
      title: "Derivatives",
      description: "The derivative measures the rate of change of a function with respect to its variable.",
      examples: ["If f(x) = x², then f'(x) = 2x", "d/dx(sin x) = cos x"],
      key_points: [
        "Represents instantaneous rate of change",
        "Slope of the tangent line at any point",
        "Used to find maximum and minimum values",
      ],
    },
    integrals: {
      title: "Integrals",
      description: "Integration is the reverse process of differentiation, used to find the area under a curve.",
      examples: ["∫x dx = x²/2 + C", "∫sin x dx = -cos x + C"],
      key_points: [
        "Indefinite integrals include a constant C",
        "Definite integrals give exact area",
        "Fundamental theorem of calculus connects derivatives and integrals",
      ],
    },
  },
};

export function ConceptExplanation({ category, subcategory }: ConceptExplanationProps) {
  const concept = conceptData[category as keyof typeof conceptData]?.[subcategory as keyof typeof conceptData[keyof typeof conceptData]];
  
  if (!concept) return null;

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">{concept.title}</h2>
      <p className="text-muted-foreground mb-6">{concept.description}</p>
      
      <Accordion type="single" collapsible>
        <AccordionItem value="examples">
          <AccordionTrigger>Examples</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {concept.examples.map((example, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span>•</span>
                  <InlineMath>{example}</InlineMath>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="key-points">
          <AccordionTrigger>Key Points</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {concept.key_points.map((point, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span>•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}