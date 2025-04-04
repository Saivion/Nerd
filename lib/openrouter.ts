// Client-side functions to call our API endpoints
// This approach keeps the API key secure on the server

export async function generateMathProblem(
  category: string,
  subcategory: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<string> {
  try {
    const response = await fetch('/api/math', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'generateProblem',
        params: {
          category,
          subcategory,
          difficulty,
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Error: ${response.status}`);
    }

    return data.result;
  } catch (error) {
    console.error('Error generating math problem:', error);
    throw error;
  }
}

export async function generateHint(
  problem: string,
  currentStep: string,
  hintLevel: number
): Promise<string> {
  try {
    const response = await fetch('/api/math', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'generateHint',
        params: {
          problem,
          currentStep,
          hintLevel,
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Error: ${response.status}`);
    }

    return data.result;
  } catch (error) {
    console.error('Error generating hint:', error);
    throw error;
  }
}

export async function validateStep(
  problem: string,
  step: string,
  userAnswer: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/math', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'validateStep',
        params: {
          problem,
          step,
          userAnswer,
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Error: ${response.status}`);
    }

    return data.result;
  } catch (error) {
    console.error('Error validating step:', error);
    throw error;
  }
}

export async function generateFullSolution(problem: string): Promise<string[]> {
  try {
    const response = await fetch('/api/math', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'generateFullSolution',
        params: {
          problem,
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Error: ${response.status}`);
    }

    return data.result;
  } catch (error) {
    console.error('Error generating full solution:', error);
    throw error;
  }
}