import { GoogleGenAI, Type } from '@google/genai'
import { NextResponse } from 'next/server'

// The SDK requires the API key. We will instantiate it inside the POST handler
// to ensure process.env is fully loaded by Next.js at request time.

const schema = {
  type: Type.OBJECT,
  properties: {
    phases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          checkpoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING }
                    },
                    required: ["title"]
                  }
                }
              },
              required: ["title", "tasks"]
            }
          }
        },
        required: ["title", "checkpoints"]
      }
    }
  },
  required: ["phases"]
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert curriculum designer. Given the following request, generate a structured learning plan with phases, checkpoints, and tasks.\nRequest: ${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2
      }
    })

    if (!response.text) throw new Error("No text returned from Gemini")
    const parsedData = JSON.parse(response.text)
    
    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error("Gemini API Error:", error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
