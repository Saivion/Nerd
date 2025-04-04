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
import { AlertCircle, CheckCircle2, HelpCircle, Lightbulb, Award, Sparkles, ArrowRight, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MathInput } from "@/components/math-input";
import { Chat } from "@/components/ui/chat";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FormattedProblem, MathFormatter } from "@/components/math-formatter";

// Define topic interface
interface Topic {
  id: string;
  name: string;
}

// Define grade topics interface
interface GradeTopics {
  [grade: string]: Topic[];
}

// Organize topics by grade level
const gradeTopics: GradeTopics = {
  "6th": [
    { id: "ratios", name: "Ratios & Proportions" },
    { id: "fractions", name: "Fractions & Decimals" },
    { id: "basic-geometry", name: "Basic Geometry" },
    { id: "integers", name: "Integers & Operations" },
  ],
  "7th": [
    { id: "percentages", name: "Percentages" },
    { id: "expressions", name: "Expressions & Equations" },
    { id: "area-volume", name: "Area & Volume" },
    { id: "probability", name: "Basic Probability" },
  ],
  "8th": [
    { id: "linear-equations", name: "Linear Equations" },
    { id: "functions", name: "Functions" },
    { id: "pythagorean", name: "Pythagorean Theorem" },
    { id: "statistics", name: "Statistics & Data" },
  ]
};

// Flattened list of all topics for backward compatibility
const subcategories = Object.values(gradeTopics).flat();

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

