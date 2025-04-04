"use client";

import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { GeometryVisualizer, parseGeometryProblem } from './geometry-visualizer';

interface MathFormatterProps {
  content: string;
  isBlock?: boolean;
  hideSolution?: boolean;
}

/**
 * A comprehensive formatter that handles:
 * 1. LaTeX commands
 * 2. HTML tags (<br/>, etc)
 * 3. Word spacing
 * 4. Special characters
 */
export function MathFormatter({ content, isBlock = false, hideSolution = false }: MathFormatterProps) {
  if (!content) return null;
  
  // Process text first to handle common issues
  const processedText = preprocessText(content, hideSolution);
  
  // If the content looks like a formatted paragraph with HTML,
  // we need to split it and render each part separately
  if (processedText.includes('<html>')) {
    return <RenderHtmlWithMath content={processedText} />;
  }
  
  // For simple LaTeX expressions
  const MathComponent = isBlock ? BlockMath : InlineMath;
  try {
    return <MathComponent>{processedText}</MathComponent>;
  } catch (error) {
    console.error("Error rendering LaTeX:", error);
    return <pre className="font-mono text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-auto">{content}</pre>;
  }
}

/**
 * Special component to handle structured problem display
 */
export function StructuredProblem({ 
  content, 
  showSolution = false 
}: { 
  content: string, 
  showSolution?: boolean 
}) {
  // Parse the problem content into sections
  const { problemStatement, question, solution, answerSpace } = parseProblemContent(content);
  
  // Parse geometry data for visualization if this is a geometry problem
  const isGeometryProblem = content.toLowerCase().includes('triangle') || 
                           content.toLowerCase().includes('circle') || 
                           content.toLowerCase().includes('angle') || 
                           content.toLowerCase().includes('polygon') ||
                           content.toLowerCase().includes('quadrilateral');
  
  const { problemType, problemData } = isGeometryProblem ? 
    parseGeometryProblem(content) : 
    { problemType: 'line' as const, problemData: {} };
  
  return (
    <div className="space-y-4">
      {/* Problem Statement */}
      {problemStatement && (
        <div className="problem-statement">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-7 h-7 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">i</span>
            </div>
            <h3 className="text-md font-medium">Problem Statement</h3>
          </div>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MathFormatter content={problemStatement} />
          </div>
        </div>
      )}
      
      {/* Visualization for geometry problems */}
      {isGeometryProblem && (
        <div className="mt-6 mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Visualization</h3>
          <GeometryVisualizer 
            problemType={problemType} 
            problemData={problemData}
            height={240}
          />
        </div>
      )}
      
      {/* Question */}
      {question && (
        <div className="question mt-4">
          <div className="font-semibold mb-2">Question:</div>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MathFormatter content={question} />
          </div>
        </div>
      )}
      
      {/* Answer Space */}
      {answerSpace && (
        <div className="answer-space mt-4">
          <div className="font-medium text-gray-500 mb-1">Answer Space:</div>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MathFormatter content={answerSpace} />
          </div>
        </div>
      )}
      
      {/* Solution (conditionally shown) */}
      {showSolution && solution && (
        <div className="solution mt-4 border-t pt-4">
          <div className="font-semibold mb-2">Solution:</div>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <MathFormatter content={solution} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Parse problem content into distinct sections
 */
function parseProblemContent(content: string) {
  let problemStatement = '';
  let question = '';
  let solution = '';
  let answerSpace = '';
  
  // First, clean up the content
  const cleanContent = preprocessText(content);
  
  // Extract solution if it exists
  const solutionMatch = cleanContent.match(/Solution(\s*\(.*?\))?\s*:?([\s\S]*)(Answer:)/i);
  if (solutionMatch) {
    solution = solutionMatch[2].trim();
  } else {
    const altSolutionMatch = cleanContent.match(/Solution(\s*\(.*?\))?\s*:?([\s\S]*)$/i);
    if (altSolutionMatch) {
      solution = altSolutionMatch[2].trim();
    }
  }
  
  // Extract question - look for explicit question labels first
  const questionMatch = cleanContent.match(/Question\s*:?\s*(.*?)(?=(?:Answer|Solution|$))/i);
  if (questionMatch) {
    question = questionMatch[1].trim();
  } else {
    // Look for common question patterns
    const patterns = [
      /what\s+is\s+[^?]+\?/i,
      /find\s+[^?]+\?/i,
      /calculate\s+[^?]+\?/i,
      /determine\s+[^?]+\?/i,
      /compute\s+[^?]+\?/i,
      /express\s+[^?]+\?/i,
    ];
    
    for (const pattern of patterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        question = match[0].trim();
        break;
      }
    }
    
    // If still no question, check for text between HTML tags or after specific markers
    if (!question) {
      const htmlQuestionMatch = cleanContent.match(/<\/html>\s*(.*?)(?=<html>|$)/i);
      if (htmlQuestionMatch) {
        question = htmlQuestionMatch[1].trim();
      }
    }
    
    // Final fallback - look for any sentence ending with ?
    if (!question) {
      const fallbackMatch = cleanContent.match(/([^.!?]+\?)/);
      if (fallbackMatch) {
        question = fallbackMatch[1].trim();
      }
    }
  }
  
  // Clean up the question text - remove HTML tags and special markers
  question = question
    .replace(/<[^>]+>/g, '') // Remove any HTML tags
    .replace(/^\s*(?:<\/div>|<\/html>)\s*/, '') // Remove opening tags
    .replace(/\s*(?:<div>|<html>)\s*$/, '') // Remove closing tags
    .replace(/^\s*\*\*\s*/, '') // Remove opening **
    .replace(/\s*\*\*\s*$/, ''); // Remove closing **
  
  // Extract answer space
  const answerSpaceMatch = cleanContent.match(/Answer\s+Space\s*:?\s*(.*?)(?=(?:Solution|$))/i);
  if (answerSpaceMatch) {
    answerSpace = answerSpaceMatch[1].trim();
  }
  
  // Everything else is the problem statement
  problemStatement = cleanContent
    .replace(/Question\s*:?\s*.*/i, '')  // Remove question
    .replace(/Solution(\s*\(.*?\))?\s*:?[\s\S]*$/i, '')  // Remove solution
    .replace(/Answer\s+Space\s*:?\s*.*/i, '')  // Remove answer space
    .trim();
  
  if (question && problemStatement.includes(question)) {
    problemStatement = problemStatement.replace(question, '').trim();
  }
  
  return { problemStatement, question, solution, answerSpace };
}

/**
 * Special component to handle mixed HTML and math content
 */
function RenderHtmlWithMath({ content }: { content: string }) {
  // Split the content by special markers
  const parts = content.split(/((?:<html>|<\/html>|<math>|<\/math>))/g)
    .filter(part => part && part.length > 0);
  
  // Keep track of current mode
  let inHtmlMode = false;
  let inMathMode = false;
  
  return (
    <div className="math-formatter">
      {parts.map((part, index) => {
        // Handle mode switching
        if (part === '<html>') {
          inHtmlMode = true;
          return null;
        }
        if (part === '</html>') {
          inHtmlMode = false;
          return null;
        }
        if (part === '<math>') {
          inMathMode = true;
          return null;
        }
        if (part === '</math>') {
          inMathMode = false;
          return null;
        }
        
        // Render based on current mode
        if (inHtmlMode) {
          return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        }
        if (inMathMode) {
          try {
            return <InlineMath key={index}>{part}</InlineMath>;
          } catch {
            return <span key={index}>{part}</span>;
          }
        }
        
        // Default to trying math, with fallback to plain text
        try {
          return <InlineMath key={index}>{part}</InlineMath>;
        } catch {
          return <span key={index}>{part}</span>;
        }
      })}
    </div>
  );
}

/**
 * Simplified text preprocessing function that handles common issues
 */
function preprocessText(text: string, hideSolution = false): string {
  if (!text) return '';

  // Step 1: Remove solution section if needed
  let processedText = text;
  if (hideSolution) {
    const solutionMatch = processedText.match(/Solution(\s*\(.*?\))?\s*:?[\s\S]*$/i);
    if (solutionMatch) {
      processedText = processedText.replace(solutionMatch[0], '');
    }
  }

  // Step 2: Clean up HTML artifacts
  processedText = processedText
    // Fix HTML tags that shouldn't be displayed
    .replace(/<\s*\/?\s*div\s*>/g, '')
    .replace(/<\s*\/?\s*html\s*>/g, '')
    .replace(/<\s*\/?\s*p\s*>/g, '')
    .replace(/<\s*br\s*\/?\s*>/g, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
    
  // Step 3: Fix double backslashes in LaTeX commands that often appear in geometry problems
  processedText = processedText
    .replace(/\\\\angle/g, '\\angle')
    .replace(/\\\\triangle/g, '\\triangle')
    .replace(/\\\\begin/g, '\\begin')
    .replace(/\\\\end/g, '\\end')
    .replace(/\\\\frac/g, '\\frac');
  
  // Step 4: Fix common geometry notations
  processedText = processedText
    // Properly format angle notation
    .replace(/\\angle\s+([A-Z])([A-Z])([A-Z])/g, '\\angle $1$2$3')
    .replace(/\\\\angle\s+([A-Z])([A-Z])([A-Z])/g, '\\angle $1$2$3')
    // Fix degree notation
    .replace(/(\d+)\s*(?:°|degrees)/gi, '$1^{\\circ}')
    // Format coordinates correctly
    .replace(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g, '($1,$2)');
  
  // Step 5: Apply generic word spacing rules
  processedText = processedText
    // Basic spacing between words
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // lowercase followed by uppercase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')  // uppercase followed by uppercase+lowercase
    .replace(/(\.)([A-Z])/g, '$1 $2')  // period followed by uppercase
    .replace(/(\,)([A-Z])/g, '$1 $2')  // comma followed by uppercase
    .replace(/(\d+)([a-z][a-z])/g, '$1 $2')  // number followed by multiple lowercase letters
    
    // Fix spacing around punctuation
    .replace(/([a-z])(\-|\–|\—)([a-z])/g, '$1 $2 $3')  // Add spaces around hyphens
    .replace(/([a-z])(\:)([a-z])/g, '$1$2 $3')  // Add space after colon
    
    // Fix spacing for numbers and units
    .replace(/(\d+)([a-z])/g, '$1 $2')  // number followed by letter
    
    // Fix spacing around operators
    .replace(/([^\s])=/g, '$1 =')
    .replace(/=([^\s])/g, '= $1')
    .replace(/(\d)([+\-*/])/g, '$1 $2')
    .replace(/([+\-*/])(\d)/g, '$1 $2')
    
    // Section headings
    .replace(/([a-z])(Problem|Statement|Question|Solution|Answer)/g, '$1 $2')
    .replace(/(Problem|Statement|Question|Solution|Answer)([a-z])/g, '$1 $2')
    
    // Smarter word spacing patterns for camelCase and PascalCase
    .replace(/([a-z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([A-Z][a-z])/g, '$1 $2');

  // Step 6: Handle HTML tags and section headers more robustly
  processedText = processedText
    .replace(/<\s*\/?\s*div\s*>/g, '')
    .replace(/<\s*br\s*\/?\s*>/g, '<html><br /></html>')
    .replace(/Question\s*:/g, '<html><div class="font-medium text-primary my-3">Question:</div></html>')
    .replace(/Answer\s*:/g, '<html><div class="font-medium text-success my-3">Answer:</div></html>')
    .replace(/Solution\s*(\(.*?\))?\s*:/g, '<html><div class="font-medium text-info my-3">Solution:</div></html>')
    .replace(/\^\{2\}Question:/g, '<html><div class="font-medium text-primary my-3">Question:</div></html>')
    .replace(/\^\{2\}Answer:/g, '<html><div class="font-medium text-success my-3">Answer:</div></html>')
    .replace(/\^\{2\}Solution/g, '<html><div class="font-medium text-info my-3">Solution</div></html>');
    
  // Step 7: Clean up any malformed HTML tags in question text
  const htmlTagsRegex = /<\s*\/?(?!html|br|div)[^>]+>/g;
  processedText = processedText.replace(htmlTagsRegex, '');
  
  // Fix specific issues with question format
  processedText = processedText
    .replace(/<\s*\/div\s*>\s*<\s*\/html\s*>\s*\*\*\s*([^<]+)/g, ' $1')
    .replace(/<\s*\/?\s*p\s*>/g, '')
    .replace(/(<\s*\/?\s*html\s*>|<\s*\/?\s*div\s*>)\s*\*\*/g, '')
    .replace(/\*\*\s*([^*]+)\s*\*\*/g, '$1');
  
  // Clean up any double spaces
  return processedText.replace(/\s{2,}/g, ' ').trim();
}

/**
 * A new component that displays a structured problem with proper formatting
 */
export function FormattedProblem({ content }: { content: string }) {
  if (!content) return null;
  
  // Try to extract structured content
  const { problemStatement, question } = parseProblemContent(content);
  
  // If we have both parts, present a structured view
  if (problemStatement && question) {
    return <StructuredProblem content={content} />;
  }
  
  // Otherwise, try to intelligently format the content
  // Split into lines if needed
  if (content.includes('\n')) {
    return (
      <div className="space-y-4">
        {content.split('\n').map((line, i) => (
          <div key={i} className="prose prose-slate dark:prose-invert max-w-none">
            <MathFormatter content={line} />
          </div>
        ))}
      </div>
    );
  }
  
  // Apply extra preprocessing for pure text problems
  // Look for patterns like "Here's a..." that often start problem statements
  if (content.match(/^(here'?s\s+a|a\s+|in\s+a|find|calculate|determine)/i)) {
    // If we find these patterns, try to split intelligently
    const parts = content.split(/([.?!])\s+/);
    if (parts.length > 1) {
      // Recombine parts into sentences
      const sentences = [];
      for (let i = 0; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
          sentences.push(parts[i] + parts[i + 1]);
        } else {
          sentences.push(parts[i]);
        }
      }
      
      // Present as separate paragraphs
      return (
        <div className="space-y-4">
          {sentences.map((sentence, i) => (
            <div key={i} className="prose prose-slate dark:prose-invert max-w-none">
              <MathFormatter content={sentence} />
            </div>
          ))}
        </div>
      );
    }
  }
  
  // Default fallback
  return (
    <div className="space-y-4">
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <MathFormatter content={content} />
      </div>
    </div>
  );
} 