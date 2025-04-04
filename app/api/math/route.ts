import { NextRequest, NextResponse } from 'next/server';

// Simple formatter for math text
function formatMathText(text: string): string {
  return text.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, params } = body;
    
    // OpenRouter API configuration
    // In Vercel, sometimes process.env needs to be accessed directly
    let OPENROUTER_API_KEY = "";
    
    // Try multiple methods to get the API key
    if (process.env.OPENROUTER_API_KEY) {
      OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    } else if (typeof process.env.OPENROUTER_API_KEY === 'string') {
      OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    } else {
      // Last resort hardcoded for testing - REMOVE IN PRODUCTION
      // OPENROUTER_API_KEY = "sk-or-v1-..."; // DO NOT COMMIT ACTUAL KEY
    }
    
    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    // Log API key length for debugging (don't log the actual key for security)
    console.log(`API key found with length: ${OPENROUTER_API_KEY.length}`);
    console.log(`API key starts with: ${OPENROUTER_API_KEY.substring(0, 5)}...`);
    
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
          return NextResponse.json({ error: `Invalid category` }, { status: 400 });
        }

        prompt = `Generate a ${difficulty} ${subcategory} problem in the category of ${category}.
                 The problem should be clear, concise, and appropriate for the difficulty level.
                 Keep the response brief and direct.`;
                 
        systemMessage = 'You are a mathematics teacher who creates clear, direct math problems.';
        textProcessor = (text) => formatMathText(text);
        break;
      case 'generateHint':
        const { problem, currentStep, hintLevel } = params;
        prompt = `For the math problem: "${problem}"
                 Current step: "${currentStep}"
                 Provide a level ${hintLevel} hint that guides without revealing the complete solution.`;
        systemMessage = 'You are a helpful math tutor who provides progressive hints.';
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
                 Provide a detailed, step-by-step solution.`;
        systemMessage = 'You are a mathematics teacher providing detailed step-by-step solutions.';
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
    
    try {
      // Call OpenRouter API directly instead of using the SDK
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://nerd-saivion-math.vercel.app/', // Your site URL for attribution
          'X-Title': 'Math Education Platform', // Optional: Your site name
          'OpenAI-Organization': 'org-dummy' // Required by OpenRouter
        },
        body: JSON.stringify({
          model: 'google/gemma-3-12b-it:free', 
          fallbacks: ['mistralai/mixtral-8x7b-instruct:free'], // Fallback to another free model if first choice unavailable
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP error: ${response.status} ${response.statusText}`;
        let errorDetails = null;
        
        try {
          errorDetails = await response.json();
          console.error('OpenRouter API error details:', errorDetails);
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          errorDetails = { message: 'Could not parse error response' };
        }
        
        return NextResponse.json(
          { 
            error: 'AI service error', 
            status: response.status,
            message: errorMessage,
            details: errorDetails 
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content || '';
      
      // Log success for debugging
      console.log('OpenRouter API success:', {
        model: data.model,
        usage: data.usage
      });
      
      // Process the response based on the request type
      const result = textProcessor(text);
      
      return NextResponse.json({ result });
    } catch (error: any) {
      console.error('OpenRouter API error:', error);
      return NextResponse.json(
        { error: 'AI service unavailable', details: error.message },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
} 