export default function MiddleSchoolPage() {
  // Setup step states
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Grade, 2: Topic, 3: Difficulty
  const [grade, setGrade] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [problem, setProblem] = useState("");
  const [problemContext, setProblemContext] = useState("");
  const [problemQuestion, setProblemQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [showingSolution, setShowingSolution] = useState(false);
  const [solution, setSolution] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState("problem");
  const [hintLoading, setHintLoading] = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);

  const handleGenerateProblem = async () => {
    if (!subcategory || !difficulty) return;
    
    // Reset states to ensure a clean start
    setLoading(true);
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
    
    try {
      // Add a timeout to prevent infinite loading
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 15000);
      });
      
      const newProblem = await Promise.race([
        generateMathProblem(
          "middle-school",
          subcategory,
          difficulty as "easy" | "medium" | "hard"
        ),
        timeoutPromise
      ]);
      
      if (!newProblem || newProblem.trim() === "") {
        throw new Error("Generated problem is empty");
      }
      
      setProblem(newProblem);
      
      // Parse problem into context and question if possible
      const parts = newProblem.split("?");
      if (parts.length > 1) {
        setProblemContext(parts[0] + "?");
        setProblemQuestion(parts.slice(1).join("?"));
      } else {
        setProblemContext(newProblem);
        setProblemQuestion("");
      }
      
      // Initialize steps based on problem type with more robust handling
      let initialSteps: Step[] = [];
      
      if (subcategory === "fractions") {
        initialSteps = [
          { instruction: "Convert to common denominator if needed", input: "", isCorrect: null },
          { instruction: "Perform the operation", input: "", isCorrect: null },
          { instruction: "Simplify the result", input: "", isCorrect: null }
        ];
      } else if (subcategory === "percentages") {
        initialSteps = [
          { instruction: "Convert percentage to decimal", input: "", isCorrect: null },
          { instruction: "Set up the equation", input: "", isCorrect: null },
          { instruction: "Solve for the answer", input: "", isCorrect: null }
        ];
      } else if (subcategory === "ratios") {
        initialSteps = [
          { instruction: "Identify the ratio relationship", input: "", isCorrect: null },
          { instruction: "Set up the proportion", input: "", isCorrect: null },
          { instruction: "Solve for the unknown value", input: "", isCorrect: null }
        ];
      } else {
        // Default fallback steps
        initialSteps = [
          { instruction: "Write your solution", input: "", isCorrect: null }
        ];
      }
      
      // Ensure we have at least one step
      if (initialSteps.length === 0) {
        initialSteps = [{ instruction: "Write your solution", input: "", isCorrect: null }];
      }
      
      setSteps(initialSteps);
      setCurrentStepIndex(0);
      
    } catch (error: any) {
      console.error("Failed to generate problem:", error);
      
      if (error.message === "Request timed out") {
        toast.error("Problem generation timed out. Please try again.");
      } else {
        toast.error("Failed to generate problem. Please try again.");
      }
      
      resetProblem(); // Reset to clean state on error
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
      setLoading(false);
      setHintLoading(false);
    }
  };

  const handleShowSolution = async () => {
    if (showingSolution) return;
    
    setLoading(true);
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
      setLoading(false);
      setSolutionLoading(false);
    }
  };

  const resetProblem = () => {
    setLoading(false); // Explicitly reset the loading state
    setHintLoading(false); // Reset hint loading state
    setSolutionLoading(false); // Reset solution loading state
    setCurrentStep(1); // Reset to first step (grade selection)
    setGrade(""); // Reset grade selection
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
          <h1 className="text-[3rem] font-bold tracking-tight text-center mt-[10rem]">Middle School Math Practice</h1>
          {problem && (
            <Button variant="outline" size="sm" onClick={resetProblem}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Problem
            </Button>
          )}
        </div>
        
        {!problem ? (
          <div className="flex flex-col items-center justify-center flex-1">
            {/* Progress Bar */}
            <motion.div 
              className="w-full max-w-4xl mx-auto mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between mb-2 text-sm">
                <span className={currentStep >= 1 ? 'font-medium' : 'text-muted-foreground'}>Grade</span>
                <span className={currentStep >= 2 ? 'font-medium' : 'text-muted-foreground'}>Topic</span>
                <span className={currentStep >= 3 ? 'font-medium' : 'text-muted-foreground'}>Difficulty</span>
              </div>
              <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-primary h-1" 
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / 3) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                ></motion.div>
              </div>
            </motion.div>
            
            {/* Steps Container with Fixed Height */}
            <div className="relative h-[700px] w-full max-w-4xl">
              <AnimatePresence mode="wait">
                {/* Step 1: Grade Selection */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full absolute inset-0"
                  >
                    <Card className="p-6 border h-full flex flex-col">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Choose your grade</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 h-full">
                          {Object.keys(gradeTopics).map((gradeLevel) => (
                            <motion.button 
                              key={gradeLevel} 
                              className={`p-4 rounded-md border transition-colors h-[100px] flex flex-col justify-center items-center w-full ${grade === gradeLevel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                              onClick={() => {
                                setGrade(gradeLevel);
                                setSubcategory(""); // Reset topic when grade changes
                              }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="text-lg font-medium">{gradeLevel} Grade</div>
                              <div className="text-sm text-muted-foreground mt-1">{gradeTopics[gradeLevel].length} topics</div>
                            </motion.button>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          onClick={() => setCurrentStep(2)}
                          disabled={!grade}
                        >
                          Continue
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                )}
                
                {/* Step 2: Topic Selection */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full absolute inset-0"
                  >
                    <Card className="p-6 border h-full flex flex-col">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Choose a topic</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-4 h-full">
                          {grade && gradeTopics[grade]?.map((topic) => (
                            <motion.button 
                              key={topic.id} 
                              className={`p-4 rounded-md border transition-colors h-[100px] flex flex-col justify-center items-center w-full ${subcategory === topic.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                              onClick={() => setSubcategory(topic.id)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="text-lg font-medium">{topic.name}</div>
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
                          className="flex-1"
                          onClick={() => setCurrentStep(3)}
                          disabled={!subcategory}
                        >
                          Continue
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                )}
                
                {/* Step 3: Difficulty Selection */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full absolute inset-0"
                  >
                    <Card className="p-6 border h-full flex flex-col">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Choose difficulty</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 h-full">
                          {difficulties.map((diff) => (
                            <motion.button 
                              key={diff.id} 
                              className={`p-4 rounded-md border transition-colors h-[100px] flex flex-col justify-center items-center w-full ${difficulty === diff.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
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
                            setCurrentStep(2);
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
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="overflow-hidden border">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl">Your Problem</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {grade} Grade
                      </Badge>
                      <Badge variant="outline" className={getDifficultyColor(difficulty)}>
                        {difficulties.find(d => d.id === difficulty)?.name || ""}
                      </Badge>
                      <Badge variant="outline" className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {gradeTopics[grade]?.find(s => s.id === subcategory)?.name || ""}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  
                  <TabsContent value="problem" className="m-0 py-4 px-6">
                    <div className="mb-6">
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        <FormattedProblem content={problem} />
                      </div>
                    </div>

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
                                disabled={loading || hintLoading || showingSolution}
                                className="w-full"
                              >
                                {hintLoading ? (
                                  <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                                    Loading hint...
                                  </>
                                ) : (
                                  <>
                                    <HelpCircle className="mr-2 h-4 w-4" />
                                    Get Hint {hintCount > 0 && `(${hintCount})`}
                                  </>
                                )}
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
                                disabled={loading || solutionLoading || showingSolution}
                                className="w-full"
                              >
                                {solutionLoading ? (
                                  <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                                    Loading solution...
                                  </>
                                ) : (
                                  <>
                                    <Lightbulb className="mr-2 h-4 w-4" />
                                    Show Solution
                                  </>
                                )}
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
                      onSendMessage={(message) => {
                        setChatMessages([...chatMessages, {
                          content: message,
                          role: "user",
                          timestamp: new Date()
                        }]);
                      }}
                      className="border-0 shadow-none"
                    />
                  </TabsContent>
                  
                  <TabsContent value="solution" className="m-0 p-6">
                    {showingSolution && (
                      <div className="space-y-6">
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                          <FormattedProblem content={problem} />
                        </div>
                        
                        <div className="mt-6 border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4 text-primary">Solution Steps</h3>
                          <div className="space-y-6 pl-4">
                            {solution.map((step, index) => (
                              <div key={index} className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800">
                                <div className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                  Step {index + 1}
                                </div>
                                <div className="prose prose-slate dark:prose-invert max-w-none">
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
                  <CardTitle className="text-lg">Math Helper</CardTitle>
                  <CardDescription>Use these resources to help solve the problem</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info about topic */}
                  <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium mb-2">About {subcategories.find(s => s.id === subcategory)?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subcategory === "ratios" && "Ratios compare quantities, while proportions are equations stating two ratios are equal. They're used to solve for unknown values."}
                      {subcategory === "percentages" && "Percentages express a value as a fraction of 100. They're used for discounts, interest rates, and statistical analysis."}
                      {subcategory === "integers" && "Integers include positive whole numbers, negative whole numbers, and zero. Operations include addition, subtraction, multiplication, and division."}
                      {subcategory === "expressions" && "Algebraic expressions use variables to represent values. Equations set expressions equal to find specific variable values."}
                      {subcategory === "basic-geometry" && "Basic geometry covers shape properties, area, perimeter, and volume calculations for common 2D and 3D figures."}
                      {subcategory === "fractions" && "Fractions represent parts of a whole. Operations include addition, subtraction, multiplication, and division with both fractions and decimals."}
                      {subcategory === "area-volume" && "Area measures the space inside a 2D shape, while volume measures the space inside a 3D shape. Each shape has specific formulas."}
                      {subcategory === "probability" && "Probability measures the likelihood of events occurring. It's expressed as a number between 0 (impossible) and 1 (certain)."}
                      {subcategory === "linear-equations" && "Linear equations represent straight lines and can be solved by isolating the variable. They're often written in the form y = mx + b."}
                      {subcategory === "functions" && "Functions relate inputs to outputs where each input has exactly one output. They can be represented with tables, graphs, and equations."}
                      {subcategory === "pythagorean" && "The Pythagorean Theorem states that in a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides."}
                      {subcategory === "statistics" && "Statistics involves collecting, analyzing, and interpreting data. Common measures include mean, median, mode, and range."}
                    </p>
                  </div>
                  
                  {/* Formulas */}
                  <div className="rounded-md bg-slate-50 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium mb-2">Useful Formulas</h3>
                    <div className="space-y-2">
                      {subcategory === "ratios" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Proportion equation:</p>
                            <BlockMath>{"\\frac{a}{b} = \\frac{c}{d}"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Cross multiplication:</p>
                            <BlockMath>{"a \\cdot d = b \\cdot c"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "percentages" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Percent formula:</p>
                            <BlockMath>{"\\text{part} = \\text{whole} \\times \\frac{\\text{percent}}{100}"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Percent increase/decrease:</p>
                            <BlockMath>{"\\text{new} = \\text{original} \\times (1 \\pm \\frac{\\text{percent}}{100})"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "basic-geometry" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Area formulas:</p>
                            <BlockMath>{"\\text{Rectangle: } A = l \\times w"}</BlockMath>
                            <BlockMath>{"\\text{Triangle: } A = \\frac{1}{2} \\times b \\times h"}</BlockMath>
                            <BlockMath>{"\\text{Circle: } A = \\pi r^2"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "fractions" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Addition/Subtraction:</p>
                            <BlockMath>{"\\frac{a}{c} \\pm \\frac{b}{c} = \\frac{a \\pm b}{c}"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Multiplication/Division:</p>
                            <BlockMath>{"\\frac{a}{b} \\times \\frac{c}{d} = \\frac{a \\times c}{b \\times d}"}</BlockMath>
                            <BlockMath>{"\\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\times \\frac{d}{c}"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "area-volume" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Volume formulas:</p>
                            <BlockMath>{"\\text{Rectangular Prism: } V = l \\times w \\times h"}</BlockMath>
                            <BlockMath>{"\\text{Cylinder: } V = \\pi r^2 h"}</BlockMath>
                            <BlockMath>{"\\text{Sphere: } V = \\frac{4}{3} \\pi r^3"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "probability" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Basic probability:</p>
                            <BlockMath>{"P(\\text{event}) = \\frac{\\text{favorable outcomes}}{\\text{total outcomes}}"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "linear-equations" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Slope-intercept form:</p>
                            <BlockMath>{"y = mx + b"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Slope formula:</p>
                            <BlockMath>{"m = \\frac{y_2 - y_1}{x_2 - x_1}"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "functions" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Function notation:</p>
                            <BlockMath>{"f(x) = \\text{expression}"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "pythagorean" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Pythagorean Theorem:</p>
                            <BlockMath>{"a^2 + b^2 = c^2"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Finding a leg:</p>
                            <BlockMath>{"a = \\sqrt{c^2 - b^2}"}</BlockMath>
                          </div>
                        </>
                      )}
                      {subcategory === "statistics" && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Mean (average):</p>
                            <BlockMath>{"\\bar{x} = \\frac{\\sum x}{n}"}</BlockMath>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Range:</p>
                            <BlockMath>{"\\text{Range} = \\text{maximum} - \\text{minimum}"}</BlockMath>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Tips */}
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 border border-blue-100 dark:border-blue-900">
                    <h3 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">Tips</h3>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-disc pl-4">
                      <li>Read the problem carefully and identify what's being asked</li>
                      <li>Write down what you know and what you need to find</li>
                      <li>Choose the appropriate formula or method</li>
                      <li>Show your work step-by-step</li>
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