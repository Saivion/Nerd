"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateMathProblem, generateHint, validateStep, generateFullSolution } from "@/lib/openrouter";
import { addStars, updateStreak } from "@/lib/local-storage";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { AlertCircle, CheckCircle2, HelpCircle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { MathInput } from "@/components/math-input";
import { Chat } from "@/components/ui/chat";

const subcategories = [
  { id: "descriptive", name: "Descriptive Statistics" },
  { id: "probability", name: "Probability" },
  { id: "distributions", name: "Probability Distributions" },
  { id: "hypothesis", name: "Hypothesis Testing" },
  { id: "correlation", name: "Correlation & Regression" },
];

const difficulties = [
  { id: "easy", name: "Easy" },
  { id: "medium", name: "Medium" },
  { id: "hard", name: "Hard" },
];

interface Step {
  instruction: string;
  input: string;
  isCorrect: boolean | null;
}

interface ChatMessage {
  content: string;
  role: "assistant" | "user";
  timestamp: Date;
}

export default function StatisticsPage() {
  const [subcategory, setSubcategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [showingSolution, setShowingSolution] = useState(false);
  const [solution, setSolution] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleGenerateProblem = async () => {
    if (!subcategory || !difficulty) return;
    
    setLoading(true);
    try {
      const newProblem = await generateMathProblem(
        "statistics",
        subcategory,
        difficulty as "easy" | "medium" | "hard"
      );
      setProblem(newProblem);
      
      // Initialize steps based on problem type
      const initialSteps = subcategory === "hypothesis" ? [
        { instruction: "State the null and alternative hypotheses", input: "", isCorrect: null },
        { instruction: "Calculate the test statistic", input: "", isCorrect: null },
        { instruction: "Make a decision and state the conclusion", input: "", isCorrect: null }
      ] : subcategory === "probability" ? [
        { instruction: "Identify the probability model", input: "", isCorrect: null },
        { instruction: "Apply the appropriate formula", input: "", isCorrect: null },
        { instruction: "Calculate the final probability", input: "", isCorrect: null }
      ] : [
        { instruction: "Write your solution", input: "", isCorrect: null }
      ];
      
      setSteps(initialSteps);
      setCurrentStepIndex(0);
      setHintCount(0);
      setShowingSolution(false);
      setSolution([]);
      setChatMessages([]);
    } catch (error) {
      console.error("Failed to generate problem:", error);
      toast.error("Failed to generate problem. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStepSubmit = async (index: number) => {
    if (!steps[index].input) return;

    setLoading(true);
    try {
      const isCorrect = await validateStep(problem, steps[index].instruction, steps[index].input);
      const updatedSteps = [...steps];
      updatedSteps[index].isCorrect = isCorrect;
      setSteps(updatedSteps);

      if (isCorrect) {
        if (index === steps.length - 1) {
          // Problem completed
          const starsEarned = calculateStars();
          addStars(starsEarned);
          updateStreak();
          toast.success(`Congratulations! You earned ${starsEarned} stars!`);
        } else {
          setCurrentStepIndex(index + 1);
        }
      } else {
        toast.error("That's not quite right. Try again or use a hint!");
      }
    } catch (error) {
      console.error("Failed to validate step:", error);
      toast.error("Failed to validate answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStars = () => {
    const baseStars = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
    const hintPenalty = Math.min(hintCount, baseStars - 1);
    return Math.max(1, baseStars - hintPenalty);
  };

  const handleHint = async () => {
    setLoading(true);
    try {
      const hint = await generateHint(problem, steps[currentStepIndex].instruction, hintCount + 1);
      setHintCount(prev => prev + 1);
      
      // Add hint to chat
      setChatMessages(prev => [
        ...prev,
        {
          content: `Hint for Step ${currentStepIndex + 1}: ${hint}`,
          role: "assistant",
          timestamp: new Date()
        }
      ]);
      
      // Also show toast
      toast.info(hint);
    } catch (error) {
      console.error("Failed to generate hint:", error);
      toast.error("Failed to generate hint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShowSolution = async () => {
    if (showingSolution) return;
    
    setLoading(true);
    try {
      const fullSolution = await generateFullSolution(problem);
      setSolution(fullSolution);
      setShowingSolution(true);
      
      // Add solution to chat
      setChatMessages(prev => [
        ...prev,
        {
          content: "Full solution requested",
          role: "user",
          timestamp: new Date()
        },
        {
          content: `Solution: ${fullSolution.join(' → ')}`,
          role: "assistant",
          timestamp: new Date()
        }
      ]);
      
      toast.info("Solution revealed. Note: No stars will be awarded.");
    } catch (error) {
      console.error("Failed to generate solution:", error);
      toast.error("Failed to generate solution. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progress = steps.length ? (currentStepIndex / steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-20 px-4 mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold mb-8">Statistics & Probability Practice</h1>
        
        <Card className="p-6 mb-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Topic
              </label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Difficulty Level
              </label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((diff) => (
                    <SelectItem key={diff.id} value={diff.id}>
                      {diff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
            className="mt-6"
            onClick={handleGenerateProblem}
            disabled={!subcategory || !difficulty || loading}
          >
            {loading ? "Generating..." : "Generate Problem"}
          </Button>
        </Card>

        {problem && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Your Problem</h2>
              <div className="text-lg mb-6">
                <InlineMath>{problem}</InlineMath>
              </div>

              <Progress value={progress} className="mb-6" />

              {!showingSolution && steps.map((step, index) => (
                <div
                  key={index}
                  className={`mb-6 ${index === currentStepIndex ? "" : "opacity-50"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Step {index + 1}:</span>
                    <span>{step.instruction}</span>
                    {step.isCorrect === true && <CheckCircle2 className="text-green-500 h-5 w-5" />}
                    {step.isCorrect === false && <AlertCircle className="text-red-500 h-5 w-5" />}
                  </div>
                  <div className="flex gap-2">
                    <MathInput
                      value={step.input}
                      onChange={(value) => {
                        const updatedSteps = [...steps];
                        updatedSteps[index].input = value;
                        setSteps(updatedSteps);
                      }}
                      disabled={index !== currentStepIndex || loading}
                      placeholder="Enter your answer..."
                    />
                    <Button
                      onClick={() => handleStepSubmit(index)}
                      disabled={index !== currentStepIndex || !step.input || loading}
                    >
                      Check
                    </Button>
                  </div>
                </div>
              ))}

              {showingSolution && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-semibold">Solution:</h3>
                  {solution.map((step, index) => (
                    <div key={index} className="ml-4">
                      <InlineMath>{step}</InlineMath>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={handleHint}
                  disabled={loading || showingSolution}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Get Hint
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShowSolution}
                  disabled={loading || showingSolution}
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Show Solution
                </Button>
              </div>
            </Card>
            
            {/* Hints and Solutions Sidebar */}
            <div className="lg:col-span-1">
              <Chat 
                messages={chatMessages}
                onSendMessage={(message) => {
                  setChatMessages([...chatMessages, {
                    content: message,
                    role: "user",
                    timestamp: new Date()
                  }]);
                }}
                className="sticky top-20"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 