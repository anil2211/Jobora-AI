import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function extractJob(text) {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `
You extract job information from webpages.

Return ONLY valid JSON.

Schema:
{
  "title": "",
  "company": "",
  "location": "",
  "salary": "",
  "employmentType": "",
  "experience": "",
  "skills": [],
  "description": "",
  "source": ""
}
        `,
      },
      {
        role: "user",
        content: text.substring(0, 12000),
      },
    ],
    temperature: 0.2,
    response_format: {
      type: "json_object",
    },
  });

  const content = response.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("Invalid JSON returned by Groq:", content);
    throw new Error("Failed to parse AI response.");
  }
}