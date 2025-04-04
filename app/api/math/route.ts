import { NextRequest, NextResponse } from 'next/server';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

// We'll use a simplified version of the formatter for server-side processing
function formatMathText(text: string): string {
  if (!text) return '';

  // STEP 1: Apply basic text normalization
  let processedText = text
    // First, normalize common contractions and punctuation
    .replace(/([a-z])'s/g, '$1 \'s')
    .replace(/([a-z])([,.;:?!])/g, '$1 $2')
    
    // STEP 2: Generic spacing fixes for word boundaries
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space between lowercase and uppercase letters
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')  // Add space between consecutive capital letters
    .replace(/(\.)([A-Z])/g, '$1 $2')  // Add space after period followed by capital
    .replace(/(\,)([A-Z])/g, '$1 $2')  // Add space after comma followed by capital
    .replace(/(\d+)([a-z][a-z])/g, '$1 $2')  // Add space between number and multiple lowercase letters

    // STEP 3: Handle mathematical notation
    .replace(/(\d+)([a-zA-Z])/g, '$1 $2')  // Add space between number and variable
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')  // Add space between variable and number
    .replace(/angle\s?/g, '\\angle ')
    .replace(/triangle\s?/g, '\\triangle ')
    .replace(/\\cdot/g, ' \\cdot ')
    .replace(/\\cdot\s{2,}/g, '\\cdot ')
    .replace(/\s{2,}\\cdot/g, ' \\cdot')
    .replace(/(\d+)degrees/g, '$1^{\\circ}')
    .replace(/(\d+)°/g, '$1^{\\circ}')
    .replace(/(\d+)\s+degrees/g, '$1^{\\circ}')
    
    // STEP 4: Fix spaces around operators
    .replace(/([^\s])=/g, '$1 =')
    .replace(/=([^\s])/g, '= $1')
    .replace(/(\d)([+\-*/])/g, '$1 $2')
    .replace(/([+\-*/])(\d)/g, '$1 $2');
  
  // STEP 5: Simplified word boundary detection for common terms
  // This is a more performance-optimized version with fewer terms
  const mathTerms = [
    'Problem', 'Statement', 'Question', 'Solution', 'Answer', 'Rectangle', 'Triangle', 'Circle', 
    'Square', 'Percent', 'Percentage', 'Equation', 'Expression', 'Variable', 'Angle', 'Geometry', 
    'Algebra', 'Calculate', 'Find', 'Determine', 'Solve', 'Length', 'Width', 'Height', 'Area',
    'Perimeter', 'Degrees', 'Feet', 'Inches', 'Point', 'Line', 'Function', 'Here', 'What', 
    'The', 'For', 'All', 'Books', 'Are', 'Is', 'Having', 'Sale', 'Local', 'Store', 'Book', 
    'Price', 'Garden', 'Path', 'Around', 'Express', 'Your', 'Answer', 'School', 'Middle'
  ];
  
  // Generate variations with limited case variations to improve performance
  const allTerms = [
    ...mathTerms,
    ...mathTerms.map(term => term.toLowerCase()),
  ];
  
  // Create a regex pattern that looks for these terms
  // This is more performance-optimized now
  const termPattern = new RegExp(`(${allTerms.join('|')})`, 'g');
  
  // Temporary replace with markers to preserve these terms
  processedText = processedText.replace(termPattern, ' $1 ');
  
  // Perform final cleanup with simpler operations
  processedText = processedText
    // Fix for section headers
    .replace(/([a-z])(Problem|Statement|Question|Solution|Answer)/g, '$1 $2')
    .replace(/(Problem|Statement|Question|Solution|Answer)([a-z])/g, '$1 $2')
    
    // Fix coordinates and geometric notation
    .replace(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g, '($1, $2)')
    .replace(/([A-Z])([A-Z])([A-Z])/g, '$1$2$3') // Keep adjacent capital letters as is for shape vertices
    
    // Clean up any double spaces and normalize whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  return processedText;
}

