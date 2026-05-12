import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      financialContext: {
        netSalary: number;
        expenses: {
          groceries: number;
          accounts: number;
          loans: number;
          other: number;
        };
        totalExpenses: number;
        disposableIncome: number;
        carBudget: number;
        dtiRatio: number;
        creditScore: number | null;
        location: string;
      };
      preferredCar?: {
        make: string;
        model: string;
        year: number | null;
        price: number | null;
        fuelType: string | null;
        transmission: string | null;
        mileage: number | null;
        loanCost: number;
        insuranceCost: number;
        fuelCost: number;
        maintenanceCost: number;
        estimatedMonthlyCost: number;
      };
    };

    const { messages, financialContext: fc, preferredCar: pc } = body;

    const carSection = pc ? `
## Selected Car
The user has chosen the **${pc.year ?? ''} ${pc.make} ${pc.model}** as their preferred car.
- **Purchase price:** R ${(pc.price ?? 0).toLocaleString()}${pc.mileage ? ` | **Mileage:** ${pc.mileage.toLocaleString()} km` : ''}${pc.fuelType ? ` | **Fuel:** ${pc.fuelType}` : ''}${pc.transmission ? ` | **Transmission:** ${pc.transmission}` : ''}
- **Estimated monthly breakdown:**
  - Loan repayment: R ${pc.loanCost.toLocaleString()}
  - Insurance: R ${pc.insuranceCost.toLocaleString()}
  - Fuel: R ${pc.fuelCost.toLocaleString()}
  - Maintenance: R ${pc.maintenanceCost.toLocaleString()}
  - **Total monthly cost: R ${pc.estimatedMonthlyCost.toLocaleString()}**
- **Fits within budget:** ${pc.estimatedMonthlyCost <= fc.carBudget ? `Yes — R ${(fc.carBudget - pc.estimatedMonthlyCost).toLocaleString()} under budget` : `No — R ${(pc.estimatedMonthlyCost - fc.carBudget).toLocaleString()} over budget`}

## Your Role as Car Advisor
The user has selected this car. Your job is to help them plan for it practically. Ask focused follow-up questions one at a time to gather information needed for useful calculations. Good questions to explore:
1. How much deposit do they have saved? (affects loan amount and monthly repayment)
2. How many km do they drive per month? (refines fuel cost estimate)
3. Do they have a garage or park on the street? (affects insurance and security risk)
4. Will this be their only car or a second vehicle?
5. Are they financing through a dealer or their own bank?
After gathering answers, give specific calculations with rand amounts. Be conversational — ask one question at a time.` : '';

    const systemPrompt = `You are a friendly, practical South African personal finance advisor specialising in car affordability. You help users understand their finances and give specific, actionable advice.

## User's Current Financial Profile
- **Monthly net salary:** R ${fc.netSalary.toLocaleString()}
- **Monthly expenses:**
  - Groceries: R ${fc.expenses.groceries.toLocaleString()}
  - Accounts/subscriptions: R ${fc.expenses.accounts.toLocaleString()}
  - Existing loans: R ${fc.expenses.loans.toLocaleString()}
  - Other expenses: R ${fc.expenses.other.toLocaleString()}
  - **Total expenses: R ${fc.totalExpenses.toLocaleString()}**
- **Disposable income after expenses:** R ${fc.disposableIncome.toLocaleString()}
- **Monthly car budget (20% rule):** R ${fc.carBudget.toLocaleString()}
- **Debt-to-income ratio:** ${(fc.dtiRatio * 100).toFixed(1)}%${fc.creditScore ? `\n- **Credit score:** ${fc.creditScore}` : ''}
- **Province:** ${fc.location || 'Not specified'}
${carSection}
## Guidelines
- Be concise but warm. Use plain language, no jargon.
- Give specific rand amounts where possible.
- Reference the user's actual numbers when giving advice.
- For a South African context: mention realistic options like WiMi, Discovery Insure, FNB/Standard Bank vehicle finance, etc. where relevant.
- A DTI above 40% is high risk for lenders in SA. Ideal is below 30%.
- The 20% rule means monthly car costs (loan + insurance + fuel + maintenance) should not exceed 20% of net salary.
- If the user asks about reducing expenses, give 2–4 specific, practical suggestions based on their actual numbers.
- Keep responses to 3–6 short paragraphs maximum unless the user asks for more detail.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ reply: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI advisor unavailable.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
