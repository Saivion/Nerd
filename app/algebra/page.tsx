"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateMathProblem, generateHint, validateStep, generateFullSolution } from "@/lib/openrouter";
import { addStars, updateStreak } from "@/lib/local-storage";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { AlertCircle, CheckCircle2, HelpCircle, Lightbulb, Info, Award, Sparkles, ArrowRight, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MathInput } from "@/components/math-input";
import { GraphDisplay } from "@/components/graph-display";
import { ConceptExplanation } from "@/components/concept-explanation";
import { Chat } from "@/components/ui/chat";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MathFormatter, FormattedProblem } from "@/components/math-formatter";

const subcategories = [
  { id: "linear", name: "Linear Equations" },
  { id: "quadratic", name: "Quadratic Equations" },
  { id: "systems", name: "Systems of Equations" },
  { id: "factoring", name: "Factoring" },
];

const difficulties = [
  { id: "easy", name: "Easy", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { id: "medium", name: "Medium", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { id: "hard", name: "Hard", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
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

// Utility function to parse mathematical functions from problem text for graphing
function parseGraphFunctions(problemText: string): string[] {
  const functions: string[] = [];
  
  // Look for equation patterns
  const equationPatterns = [
    /y\s*=\s*[^,;]+/g,                          // Simple y = expressions
    /f\s*\(\s*x\s*\)\s*=\s*[^,;]+/g,            // f(x) = expressions
    /g\s*\(\s*x\s*\)\s*=\s*[^,;]+/g,            // g(x) = expressions
    /h\s*\(\s*x\s*\)\s*=\s*[^,;]+/g,            // h(x) = expressions
    /\d+\s*x\s*[+\-]\s*\d+/g,                   // Linear form like 2x + 3
    /\d+\s*x\^2\s*[+\-]\s*\d+\s*x\s*[+\-]\s*\d+/g,  // Quadratic form like 2x^2 + 3x - 4
  ];
  
  // Extract all matches
  for (const pattern of equationPatterns) {
    const matches = problemText.match(pattern);
    if (matches) {
      // Clean up the matches to make them graphable
      matches.forEach(match => {
        let cleanFunction = match
          .replace(/f\s*\(\s*x\s*\)\s*=/, 'y =')  // Replace f(x) with y
          .replace(/g\s*\(\s*x\s*\)\s*=/, 'y =')  // Replace g(x) with y
          .replace(/h\s*\(\s*x\s*\)\s*=/, 'y =')  // Replace h(x) with y
          .trim();
        
        // Make sure it starts with y =
        if (!cleanFunction.startsWith('y =')) {
          if (!cleanFunction.includes('=')) {
            cleanFunction = 'y = ' + cleanFunction;
          }
        }
        
        // Only add if not already in the list
        if (!functions.includes(cleanFunction)) {
          functions.push(cleanFunction);
        }
      });
    }
  }
  
  // If no functions were found and there are equations in the problem, try a different approach
  if (functions.length === 0 && problemText.includes('=')) {
    // Look for any equations with x and y
    const equationMatch = problemText.match(/[^.;,]*?[xy][^.;,]*?=[^.;,]*/g);
    if (equationMatch) {
      equationMatch.forEach(match => {
        let cleanFunction = match.trim();
        // If the equation is in the form x = ..., convert to y = ...
        if (cleanFunction.startsWith('x =')) {
          // We can't directly graph this, so we'll skip it
          return;
        }
        
        // If the equation doesn't have y =, but has y in it, try to rearrange
        if (!cleanFunction.includes('y =') && cleanFunction.includes('y')) {
          // This is complex to do properly, so we'll skip for now
          return;
        }
        
        // Only add if it looks like a graphable function and not already in the list
        if (cleanFunction.includes('y =') && !functions.includes(cleanFunction)) {
          functions.push(cleanFunction);
        }
      });
    }
  }
  
  return functions;
}

export default function AlgebraPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [subcategory, setSubcategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [problem, setProblem] = useState("");
  const [problemContext, setProblemContext] = useState("");
  const [problemQuestion, setProblemQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [showingSolution, setShowingSolution] = useState(false);
  const [solution, setSolution] = useState<string[]>([]);
  const [graphFunctions, setGraphFunctions] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState("problem");

  const handleGenerateProblem = async () => {
    if (!subcategory || !difficulty) return;
    
    setLoading(true);
    // Reset states to give immediate feedback
    setSteps([]);
    setCurrentStepIndex(0);
    setProblem("");
    setProblemContext("");
    setProblemQuestion("");
    setHintCount(0);
    setShowingSolution(false);
    setSolution([]);
    setChatMessages([]);
    setActiveTab("problem");
    setGraphFunctions([]);
    
    // Setup timeout
    const timeoutMs = 15000; // 15 seconds
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
    });
    
    try {
      // Race between the request and the timeout
      const newProblem = await Promise.race<string>([
        generateMathProblem(
          "algebra",
          subcategory,
          difficulty as "easy" | "medium" | "hard"
        ),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutId!);
      
      setProblem(newProblem);
      
      // Parse problem into context and question more effectively
      // Look for question patterns or explicit "Question:" markers
      const questionPatterns = [
        /Question\s*:\s*(.*?)(?:\?|$)/i,
        /What\s+is\s+[^?]+\?/i,
        /Find\s+[^?]+\?/i,
        /Calculate\s+[^?]+\?/i,
        /Determine\s+[^?]+\?/i,
        /Compute\s+[^?]+\?/i,
        /Express\s+[^?]+\?/i,
        /Solve\s+[^?]+\?/i,
      ];
      
      let foundQuestion = "";
      let foundContext = newProblem;
      
      // Try to find a question using different patterns
      for (const pattern of questionPatterns) {
        const match = newProblem.match(pattern);
        if (match) {
          foundQuestion = match[0];
          // Remove the question from the context
          foundContext = newProblem.replace(foundQuestion, "").trim();
          break;
        }
      }
      
      // If no specific question pattern was found, use basic splitting
      if (!foundQuestion) {
        const parts = newProblem.split(/[.?!]\s+/);
        if (parts.length > 1) {
          // Assume the last sentence is the question
          foundQuestion = parts.pop() || "";
          foundContext = parts.join(". ") + ".";
        }
      }
      
      setProblemContext(foundContext);
      setProblemQuestion(foundQuestion);
      
      // Initialize steps based on problem type
      const initialSteps = subcategory === "linear-equations" || subcategory === "quadratic-equations" ? [
        { instruction: "Set up the equation", input: "", isCorrect: null },
        { instruction: "Solve for the variable", input: "", isCorrect: null }
      ] : subcategory === "functions" ? [
        { instruction: "Identify the function type", input: "", isCorrect: null },
        { instruction: "Find the requested value", input: "", isCorrect: null }
      ] : [
        { instruction: "Write your solution", input: "", isCorrect: null }
      ];
      
      setSteps(initialSteps);
      
      // Parse possible graph functions for visualization
      if (["linear-equations", "quadratic-equations", "functions"].includes(subcategory)) {
        const functions = parseGraphFunctions(newProblem);
        if (functions.length > 0) {
          setGraphFunctions(functions);
        }
      }
    } catch (error: any) {
      console.error("Failed to generate problem:", error);
      if (error.message === 'Request timed out') {
        toast.error("Problem generation timed out. Please try again.");
      } else {
        toast.error("Failed to generate problem. Please try again.");
      }
    } finally {
      setSolutionLoading(false);
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
        toast.success(`Step ${index + 1} completed correctly!`);
        
        if (index === steps.length - 1) {
          // Problem completed
          const starsEarned = calculateStars();
          addStars(starsEarned);
          updateStreak();
          
          // Add completion message to chat
          setChatMessages(prev => [
            ...prev,
            {
              content: `Problem completed! You earned ${starsEarned} stars.`,
              role: "assistant",
              timestamp: new Date()
            }
          ]);
          
          toast.success(
            <div className="flex flex-col">
              <span className="font-bold text-lg">Congratulations!</span>
              <span>You earned {starsEarned} stars!</span>
            </div>,
            {
              duration: 5000,
              icon: <Award className="h-5 w-5 text-yellow-500" />
            }
          );
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
      setSolutionLoading(false);
    }
  };

  const calculateStars = () => {
    const baseStars = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
    const hintPenalty = Math.min(hintCount, baseStars - 1);
    return Math.max(1, baseStars - hintPenalty);
  };

  const handleHint = async () => {
    setHintLoading(true);
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
      
      // Switch to the hints tab
      setActiveTab("hints");
      
      // Also show toast with formatted hint
      toast.info(
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MathFormatter content={hint} />
        </div>, 
        {
          duration: 10000,
          icon: <HelpCircle className="h-5 w-5" />
        }
      );
    } catch (error) {
      console.error("Failed to generate hint:", error);
      toast.error("Failed to generate hint. Please try again.");
    } finally {
      setSolutionLoading(false);
    }
  };

  const handleShowSolution = async () => {
    if (showingSolution) return;
    
    setSolutionLoading(true);
    try {
      const fullSolution = await generateFullSolution(problem);
      setSolution(fullSolution);
      setShowingSolution(true);
      
      // Update the solution display
      const content = `Solution: ${fullSolution.join('\n')}`;
      setChatMessages(prev => [
        ...prev,
        {
          content: "Full solution requested",
          role: "user",
          timestamp: new Date()
        },
        {
          content,
          role: "assistant",
          timestamp: new Date()
        }
      ]);
      
      // Switch to solution tab
      setActiveTab("solution");
      
      toast.info("Solution revealed. Note: No stars will be awarded.", {
        duration: 5000,
        icon: <Lightbulb className="h-5 w-5 text-yellow-500" />
      });
    } catch (error) {
      console.error("Failed to generate solution:", error);
      toast.error("Failed to generate solution. Please try again.");
    } finally {
      setSolutionLoading(false);
    }
  };

  const resetProblem = () => {
    setCurrentStep(1); // Reset to first step (topic selection)
    setSubcategory(""); // Reset topic selection
    setDifficulty(""); // Reset difficulty selection
    setProblem("");
    setProblemContext("");
    setProblemQuestion("");
    setSteps([]);
    setCurrentStepIndex(0);
    setHintCount(0);
    setShowingSolution(false);
    setSolution([]);
    setChatMessages([]);
    setGraphFunctions([]);
    setActiveTab("problem");
  };

  const progress = steps.length ? (currentStepIndex / steps.length) * 100 : 0;

  // Get difficulty badge color
  const getDifficultyColor = (difficultyId: string) => {
    const found = difficulties.find(d => d.id === difficultyId);
    return found ? found.color : "";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-10 px-4 mx-auto max-w-7xl h-[calc(100vh-4px)] flex flex-col">
        <div className="flex flex-col items-center justify-center mb-6">
          <h1 className="text-[3rem] font-bold tracking-tight text-center mt-[10rem]">Algebra Practice</h1>
          {problem && (
            <Button variant="outline" size="sm" onClick={resetProblem}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Problem
            </Button>
          )}
        </div>
        
        {!problem ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto">
            <Card className="w-full border shadow-md overflow-hidden">
              {/* Progress Bar */}
              <div className="p-6 pb-4">
                <motion.div 
                  className="w-full mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between mb-2 text-sm font-medium">
                    <span className={currentStep >= 1 ? 'text-primary font-semibold' : 'text-muted-foreground'}>Topic</span>
                    <span className={currentStep >= 2 ? 'text-primary font-semibold' : 'text-muted-foreground'}>Difficulty</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-primary h-2" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentStep / 2) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    ></motion.div>
                  </div>
                </motion.div>
              </div>
            
              {/* Steps Container with Fixed Height */}
              <div className="relative h-[700px] w-full">
              <AnimatePresence mode="wait">
                {/* Step 1: Topic Selection */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full absolute inset-0"
                  >
                    <div className="p-6 h-full flex flex-col">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-2xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Choose a Topic</CardTitle>
                        <CardDescription>Select an algebra topic to practice</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-4 h-full">
                          {subcategories.map((sub) => (
                            <motion.button 
                              key={sub.id} 
                              className={`p-4 rounded-md border transition-all h-[100px] flex flex-col justify-center items-center w-full ${subcategory === sub.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:bg-primary/5'}`}
                              onClick={() => setSubcategory(sub.id)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="text-lg font-medium">{sub.name}</div>
                            </motion.button>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full text-base font-medium"
                          onClick={() => setCurrentStep(2)}
                          disabled={!subcategory}
                        >
                          Continue
                        </Button>
                      </CardFooter>
                    </div>
                  </motion.div>
                )}
                
                {/* Step 2: Difficulty Selection */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full absolute inset-0"
                  >
                    <div className="p-6 h-full flex flex-col">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-2xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Choose Difficulty</CardTitle>
                        <CardDescription>Select the difficulty level for your problem</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 h-full">
                          {difficulties.map((diff) => (
                            <motion.button 
                              key={diff.id} 
                              className={`p-4 rounded-md border transition-all h-[100px] flex flex-col justify-center items-center w-full ${difficulty === diff.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:bg-primary/5'}`}
                              onClick={() => setDifficulty(diff.id)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="text-lg font-medium">{diff.name}</div>
                              <div className="mt-2">
                                <Badge className={diff.color}>
                                  {diff.id === "easy" ? "1 Star" : diff.id === "medium" ? "2 Stars" : "3 Stars"}
                                </Badge>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between gap-4">
                      <Button
                          variant="outline"
                          className="text-base font-medium"
                          onClick={() => {
                            setCurrentStep(1);
                          }}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />  
                          Back
                        </Button>
                        <Button
                          className="flex-1 text-base font-medium"
                          onClick={handleGenerateProblem}
                          disabled={!difficulty || loading}
                        >
                          {loading ? (
                            <span className="flex items-center">
                              <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              Generate Problem
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                          )}
                        </Button>
                      </CardFooter>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-16rem)]">
            <div className="lg:col-span-2 space-y-6">
              {subcategory && <ConceptExplanation category="algebra" subcategory={subcategory} />}
              
              <Card className="overflow-hidden border h-full flex flex-col">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl">Your Problem</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getDifficultyColor(difficulty)}>
                        {difficulties.find(d => d.id === difficulty)?.name || ""}
                      </Badge>
                      <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {subcategories.find(s => s.id === subcategory)?.name || ""}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-grow flex flex-col">
                  <div className="px-6 pt-2">
                    <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
                      <TabsTrigger 
                        value="problem" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-4 py-2"
                      >
                        Problem
                      </TabsTrigger>
                      <TabsTrigger 
                        value="hints"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-4 py-2"
                        disabled={chatMessages.length === 0}
                      >
                        Hints
                        {hintCount > 0 && (
                          <Badge className="ml-2 bg-blue-500">{hintCount}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="solution"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-4 py-2"
                        disabled={!showingSolution}
                      >
                        Solution
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="problem" className="m-0 py-4 px-6 flex-grow flex flex-col">
                    <div className="mb-6 flex-grow">
                      <div className="prose prose-slate dark:prose-invert max-w-none min-h-[300px]">
                        <FormattedProblem content={problem} />
                      </div>
                    </div>

                    {graphFunctions.length > 0 && (
                      <div className="mb-6 flex-grow">
                        <div className="mb-3 text-sm font-medium text-slate-500">Graph Visualization</div>
                        <GraphDisplay functions={graphFunctions} />
                      </div>
                    )}

                    <div className="mb-8 mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
                        <span className="text-sm text-muted-foreground">
                          Step {currentStepIndex + 1} of {steps.length}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {!showingSolution && steps.map((step, index) => (
                      <div
                        key={index}
                        className={`mb-6 rounded-lg p-4 ${index === currentStepIndex ? "border bg-card" : "opacity-60"}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`rounded-full w-7 h-7 flex items-center justify-center text-sm font-medium ${
                            step.isCorrect === true 
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                              : step.isCorrect === false
                                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                : "bg-primary/10 text-primary"
                          }`}>
                            {step.isCorrect === true 
                              ? <CheckCircle2 className="h-4 w-4" /> 
                              : step.isCorrect === false
                                ? <AlertCircle className="h-4 w-4" />
                                : index + 1}
                          </div>
                          <span className="font-medium">{step.instruction}</span>
                        </div>
                        <div className="flex gap-2 relative">
                          <div className="flex-1">
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
                          </div>
                          <Button
                            onClick={() => handleStepSubmit(index)}
                            disabled={index !== currentStepIndex || !step.input || loading}
                            className="min-w-20"
                            variant={index === currentStepIndex ? "default" : "outline"}
                          >
                            Check
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-4 mt-6">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1">
                              <Button
                                variant="outline"
                                onClick={handleHint}
                                disabled={loading || showingSolution}
                                className="w-full"
                              >
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Get Hint {hintCount > 0 && `(${hintCount})`}
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Using hints will reduce your stars earned</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-1">
                              <Button
                                variant="outline"
                                onClick={handleShowSolution}
                                disabled={loading || showingSolution}
                                className="w-full"
                              >
                                <Lightbulb className="mr-2 h-4 w-4" />
                                Show Solution
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Viewing the solution means no stars will be earned</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="hints" className="m-0">
                    <Chat 
                      messages={chatMessages}
                      title="Hints & Guidance"
                      className="border-0 shadow-none"
                    />
                  </TabsContent>
                  
                  <TabsContent value="solution" className="m-0 p-6">
                    {showingSolution && (
                      <div className="space-y-6">
                        <div className="prose prose-slate dark:prose-invert max-w-none min-h-[300px]">
                          <FormattedProblem content={problem} />
                        </div>
                        
                        {graphFunctions.length > 0 && (
                          <div className="mb-6 flex-grow">
                            <div className="mb-3 text-sm font-medium text-slate-500">Graph Visualization</div>
                            <GraphDisplay functions={graphFunctions} />
                          </div>
                        )}
                        
                        <div className="mt-6 border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4 text-primary">Solution Steps</h3>
                          <div className="space-y-6 pl-4">
                            {solution.map((step, index) => (
                              <div key={index} className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800">
                                <div className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                  Step {index + 1}
                                </div>
                                <div className="prose prose-slate dark:prose-invert max-w-none min-h-[300px]">
                                  <MathFormatter content={step} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
            
            {/* Sidebar Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Algebra Helper</CardTitle>
                  <CardDescription>Use these resources to help solve the problem</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info about topic */}
                  <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium mb-2">About {subcategories.find(s => s.id === subcategory)?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subcategory === "linear" && "Linear equations represent straight lines on a graph. They take the form y = mx + b, where m is the slope and b is the y-intercept."}
                      {subcategory === "quadratic" && "Quadratic equations have the form ax² + bx + c = 0. They can be solved using factoring, completing the square, or the quadratic formula."}
                      {subcategory === "systems" && "Systems of equations involve finding values that satisfy multiple equations simultaneously. Solutions are the points where the graphs intersect."}
                      {subcategory === "factoring" && "Factoring breaks down expressions into simpler components, helping solve equations and simplify complex expressions."}
                    </p>
                  </div>
                  
                  {/* Formulas */}
                  <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium mb-2">Useful Formulas</h3>
                    <div className="space-y-2">
                      {subcategory === "linear" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Slope-intercept form:</p>
                            <BlockMath>{"y = mx + b"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Point-slope form:</p>
                            <BlockMath>{"y - y_1 = m(x - x_1)"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "quadratic" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Quadratic formula:</p>
                            <BlockMath>{"x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Vertex form:</p>
                            <BlockMath>{"y = a(x - h)^2 + k"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "systems" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Substitution method:</p>
                            <p className="text-xs text-muted-foreground">Solve one equation for one variable, then substitute into the other equation.</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Elimination method:</p>
                            <p className="text-xs text-muted-foreground">Add or subtract equations to eliminate one variable, then solve for the remaining variable.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Tips */}
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 border border-blue-100 dark:border-blue-900">
                    <h3 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">Tips</h3>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-disc pl-4">
                      <li>Identify the type of equation you're working with</li>
                      <li>Choose the appropriate method for solving</li>
                      <li>Check your solution by substituting back into the original equation</li>
                      <li>When applicable, use the graph to verify your answer</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}