// This API route will be called from the client-side but keep the API key secure
export async function POST(request: NextRequest) {
  try {
    const { type, params } = await request.json();
    
    // Configure the model
    const model = openrouter('google/gemma-3-12b-it:free');
    
    // Set up the appropriate prompt and system message based on request type
    let prompt: string;
    let systemMessage: string;
    let textProcessor: (text: string) => any;
    
    switch (type) {
      case 'generateProblem':
        const { category, subcategory, difficulty } = params;
        
        // Validate the category
        const validCategories = ['algebra', 'calculus', 'geometry', 'statistics', 'middle-school'];
        if (!validCategories.includes(category)) {
          return NextResponse.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, { status: 400 });
        }

        // Special handling for geometry problems
        let geometrySpecificPrompt = '';
        if (category === 'geometry') {
          geometrySpecificPrompt = `
          For geometry problems specifically:
          - Label shapes with capital letters (A, B, C)
          - Use \\angle notation for angles
          - Use \\triangle notation for triangles
          - Use ^{\\circ} notation for degrees
          `;
        }

        prompt = `Generate a ${difficulty} ${subcategory} problem in the category of ${category}.
                 The problem should be clear, concise, and appropriate for the difficulty level.
                 Keep the response brief and direct.
                 
                 VERY IMPORTANT: Ensure there is proper spacing between words. Do not join words together.
                 For example, write "percentage problem" not "percentageproblem" and "middle school" not "middleschool".
                 
                 Structure your response with:
                 1. Problem Statement: A clearly stated problem with all necessary information
                 2. Question: What specifically is being asked
                 
                 For all math problems:
                 - Use proper LaTeX notation for mathematical expressions
                 - Use ^ for exponents, e.g., x^2 not x**2 or x^{2} for better formatting
                 - Use \\frac{a}{b} for fractions
                 - Use \\sqrt{x} for square roots
                 
                 ${geometrySpecificPrompt}
                 
                 Do not provide the solution in your response.`;
                 
        systemMessage = 'You are a mathematics teacher who creates clear, direct math problems with proper spacing between words.';
        textProcessor = (text) => formatMathText(text);
        break;
      case 'generateHint':
        const { problem, currentStep, hintLevel } = params;
        prompt = `For the math problem: "${problem}"
                 Current step: "${currentStep}"
                 Provide a level ${hintLevel} hint that guides without revealing the complete solution.
                 Use proper LaTeX notation for mathematical expressions.
                 Don't use escaped characters like \\t, \\r, etc. unless they're part of a LaTeX command.
                 Format your response with proper spacing between words.`;
        systemMessage = 'You are a helpful math tutor who provides progressive hints with clear formatting.';
        textProcessor = (text) => text.trim();
        break;
      case 'validateStep':
        const { problem: validateProblem, step, userAnswer } = params;
        prompt = `For the math problem: "${validateProblem}"
                 Step: "${step}"
                 User's answer: "${userAnswer}"
                 Is this answer correct? Respond with only "true" or "false".`;
        systemMessage = 'You are a mathematics validation system. Respond only with "true" or "false".';
        textProcessor = (text) => text.toLowerCase().includes('true');
        break;
      case 'generateFullSolution':
        const { problem: solutionProblem } = params;
        prompt = `For the math problem: "${solutionProblem}"
                 Provide a detailed, step-by-step solution. Format each step as a separate line.
                 Use proper LaTeX notation for all mathematical expressions.
                 For geometry problems with angles, use \\angle notation.
                 For triangle problems, use \\triangle notation.
                 For degree symbols, use ^{\\circ} notation.
                 Number each step with "Step 1:", "Step 2:", etc.
                 Ensure all steps have clear explanations.
                 Format with proper spacing between words.`;
        systemMessage = 'You are a mathematics teacher providing detailed step-by-step solutions with proper formatting.';
        textProcessor = (text) => {
          const steps = text.split('\n')
            .map(step => step.trim())
            .filter(step => step.length > 0);
          return steps;
        };
        break;
      default:
        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }
    
    // Generate text using the OpenRouter with a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 second timeout
    });
    
    try {
      // Race between the AI request and the timeout
      const result = await Promise.race([
        (async () => {
          const { text } = await generateText({
            model: model,
            prompt: prompt,
            system: systemMessage,
            // Add parameters to make response faster
            temperature: 0.7,
            maxTokens: 500,
          });
          
          // Process the response based on the request type
          return textProcessor(text);
        })(),
        timeoutPromise
      ]);
      
      return NextResponse.json({ result });
    } catch (error: any) {
      if (error.message === 'Request timed out') {
        console.error('Request timed out');
        return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 408 });
      }
      throw error; // Re-throw for the outer catch
    }
  } catch (error) {
    console.error('Error in math API route:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 