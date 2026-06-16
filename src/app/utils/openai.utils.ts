import axios from 'axios';
import config from '../config';

export const generateRipplesWithAI = async (title: string, subject: string, dueDate: Date, count?: number) => {
  const apiKey = config.openai_api_key;
    const today = new Date().toISOString().split('T')[0]; 
 const prompt = `You are a professional study planner. 
  Today's Date: ${today}.
  Project Task: "${title}" for Subject: "${subject}". 
  Final Deadline: ${dueDate.toISOString().split('T')[0]}.
  
  Task:
  Break this task into ${count || 'a logical number of'} study sessions (Ripples).
  
  IMPORTANT Rules for "date":
  - All suggested dates MUST be between Today (${today}) and the Final Deadline.
  - Do NOT suggest any dates in the past.
  - If the deadline is today, all session dates must be today's date (${today}).
  - Distribute the sessions logically across the available days.

  Return ONLY a valid JSON object: {"ripples": [{"title": "...", "duration": 45, "date": "${today}"}]}`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: "gpt-4o-mini", 
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    },
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );

  return JSON.parse(response.data.choices[0].message.content).ripples;
};